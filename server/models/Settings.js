const mongoose = require('mongoose');

const SettingsSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true
    },
    soundEnabled: {
      type: Boolean,
      default: true
    },
    darkTheme: {
      type: Boolean,
      default: true // Platform is dark theme only by default, but preferences table has it
    },
    language: {
      type: String,
      default: 'en'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Settings', SettingsSchema);
