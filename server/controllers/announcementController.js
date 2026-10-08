const Announcement = require('../models/Announcement');
const AnnouncementRead = require('../models/AnnouncementRead');

// @desc    Get active announcements for user
// @route   GET /api/announcements
// @access  Private
exports.getAnnouncements = async (req, res, next) => {
  try {
    const announcements = await Announcement.find({ isActive: true })
      .sort({ createdAt: -1 });

    const reads = await AnnouncementRead.find({ userId: req.user._id });
    const readIds = new Set(reads.map(r => r.announcementId.toString()));

    const data = announcements.map(a => {
      const isRead = readIds.has(a._id.toString());
      return {
        ...a.toObject(),
        isRead
      };
    });

    res.status(200).json({
      success: true,
      data
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark announcement as read
// @route   POST /api/announcements/:id/read
// @access  Private
exports.markAsRead = async (req, res, next) => {
  try {
    const announcementId = req.params.id;
    
    // Check if announcement exists
    const announcement = await Announcement.findById(announcementId);
    if (!announcement) {
      return res.status(404).json({ success: false, message: 'Announcement not found' });
    }

    await AnnouncementRead.updateOne(
      { announcementId, userId: req.user._id },
      { $setOnInsert: { readAt: new Date() } },
      { upsert: true }
    );

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

// @desc    Mark all announcements as read
// @route   POST /api/announcements/read-all
// @access  Private
exports.markAllAsRead = async (req, res, next) => {
  try {
    const activeAnnouncements = await Announcement.find({ isActive: true });
    
    const readDocs = activeAnnouncements.map(a => ({
      announcementId: a._id,
      userId: req.user._id,
      readAt: new Date()
    }));

    if (readDocs.length > 0) {
      // Use unordered bulk operations to ignore duplicate key errors
      const bulkOps = readDocs.map(doc => ({
        updateOne: {
          filter: { announcementId: doc.announcementId, userId: doc.userId },
          update: { $setOnInsert: doc },
          upsert: true
        }
      }));
      await AnnouncementRead.bulkWrite(bulkOps, { ordered: false });
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};
