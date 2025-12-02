const mongoose = require('mongoose');
const crypto = require('crypto');

const rawKey = process.env.ENCRYPTION_KEY;
if (!rawKey) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}
const encryption_key = rawKey.padEnd(32, '0').slice(0, 32); // 16+ chars

const SessionNoteSchema = new mongoose.Schema({
  booking: { type: mongoose.Schema.Types.ObjectId, ref: 'Booking', required: true },
  therapist: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedContent: String, // AES-256 encrypted
  iv: String, // initialization vector
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
}, { timestamps: true });

// Encrypt/decrypt helpers
SessionNoteSchema.methods.encryptNote = function(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryption_key.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  this.encryptedContent = encrypted;
  this.iv = iv.toString('hex');
};

SessionNoteSchema.methods.decryptNote = function() {
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(encryption_key.padEnd(32, '0').slice(0, 32)), Buffer.from(this.iv, 'hex'));
    let decrypted = decipher.update(this.encryptedContent, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Decryption failed', err);
    return null;
  }
};

module.exports = mongoose.model('SessionNote', SessionNoteSchema);
