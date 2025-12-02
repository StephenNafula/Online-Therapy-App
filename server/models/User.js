const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['client','therapist','admin'], default: 'client' },
  bio: String,
  specialties: [String],
  timezone: { type: String, default: 'UTC' },
  // payment reference info displayed only (no processing)
  paymentInfo: {
    provider: String,
    reference: String,
    last4: String
  }
}, { timestamps: true });

UserSchema.methods.verifyPassword = function(password) {
  return bcrypt.compare(password, this.passwordHash);
}

module.exports = mongoose.model('User', UserSchema);
