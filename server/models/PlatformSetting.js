const mongoose = require('mongoose');

const PlatformSettingSchema = new mongoose.Schema({
  key: { type: String, unique: true, default: 'global' },
  manualPaymentInstructions: { type: String, default: '' },
  audioCall: {
    enabled: { type: Boolean, default: true },
    requireSecureLink: { type: Boolean, default: true },
    reminderMinutes: { type: Number, default: 5 }
  },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
}, { timestamps: true });

module.exports = mongoose.model('PlatformSetting', PlatformSettingSchema);

