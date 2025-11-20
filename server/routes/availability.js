const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../utils/authMiddleware');
const TherapistAvailability = require('../models/TherapistAvailability');
const { body, validationResult } = require('express-validator');

// Therapist: Get their availability schedule
router.get('/my-availability', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const availability = await TherapistAvailability.find({ therapist: req.user.id });
    res.json(availability);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist: Add availability slot (recurring or one-off)
router.post('/my-availability',
  auth(true),
  requireRole('therapist'),
  [
    body('dayOfWeek').optional().isInt({ min: 0, max: 6 }).withMessage('dayOfWeek must be 0-6'),
    body('startTime').trim().notEmpty().withMessage('startTime required'),
    body('endTime').trim().notEmpty().withMessage('endTime required'),
    body('isRecurring').optional().isBoolean()
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { dayOfWeek, startTime, endTime, isRecurring, specificDate } = req.body;
      const availability = new TherapistAvailability({
        therapist: req.user.id,
        dayOfWeek,
        startTime,
        endTime,
        isRecurring: isRecurring !== false,
        specificDate: specificDate ? new Date(specificDate) : null
      });
      await availability.save();
      res.json(availability);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Therapist: Update availability slot
router.patch('/my-availability/:id',
  auth(true),
  requireRole('therapist'),
  async (req, res) => {
    try {
      const slot = await TherapistAvailability.findById(req.params.id);
      if (!slot) return res.status(404).json({ message: 'Not found' });
      if (slot.therapist.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not your slot' });
      }
      const { dayOfWeek, startTime, endTime, isRecurring, isAvailable } = req.body;
      if (dayOfWeek !== undefined) slot.dayOfWeek = dayOfWeek;
      if (startTime) slot.startTime = startTime;
      if (endTime) slot.endTime = endTime;
      if (isRecurring !== undefined) slot.isRecurring = isRecurring;
      if (isAvailable !== undefined) slot.isAvailable = isAvailable;
      await slot.save();
      res.json(slot);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Therapist: Delete availability slot
router.delete('/my-availability/:id', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const slot = await TherapistAvailability.findById(req.params.id);
    if (!slot) return res.status(404).json({ message: 'Not found' });
    if (slot.therapist.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your slot' });
    }
    await TherapistAvailability.deleteOne({ _id: req.params.id });
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Admin: View all therapist availability
router.get('/admin/all-availability', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const availability = await TherapistAvailability.find().populate('therapist', 'name email');
    res.json(availability);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
