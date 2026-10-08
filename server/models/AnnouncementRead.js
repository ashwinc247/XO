const mongoose = require('mongoose');

const AnnouncementReadSchema = new mongoose.Schema({
  announcementId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Announcement',
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  readAt: {
    type: Date,
    default: Date.now
  }
});

// Ensure a user can only have one read record per announcement
AnnouncementReadSchema.index({ announcementId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('AnnouncementRead', AnnouncementReadSchema);
