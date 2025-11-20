const mongoose = require('mongoose');

const RefreshTokenSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  tokenHash: { type: String, required: true },
  expiresAt: { type: Date, required: true }
}, { timestamps: true });

module.exports = mongoose.model('RefreshToken', RefreshTokenSchema);
