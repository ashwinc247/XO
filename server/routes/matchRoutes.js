const express = require('express');
const matchController = require('../controllers/matchController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.get('/history', protect, matchController.getMatchHistory);
router.get('/details/:id', protect, matchController.getMatchDetails);

module.exports = router;
