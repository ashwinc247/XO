const mongoose = require('mongoose');

const MatchSettlementSchema = new mongoose.Schema(
  {
    matchId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true,
      unique: true
    },
    baseBetAmount: {
      type: Number,
      required: true
    },
    winnerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    loserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    winnerPayout: {
      type: Number,
      required: true
    },
    platformCommission: {
      type: Number,
      required: true
    },
    level1UserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    level1Commission: {
      type: Number,
      default: 0
    },
    level2UserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    level2Commission: {
      type: Number,
      default: 0
    },
    fallbackCommission: {
      type: Number,
      default: 0
    },
    totalDistributed: {
      type: Number,
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

module.exports = mongoose.model('MatchSettlement', MatchSettlementSchema);
