const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const userController = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const validate = require('../middleware/validationMiddleware');
const { updateProfileSchema, updateUsernameSchema } = require('../validators/userValidator');

const router = express.Router();

// Configure storage for Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = process.env.UPLOAD_PATH || 'uploads';
    // Create upload folder if not exists
    if (!fs.existsSync(uploadPath)) {
      fs.mkdirSync(uploadPath, { recursive: true });
    }
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    // Generate unique name: userId + timestamp + ext
    const ext = path.extname(file.originalname);
    cb(null, `avatar_${req.user._id}_${Date.now()}${ext}`);
  }
});

// Configure file filter
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.png', '.jpg', '.jpeg', '.webp'];
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Only images (.png, .jpg, .jpeg, .webp) are allowed'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 } // 2 MB
});

// Protected routes
router.get('/profile', protect, userController.getProfile);
router.put('/profile', protect, validate(updateProfileSchema), userController.updateProfile);
router.put('/username', protect, validate(updateUsernameSchema), userController.updateUsername);
router.post('/avatar', protect, upload.single('avatar'), userController.uploadAvatar);

// Settings routes
router.get('/settings', protect, userController.getSettings);
router.put('/settings', protect, userController.updateSettings);

module.exports = router;
