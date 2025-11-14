const express = require('express');
const router = express.Router();
const Booking = require('../models/Booking');
const User = require('../models/User');
const bcrypt = require('bcrypt');
const { auth, requireRole } = require('../utils/authMiddleware');
const { body, validationResult } = require('express-validator');
// lightweight room id generator to avoid ESM-only nanoid in this environment
function makeRoomId(){
  return Date.now().toString(36) + Math.random().toString(36).slice(2,8)
}

// Create a booking (client)
router.post('/',
  auth(true),
  [ body('therapistId').isMongoId().withMessage('therapistId must be a valid id'), body('scheduledAt').isISO8601().withMessage('scheduledAt must be an ISO date') ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { therapistId, scheduledAt, durationMinutes, externalPayment } = req.body;
  const booking = new Booking({ client: req.user.id, therapist: therapistId, scheduledAt, durationMinutes, externalPayment, roomId: makeRoomId() });
      await booking.save();
        // emit booking created event for realtime notifications
        try {
          const io = req.app.get('io');
          if (io) {
            const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
            io.emit('booking:created', populated);
          }
        } catch (emitErr) {
          console.error('Failed to emit booking created', emitErr);
        }
      res.json(booking);
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Guest booking (no auth) - create or link a client user and create booking
router.post('/guest-booking',
  [
    body('client.fullName').notEmpty().withMessage('Full name is required'),
    body('client.email').isEmail().withMessage('Valid email is required'),
    body('client.phone').notEmpty().withMessage('Phone number is required'),
    body('session.preferredDate').notEmpty().withMessage('Preferred date is required'),
    body('session.preferredTime').notEmpty().withMessage('Preferred time is required'),
    body('session.therapyType').notEmpty().withMessage('Therapy type is required'),
    body('payment.amountPaid').isFloat({ gt: 0 }).withMessage('Amount must be a positive number'),
    body('payment.method').notEmpty().withMessage('Payment method is required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const { client: clientInfo, session, payment } = req.body;

      // Find or create client user by email
      let clientUser = await User.findOne({ email: clientInfo.email });
      if (!clientUser) {
        const randomPass = Math.random().toString(36).slice(2, 10);
        const hash = await bcrypt.hash(randomPass, 10);
        clientUser = new User({ name: clientInfo.fullName, email: clientInfo.email, passwordHash: hash, role: 'client' });
        await clientUser.save();
      }

      // Determine therapist: use provided therapistId or fallback to any therapist in DB
      let therapistId = req.body.therapistId;
      if (!therapistId) {
        const therapist = await User.findOne({ role: 'therapist' });
        if (!therapist) return res.status(400).json({ message: 'No therapists available' });
        therapistId = therapist._id;
      }

      // Build scheduledAt from preferredDate + preferredTime if provided separately
      let scheduledAt = null;
      if (session.preferredDate && session.preferredTime) {
        // combine into an ISO string (assume local date/time provided by client)
        scheduledAt = new Date(`${session.preferredDate}T${session.preferredTime}`);
      } else if (session.scheduledAt) {
        scheduledAt = new Date(session.scheduledAt);
      }
      if (!scheduledAt || isNaN(scheduledAt.getTime())) return res.status(400).json({ message: 'Invalid scheduled date/time' });

      const durationMinutes = session.sessionDuration || session.durationMinutes || 50;

      const booking = new Booking({
        client: clientUser._id,
        therapist: therapistId,
        scheduledAt,
        durationMinutes,
        externalPayment: {
          provider: payment.method,
          amount: payment.amountPaid,
          reference: payment.reference || ''
        },
        roomId: makeRoomId(),
        notes: session.note || ''
      });

      await booking.save();
      // emit booking created for realtime notifications
      try {
        const io = req.app.get('io');
        if (io) {
          const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
          io.emit('booking:created', populated);
        }
      } catch (emitErr) {
        console.error('Failed to emit guest booking created', emitErr);
      }
      res.json({ success: true, bookingId: booking._id, _id: booking._id });
    } catch (err) {
      console.error('Guest booking error:', err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// List bookings for the logged-in user
router.get('/', auth(true), async (req, res) => {
  try {
    const { role, id } = req.user;
    let query = {};
    if (role === 'therapist') query = { therapist: id };
    else if (role === 'admin') query = {}; // admin sees all bookings
    else query = { client: id };
    const bookings = await Booking.find(query).populate('client', 'name email').populate('therapist', 'name email bio specialties');
    res.json(bookings);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist can update status (admin control)
router.patch('/:id/status', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    booking.status = req.body.status || booking.status;
    await booking.save();
    // emit booking updated
    try {
      const io = req.app.get('io');
      if (io) {
        const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
        io.emit('booking:updated', populated);
      }
    } catch (emitErr) {
      console.error('Failed to emit booking updated', emitErr);
    }
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist can end a call for a booking (emit room end-call event)
router.patch('/:id/end', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    booking.status = 'completed';
    await booking.save();
    // emit to socket room to inform peers
    const io = req.app.get('io');
    if (io && booking.roomId) {
      io.to(booking.roomId).emit('signal', { data: { type: 'end-call' } });
    }
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist can mute/unmute clients in the booking's room
router.patch('/:id/mute', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const { muted } = req.body;
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    const io = req.app.get('io');
    if (io && booking.roomId) {
      io.to(booking.roomId).emit('signal', { data: { type: 'mute', muted: !!muted } });
    }
    res.json({ success: true, muted: !!muted });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify payment and attach transaction reference (therapist or admin)
router.post('/:id/verify-payment', auth(true), async (req, res) => {
  try {
    // allow therapist or admin
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (req.user.role !== 'therapist' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Insufficient role' });
    }

    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });

    const { provider, reference, amount, currency } = req.body || {};
    booking.externalPayment = booking.externalPayment || {};
    if (provider) booking.externalPayment.provider = provider;
    if (reference) booking.externalPayment.reference = reference;
    if (amount) booking.externalPayment.amount = amount;
    if (currency) booking.externalPayment.currency = currency;

    booking.status = 'verified';
    await booking.save();
    // emit booking updated
    try {
      const io = req.app.get('io');
      if (io) {
        const populated = await Booking.findById(booking._id).populate('client', 'name email').populate('therapist', 'name email');
        io.emit('booking:updated', populated);
      }
    } catch (emitErr) {
      console.error('Failed to emit booking updated after verify', emitErr);
    }
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist can add session notes
router.patch('/:id/notes', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: 'Not found' });
    const { notes } = req.body || {};
    booking.notes = typeof notes === 'string' ? notes : booking.notes;
    await booking.save();
    res.json(booking);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Reports: summary counts (weekly/monthly)
router.get('/reports/summary', auth(true), async (req, res) => {
  try {
    // only admin or therapist allowed to view reports
    if (!req.user) return res.status(401).json({ message: 'Not authenticated' });
    if (req.user.role !== 'admin' && req.user.role !== 'therapist') {
      return res.status(403).json({ message: 'Insufficient role' });
    }

    const range = req.query.range || 'monthly'; // 'weekly' or 'monthly'
    const now = new Date();
    let start;
    if (range === 'weekly') {
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
    } else {
      start = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    }

    const match = { createdAt: { $gte: start } };
    const total = await Booking.countDocuments(match);
    const verified = await Booking.countDocuments({ ...match, status: 'verified' });
    const scheduled = await Booking.countDocuments({ ...match, status: 'scheduled' });
    const completed = await Booking.countDocuments({ ...match, status: 'completed' });
    const cancelled = await Booking.countDocuments({ ...match, status: 'cancelled' });

    res.json({ success: true, range, total, verified, scheduled, completed, cancelled });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
