const mongoose = require('mongoose');

const WithdrawalRequestSchema = new mongoose.Schema(
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
      min: [100, 'Minimum withdrawal amount is ₹100']
    },
    requestId: {
      type: String,
      required: true,
      unique: true
    },
    upiId: {
      type: String,
      required: true
    },
    status: {
      type: String,
      enum: ['PENDING', 'PAID', 'REJECTED'],
      default: 'PENDING',
      index: true
    },
    rejectionReason: {
      type: String
    },
    processedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    processedAt: {
      type: Date
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('WithdrawalRequest', WithdrawalRequestSchema);
