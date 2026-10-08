const express = require('express');
const rewardController = require('../controllers/rewardController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

router.use(protect);

router.get('/', rewardController.getRewardStats);
router.post('/claim', rewardController.claimBonus);

module.exports = router;
