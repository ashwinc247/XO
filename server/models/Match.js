const mongoose = require('mongoose');

const MatchSchema = new mongoose.Schema(
  {
    playerOne: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    playerTwo: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    status: {
      type: String,
      enum: ['pending_accept', 'active', 'finished', 'cancelled'],
      default: 'pending_accept'
    },
    acceptance: {
      playerOneAccepted: {
        type: Boolean,
        default: false
      },
      playerTwoAccepted: {
        type: Boolean,
        default: false
      },
      expiresAt: {
        type: Date
      }
    },
    winner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    result: {
      type: String,
      enum: [
        'win_one',
        'win_two',
        'draw',
        'disconnect_win_one',
        'disconnect_win_two',
        'forfeit_one',
        'forfeit_two',
        'timeout_one',
        'timeout_two'
      ],
      default: null
    },
    board: {
      type: [String],
      default: Array(9).fill(null)
    },
    symbolsHistory: {
      X: {
        type: [Number],
        default: []
      },
      O: {
        type: [Number],
        default: []
      }
    },
    turn: {
      type: String,
      enum: ['X', 'O'],
      default: 'X'
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    duration: {
      type: Number,
      default: 0 // in seconds
    },
    disconnectCount: {
      type: Number,
      default: 0
    },
    reconnectCount: {
      type: Number,
      default: 0
    },
    totalMoves: {
      type: Number,
      default: 0
    },
    isCashMatch: {
      type: Boolean,
      default: false
    },
    entryFee: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true
  }
);

// Indexes
MatchSchema.index({ playerOne: 1 });
MatchSchema.index({ playerTwo: 1 });
MatchSchema.index({ status: 1 });

module.exports = mongoose.model('Match', MatchSchema);
