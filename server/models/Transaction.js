const mongoose = require('mongoose');

const TransactionSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    type: {
      type: String,
      enum: ['Deposit', 'Withdrawal', 'Match Bet', 'Match Win', 'Match Loss', 'Refund', 'Recharge', 'Bonus Claim', 'BET_WIN_PAYOUT', 'PLATFORM_COMMISSION', 'REFERRAL_COMMISSION_L1', 'REFERRAL_COMMISSION_L2'],
      required: true
    },
    amount: {
      type: Number,
      required: true
    },
    status: {
      type: String,
      enum: ['completed', 'pending', 'failed'],
      default: 'completed'
    },
    referenceId: {
      type: mongoose.Schema.Types.ObjectId, // Can be matchId
      default: null
    },
    description: {
      type: String,
      default: ''
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Transaction', TransactionSchema);
