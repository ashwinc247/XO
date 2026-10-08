const mongoose = require('mongoose');

const BonusTransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['referral_bonus'],
      required: true
    },
    level: {
      type: Number,
      enum: [1, 2],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    sourceUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    referenceId: {
      type: String,
      unique: true, // Idempotency key (e.g. `ref_level_sourceUserId_to_userId`)
      required: true
    },
    status: {
      type: String,
      enum: ['completed', 'failed'],
      default: 'completed'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('BonusTransaction', BonusTransactionSchema);
