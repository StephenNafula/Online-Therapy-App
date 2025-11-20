const mongoose = require('mongoose');

const TherapistAvailabilitySchema = new mongoose.Schema({
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  dayOfWeek: { type: Number, min: 0, max: 6 }, // 0=Sun, 1=Mon, ..., 6=Sat
  startTime: String, // HH:MM format
  endTime: String,   // HH:MM format
  isRecurring: { type: Boolean, default: true },
  specificDate: Date, // for one-off availability
  isAvailable: { type: Boolean, default: true }
}, { timestamps: true });

module.exports = mongoose.model('TherapistAvailability', TherapistAvailabilitySchema);
