const express = require('express');
const multer = require('multer');
const path = require('path');
const walletController = require('../controllers/walletController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Multer config for payment proofs
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../secure_uploads/payments'));
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'proof-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith('image/')) {
    cb(null, true);
  } else {
    cb(new Error('Not an image! Please upload an image.'), false);
  }
};

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
  fileFilter: fileFilter
});

// All wallet routes are protected
router.use(protect);

router.get('/', walletController.getWalletDetails);
router.post('/deposit', walletController.depositFunds);
router.post('/withdraw', walletController.withdrawFunds);
router.post('/upi', walletController.saveUpiId);

router.post('/recharge/create', walletController.createRecharge);
router.post('/recharge/submit/:id', upload.single('screenshot'), walletController.submitRechargeProof);

module.exports = router;
