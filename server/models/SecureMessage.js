const mongoose = require('mongoose');
const crypto = require('crypto');

const rawKey = process.env.ENCRYPTION_KEY;
if (!rawKey) {
  throw new Error('ENCRYPTION_KEY environment variable is required');
}
const encryption_key = rawKey.padEnd(32, '0').slice(0, 32);

const SecureMessageSchema = new mongoose.Schema({
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  encryptedContent: String,
  iv: String,
  subject: String,
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

SecureMessageSchema.methods.encryptMessage = function(plaintext) {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(encryption_key.padEnd(32, '0').slice(0, 32)), iv);
  let encrypted = cipher.update(plaintext, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  this.encryptedContent = encrypted;
  this.iv = iv.toString('hex');
};

SecureMessageSchema.methods.decryptMessage = function() {
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

module.exports = mongoose.model('SecureMessage', SecureMessageSchema);
