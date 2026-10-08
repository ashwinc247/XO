const mongoose = require('mongoose');

const MaintenanceSchema = new mongoose.Schema(
  {
    enabled: {
      type: Boolean,
      default: false
    },
    title: {
      type: String,
      default: 'Scheduled Maintenance'
    },
    description: {
      type: String,
      default: 'We are currently performing maintenance. We will be back online shortly!'
    },
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  },
  {
    timestamps: true
  }
);

module.exports = mongoose.model('Maintenance', MaintenanceSchema);
