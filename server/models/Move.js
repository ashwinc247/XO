const mongoose = require('mongoose');

const MoveSchema = new mongoose.Schema(
  {
    match: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Match',
      required: true
    },
    moveNumber: {
      type: Number,
      required: true
    },
    player: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    position: {
      type: Number,
      required: true,
      min: 0,
      max: 8
    },
    removedPosition: {
      type: Number,
      default: null // stores the position that got cleared due to the 3-symbol limit rule
    },
    boardSnapshot: {
      type: [String],
      required: true
    }
  },
  {
    timestamps: true
  }
);

MoveSchema.index({ match: 1, moveNumber: 1 });

module.exports = mongoose.model('Move', MoveSchema);
