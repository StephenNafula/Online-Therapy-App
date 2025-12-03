const mongoose = require('mongoose');
const crypto = require('crypto');

const WebhookKeySchema = new mongoose.Schema({
  // Friendly name for this API key (e.g., "Zapier Email Automation")
  name: { type: String, required: true },
  
  // The actual API key (hashed for security)
  keyHash: { type: String, required: true, unique: true },
  
  // Plain key returned only on creation (not stored)
  // For display: show only last 8 chars (e.g., "sk_live_...abcd1234")
  displayKey: String,
  
  // Webhook events this key can trigger
  // Possible values: "booking.created", "booking.payment_verified", "booking.reminder"
  allowedEvents: [{ type: String, enum: ['booking.created', 'booking.payment_verified', 'booking.reminder'] }],
  
  // Webhook destination URL where events will be POSTed
  webhookUrl: { type: String, required: true },
  
  // Whether this key is active
  active: { type: Boolean, default: true },
  
  // Metadata for tracking
  provider: { type: String, enum: ['zapier', 'custom', 'other'], default: 'zapier' },
  
  // Rate limiting: max requests per hour
  rateLimit: { type: Number, default: 1000 },
  
  // Track last webhook call
  lastWebhookAt: Date,
  lastWebhookStatus: Number, // HTTP status code
  
  // Usage stats
  successCount: { type: Number, default: 0 },
  failureCount: { type: Number, default: 0 },
  
  // Admin notes
  notes: String,
  
  // Track who created this key (if within admin panel)
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

// Static method to generate and hash a new API key
WebhookKeySchema.statics.generateKey = function() {
  const rawKey = crypto.randomBytes(24).toString('hex');
  const keyHash = crypto.createHash('sha256').update(rawKey).digest('hex');
  const displayKey = 'sk_live_' + rawKey.slice(-8);
  return { rawKey, keyHash, displayKey };
};

// Instance method to verify an API key
WebhookKeySchema.methods.verifyKey = function(providedKey) {
  const providedHash = crypto.createHash('sha256').update(providedKey).digest('hex');
  return providedHash === this.keyHash;
};

module.exports = mongoose.model('WebhookKey', WebhookKeySchema);
