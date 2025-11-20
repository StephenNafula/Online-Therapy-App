const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
  actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  action: String, // 'create_booking', 'edit_therapist', 'delete_user', etc.
  resourceType: String, // 'Booking', 'User', 'SessionNote', etc.
  resourceId: mongoose.Schema.Types.ObjectId,
  details: mongoose.Schema.Types.Mixed, // store relevant change info
  ipAddress: String,
  userAgent: String
}, { timestamps: true });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
