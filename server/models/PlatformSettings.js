const mongoose = require('mongoose');

const PlatformSettingsSchema = new mongoose.Schema(
  {
    upiIds: [
      {
        upi: { type: String, required: true },
        isActive: { type: Boolean, default: true }
      }
    ]
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('PlatformSettings', PlatformSettingsSchema);
