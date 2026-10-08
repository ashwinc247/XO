const mongoose = require('mongoose');

const ProfileSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    displayName: {
      type: String,
      trim: true,
      maxlength: [30, 'Display name cannot exceed 30 characters']
    },
    bio: {
      type: String,
      trim: true,
      maxlength: [200, 'Bio cannot exceed 200 characters'],
      default: ''
    },
    avatarUrl: {
      type: String,
      default: ''
    },
    walletBalance: {
      type: Number,
      default: 10.00
    },
    bonusRewardBalance: {
      type: Number,
      default: 0.00
    },
    lastBonusClaimedAt: {
      type: Date,
      default: null
    },
    withdrawalUpiId: {
      type: String,
      default: ''
    },
    mobileNumber: {
      type: String,
      default: ''
    },
    isWhatsapp: {
      type: Boolean,
      default: false
    },
    address: {
      type: String,
      default: ''
    },
    state: {
      type: String,
      default: ''
    },
    country: {
      type: String,
      default: ''
    },
    isProfileCompleted: {
      type: Boolean,
      default: false
    },
    timezone: {
      type: String,
      default: ''
    },
    preferredLanguage: {
      type: String,
      default: 'en'
    },
    statistics: {
      gamesPlayed: {
        type: Number,
        default: 0
      },
      wins: {
        type: Number,
        default: 0
      },
      losses: {
        type: Number,
        default: 0
      },
      draws: {
        type: Number,
        default: 0
      },
      rating: {
        type: Number,
        default: 1200
      }
    },
    referralCode: {
      type: String,
      unique: true,
      required: true
    },
    referredBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    referredCount: {
      type: Number,
      default: 0
    },
    lastUsernameChange: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// Virtual for Win Rate percentage
ProfileSchema.virtual('statistics.winRate').get(function () {
  if (!this.statistics || this.statistics.gamesPlayed === 0) return 0;
  return parseFloat(((this.statistics.wins / this.statistics.gamesPlayed) * 100).toFixed(1));
});

module.exports = mongoose.model('Profile', ProfileSchema);
