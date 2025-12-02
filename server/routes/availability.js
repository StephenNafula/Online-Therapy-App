const express = require('express');
const router = express.Router();
const { auth, requireRole } = require('../utils/authMiddleware');
const TherapistAvailability = require('../models/TherapistAvailability');
const { body, validationResult } = require('express-validator');
const { DateTime } = require('luxon');

// Public: Get available time slots for a therapist on a given date
router.get('/public/:therapistId', async (req, res) => {
  try {
    const { therapistId } = req.params;
    const dateStr = req.query.date; // expected YYYY-MM-DD
    const duration = parseInt(req.query.durationMinutes || req.query.duration || '60', 10);
    if (!dateStr) return res.status(400).json({ message: 'date query param required (YYYY-MM-DD)' });

    const requestedDate = new Date(dateStr + 'T00:00:00Z');
    if (isNaN(requestedDate.getTime())) return res.status(400).json({ message: 'invalid date' });

    // determine therapist timezone (assume availability times are stored in therapist-local time)
    const User = require('../models/User');
    const therapist = await User.findById(therapistId).lean();
    const tz = (therapist && therapist.timezone) ? therapist.timezone : 'UTC';

    // Compute dayOfWeek in therapist timezone (schema uses 0=Sun .. 6=Sat)
    const dtForDay = DateTime.fromISO(dateStr, { zone: tz });
    // luxon weekday: 1 = Monday .. 7 = Sunday. Map to 0=Sunday..6=Saturday
    const dayOfWeek = dtForDay.weekday % 7;

    // fetch recurring slots for that weekday and any specificDate matching that day
    const recurring = await TherapistAvailability.find({
      therapist: therapistId,
      dayOfWeek,
      isAvailable: true,
      $or: [
        { isRecurring: { $ne: false } },
        { isRecurring: false, $or: [{ specificDate: null }, { specificDate: { $exists: false } }] }
      ]
    });

    const dayStartUtc = new Date(`${dateStr}T00:00:00Z`);
    const dayEndUtc = new Date(`${dateStr}T23:59:59Z`);
    const specific = await TherapistAvailability.find({
      therapist: therapistId,
      isRecurring: false,
      specificDate: { $gte: dayStartUtc, $lte: dayEndUtc },
      isAvailable: true
    });

    // Debug logging to help diagnose missing slots
    try {
      console.log(`[availability] therapist=${therapistId} tz=${tz} date=${dateStr} dayOfWeek=${dayOfWeek} recurring=${recurring.length} specific=${specific.length}`);
    } catch (logErr) {
      // ignore
    }

    const slots = [];

    function generateRangeSlots(startTime, endTime, durationMinutes) {
      // Use luxon to create timezone-aware DateTime objects for the therapist
      const startISO = `${dateStr}T${startTime}:00`;
      const endISO = `${dateStr}T${endTime}:00`;
      let startDT = DateTime.fromISO(startISO, { zone: tz });
      let endDT = DateTime.fromISO(endISO, { zone: tz });
      // handle ranges that spill past midnight by adding a day to end if needed
      if (endDT <= startDT) endDT = endDT.plus({ days: 1 });

      let cursor = startDT;
      while (cursor.plus({ minutes: durationMinutes }) <= endDT) {
        const slotStart = cursor;
        const slotEnd = cursor.plus({ minutes: durationMinutes });
        slots.push({ start: slotStart.toISO(), end: slotEnd.toISO(), label: slotStart.toFormat('HH:mm') });
        cursor = cursor.plus({ minutes: durationMinutes });
      }
    }

    recurring.forEach(r => generateRangeSlots(r.startTime, r.endTime, duration));
    specific.forEach(s => generateRangeSlots(s.startTime, s.endTime, duration));

    try { console.log(`[availability] generated raw slots=${slots.length}`); } catch (e) {}

    // remove duplicates by label and sort by ISO start
    const uniqueMap = new Map();
    slots.forEach(s => {
      if (!uniqueMap.has(s.start)) uniqueMap.set(s.start, s);
    });
    let uniqueSlots = Array.from(uniqueMap.values()).sort((a,b) => a.start.localeCompare(b.start));

    // Exclude overlapping slots using booking ranges (range-overlap)
    try {
      const Booking = require('../models/Booking');
      // fetch bookings for that therapist within the date window (full day in therapist tz)
      const dayStart = DateTime.fromISO(`${dateStr}T00:00:00`, { zone: tz }).toJSDate();
      const dayEnd = DateTime.fromISO(`${dateStr}T23:59:59`, { zone: tz }).plus({ days: 1 }).toJSDate();
      const bookings = await Booking.find({ therapist: therapistId, scheduledAt: { $gte: new Date(dayStart.getTime() - 24*3600*1000), $lte: new Date(dayEnd.getTime() + 24*3600*1000) }, status: { $ne: 'cancelled' } }).lean();

      const filtered = uniqueSlots.filter(slot => {
        const slotStart = DateTime.fromISO(slot.start, { zone: tz });
        const slotEnd = DateTime.fromISO(slot.end, { zone: tz });
        for (const b of bookings) {
          try {
            const bStart = DateTime.fromJSDate(new Date(b.scheduledAt)).setZone(tz);
            const bDuration = (b.durationMinutes && Number(b.durationMinutes)) ? Number(b.durationMinutes) : 50;
            const bEnd = bStart.plus({ minutes: bDuration });
            // overlap if slotStart < bEnd && bStart < slotEnd
            if (slotStart < bEnd && bStart < slotEnd) return false; // exclude
          } catch (err) {
            // ignore and continue
          }
        }
        return true;
      });

      uniqueSlots = filtered;
    } catch (err) {
      console.error('Error excluding booked slots (range overlap)', err);
    }

    // Return slots in therapist timezone so client can display clearly
    // Each slot: { label: 'HH:mm', start: ISOstring, end: ISOstring }
    const responseSlots = uniqueSlots.map(s => ({ label: s.label, start: s.start, end: s.end }));
    res.json({ date: dateStr, timezone: tz || 'UTC', slots: responseSlots });
  } catch (err) {
    console.error('Public availability error', err);
    res.status(500).json({ message: 'Server error' });
  }
});

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

      let parsedSpecificDate = null;
      if (specificDate) {
        const isoSpecific = `${specificDate}T00:00:00.000Z`;
        const parsed = new Date(isoSpecific);
        if (isNaN(parsed.getTime())) {
          return res.status(400).json({ message: 'specificDate must be a valid date (YYYY-MM-DD)' });
        }
        parsedSpecificDate = parsed;
      }

      let recurringFlag = isRecurring !== false;
      if (!parsedSpecificDate && isRecurring === false) {
        // prevent invisible slots: treat missing specificDate as recurring
        recurringFlag = true;
      }
      if (parsedSpecificDate) {
        recurringFlag = false;
      }

      const availability = new TherapistAvailability({
        therapist: req.user.id,
        dayOfWeek,
        startTime,
        endTime,
        isRecurring: recurringFlag,
        specificDate: parsedSpecificDate
      });
      await availability.save();
      // notify via socket that this therapist updated availability
      try {
        const io = req.app && req.app.get && req.app.get('io');
        if (io && io.emit) io.emit('availability:updated', { therapistId: req.user.id, action: 'created', availabilityId: availability._id });
      } catch (emitErr) {
        console.error('Failed to emit availability:updated (create)', emitErr);
      }
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
      try {
        const io = req.app && req.app.get && req.app.get('io');
        if (io && io.emit) io.emit('availability:updated', { therapistId: req.user.id, action: 'updated', availabilityId: slot._id });
      } catch (emitErr) {
        console.error('Failed to emit availability:updated (update)', emitErr);
      }
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
    try {
      const io = req.app && req.app.get && req.app.get('io');
      if (io && io.emit) io.emit('availability:updated', { therapistId: req.user.id, action: 'deleted', availabilityId: req.params.id });
    } catch (emitErr) {
      console.error('Failed to emit availability:updated (delete)', emitErr);
    }
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
