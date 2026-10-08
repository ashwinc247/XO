const express = require('express');
const announcementController = require('../controllers/announcementController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', announcementController.getAnnouncements);
router.post('/:id/read', announcementController.markAsRead);
router.post('/read-all', announcementController.markAllAsRead);

module.exports = router;
