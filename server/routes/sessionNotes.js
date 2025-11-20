const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../utils/authMiddleware');
const SessionNote = require('../models/SessionNote');
const Booking = require('../models/Booking');
const { body, validationResult } = require('express-validator');

// Therapist: Create encrypted session note for a booking
router.post('/:bookingId',
  auth(true),
  requireRole('therapist'),
  [
    body('content').trim().notEmpty().withMessage('Content required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const booking = await Booking.findById(req.params.bookingId);
      if (!booking) return res.status(404).json({ message: 'Booking not found' });
      if (booking.therapist.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not your booking' });
      }

      const { content } = req.body;
      let note = await SessionNote.findOne({ booking: req.params.bookingId });
      if (!note) {
        note = new SessionNote({ booking: req.params.bookingId, therapist: req.user.id });
      }
      note.encryptNote(content);
      await note.save();
      res.json({ success: true, noteId: note._id });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Therapist: Get encrypted session note (returns decrypted)
router.get('/:bookingId', auth(true), requireRole('therapist'), async (req, res) => {
  try {
    const note = await SessionNote.findOne({ booking: req.params.bookingId });
    if (!note) return res.status(404).json({ message: 'No note found' });
    if (note.therapist.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not your note' });
    }
    const decrypted = note.decryptNote();
    res.json({ content: decrypted, createdAt: note.createdAt, updatedAt: note.updatedAt });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

// Therapist: Update session note
router.patch('/:bookingId',
  auth(true),
  requireRole('therapist'),
  [
    body('content').trim().notEmpty().withMessage('Content required')
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
    try {
      const note = await SessionNote.findOne({ booking: req.params.bookingId });
      if (!note) return res.status(404).json({ message: 'No note found' });
      if (note.therapist.toString() !== req.user.id) {
        return res.status(403).json({ message: 'Not your note' });
      }
      const { content } = req.body;
      note.encryptNote(content);
      await note.save();
      res.json({ success: true });
    } catch (err) {
      console.error(err);
      res.status(500).json({ message: 'Server error' });
    }
  }
);

// Admin: View decrypted notes (for oversight)
router.get('/admin/:bookingId', auth(true), requireRole('admin'), async (req, res) => {
  try {
    const note = await SessionNote.findOne({ booking: req.params.bookingId });
    if (!note) return res.status(404).json({ message: 'No note found' });
    const decrypted = note.decryptNote();
    res.json({ content: decrypted, therapist: note.therapist });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
