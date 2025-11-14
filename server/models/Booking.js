const mongoose = require('mongoose');

const BookingSchema = new mongoose.Schema({
  client: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  scheduledAt: { type: Date, required: true },
  durationMinutes: { type: Number, default: 50 },
  status: { type: String, enum: ['scheduled','verified','completed','cancelled'], default: 'scheduled' },
  externalPayment: {
    provider: String,
    reference: String,
    amount: Number,
    currency: String
  },
  roomId: String,
  notes: String
}, { timestamps: true });

module.exports = mongoose.model('Booking', BookingSchema);
