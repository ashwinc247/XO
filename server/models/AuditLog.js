const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    role: {
      type: String,
      default: 'guest'
    },
    ip: {
      type: String,
      default: ''
    },
    requestId: {
      type: String,
      default: ''
    },
    status: {
      type: String,
      enum: ['success', 'failure'],
      default: 'success'
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true
  }
);

AuditLogSchema.index({ createdAt: -1 });
AuditLogSchema.index({ action: 1 });
AuditLogSchema.index({ user: 1 });

module.exports = mongoose.model('AuditLog', AuditLogSchema);
