const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../utils/authMiddleware');
const User = require('../models/User');
const Booking = require('../models/Booking');
const AuditLog = require('../models/AuditLog');
const { body, validationResult } = require('express-validator');
const crypto = require('crypto');
const PlatformSetting = require('../models/PlatformSetting');

// Helper to log audit event
async function logAudit(actor, action, resourceType, resourceId, details = {}, req) {
  try {
    await AuditLog.create({
      actor,
      action,
      resourceType,
      resourceId,
      details,
      ipAddress: req.ip,
      userAgent: req.get('user-agent')
    });
  } catch (err) {
    console.error('Audit log failed', err);
  }
}

async function getSettingsDoc() {
  let settings = await PlatformSetting.findOne({ key: 'global' });
  if (!settings) {
    settings = await PlatformSetting.create({ key: 'global' });
  }
  return settings;
}

// Admin: Get all therapists
router.get('/therapists', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const therapists = await User.find({ role: 'therapist' }).select('-passwordHash');
    res.json(therapists);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Create/Add therapist
router.post('/therapists',
  auth(true),
  requireRole('admin'),
  [
    body('name').trim().notEmpty().withMessage('Name required'),
    body('email').isEmail().withMessage('Valid email required'),
    body('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    body('bio').optional().trim(),
    body('specialties').optional().isArray()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { name, email, password, bio, specialties } = req.body;
      const existing = await User.findOne({ email });
      if (existing) return res.status(400).json({ message: 'Email already exists' });

      const bcrypt = require('bcrypt');
      const hash = await bcrypt.hash(password, 10);
      const therapist = new User({
        name,
        email,
        passwordHash: hash,
        role: 'therapist',
        bio,
        specialties: specialties || []
      });
      await therapist.save();
      await logAudit(req.user.id, 'create_therapist', 'User', therapist._id, { email, name }, req);

      res.json({ success: true, therapist: { id: therapist._id, name, email, bio, specialties } });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: Edit therapist
router.patch('/therapists/:id',
  auth(true),
  requireRole('admin'),
  async (req, res) => {
    try {
      const therapist = await User.findById(req.params.id);
      if (!therapist || therapist.role !== 'therapist') {
        return res.status(404).json({ message: 'Therapist not found' });
      }
      const { name, bio, specialties, isActive } = req.body;
      if (name) therapist.name = name;
      if (bio) therapist.bio = bio;
      if (specialties) therapist.specialties = specialties;
      await therapist.save();
      await logAudit(req.user.id, 'edit_therapist', 'User', therapist._id, { name, bio, specialties }, req);

      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: Remove/deactivate therapist
router.delete('/therapists/:id', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const therapist = await User.findById(req.params.id);
    if (!therapist) return res.status(404).json({ message: 'Not found' });
    await User.deleteOne({ _id: req.params.id });
    await logAudit(req.user.id, 'delete_therapist', 'User', req.params.id, { email: therapist.email }, req);

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get all bookings (master calendar)
router.get('/bookings', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const { therapistId, status, startDate, endDate } = req.query;
    let query = {};
    if (therapistId) query.therapist = therapistId;
    if (status) query.status = status;
    if (startDate || endDate) {
      query.scheduledAt = {};
      if (startDate) query.scheduledAt.$gte = new Date(startDate);
      if (endDate) query.scheduledAt.$lte = new Date(endDate);
    }
    const bookings = await Booking.find(query)
      .populate('client', 'name email')
      .populate('therapist', 'name email')
      .sort({ scheduledAt: -1 });
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: View analytics/reports
router.get('/analytics/summary', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const total = await Booking.countDocuments();
    const completed = await Booking.countDocuments({ status: 'completed' });
    const scheduled = await Booking.countDocuments({ status: 'scheduled' });
    const therapists = await User.countDocuments({ role: 'therapist' });
    const clients = await User.countDocuments({ role: 'client' });

    // Revenue calc (from verified payments)
    const revenue = await Booking.aggregate([
      { $match: { status: 'verified' } },
      { $group: { _id: null, total: { $sum: '$externalPayment.amount' } } }
    ]);

    res.json({
      totalBookings: total,
      completedBookings: completed,
      scheduledBookings: scheduled,
      totalTherapists: therapists,
      totalClients: clients,
      revenue: revenue[0]?.total || 0
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get audit logs
router.get('/audit-logs', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const { limit = 100, skip = 0 } = req.query;
    const logs = await AuditLog.find()
      .populate('actor', 'name email')
      .sort({ createdAt: -1 })
      .limit(parseInt(limit))
      .skip(parseInt(skip));
    const total = await AuditLog.countDocuments();
    res.json({ logs, total });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Get platform settings
router.get('/settings', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const settings = await getSettingsDoc();
    res.json(settings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: Update platform settings (payment instructions, call configuration)
router.post('/settings',
  auth(true),
  requireRole('admin'),
  [
    body('manualPaymentInstructions').optional().isString(),
    body('audioCall').optional().isObject()
  ],
  async (req, res) => {
    try {
      const settings = await getSettingsDoc();
      if (typeof req.body.manualPaymentInstructions === 'string') {
        settings.manualPaymentInstructions = req.body.manualPaymentInstructions;
      }
      if (req.body.audioCall) {
        settings.audioCall = {
          enabled: req.body.audioCall.enabled ?? settings.audioCall.enabled,
          requireSecureLink: req.body.audioCall.requireSecureLink ?? settings.audioCall.requireSecureLink,
          reminderMinutes: req.body.audioCall.reminderMinutes ?? settings.audioCall.reminderMinutes
        };
      }
      settings.updatedBy = req.user.id;
      await settings.save();
      await logAudit(req.user.id, 'update_platform_settings', 'PlatformSetting', settings._id, req.body, req);
      res.json(settings);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

module.exports = router;
