const mongoose = require('mongoose');

const RechargeRequestSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    amount: {
      type: Number,
      required: true,
      min: [100, 'Minimum recharge amount is ₹100'],
      max: [1000, 'Maximum recharge amount is ₹1000']
    },
    requestId: {
      type: String,
      required: true,
      unique: true
    },
    assignedUpiId: {
      type: String,
      required: true
    },
    utr: {
      type: String,
      sparse: true,
      unique: true // Ensure UTR is unique across all submissions
    },
    screenshot: {
      type: String // Path to secure file
    },
    status: {
      type: String,
      enum: ['PENDING_PAYMENT', 'PROOF_SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'EXPIRED'],
      default: 'PENDING_PAYMENT',
      index: true
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    },
    proofSubmittedAt: {
      type: Date
    },
    approvedAt: {
      type: Date
    },
    rejectedAt: {
      type: Date
    },
    approvedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    rejectionReason: {
      type: String
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('RechargeRequest', RechargeRequestSchema);
