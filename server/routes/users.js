const express = require('express');
const router = express.Router();
const User = require('../models/User');
const Booking = require('../models/Booking');
const { auth, requireRole } = require('../utils/authMiddleware');

// return all therapists (or all users if query param)
router.get('/', async (req, res) => {
  try {
    const role = req.query.role;
    const query = role ? { role } : {};
    const users = await User.find(query).select('-passwordHash');
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist: view their client directory
router.get('/me/clients', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const bookings = await Booking.find({ therapist: req.user.id })
      .populate('client', 'name email')
      .sort({ createdAt: -1 });

    const map = new Map();
    bookings.forEach(booking => {
      if (booking.client) {
        map.set(String(booking.client._id), {
          id: booking.client._id,
          name: booking.client.name,
          email: booking.client.email,
          lastSession: booking.scheduledAt,
          status: booking.status
        });
      }
    });

    res.json(Array.from(map.values()));
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
