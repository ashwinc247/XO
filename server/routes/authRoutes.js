const express = require('express');
const authController = require('../controllers/authController');
const validate = require('../middleware/validationMiddleware');
const { protect } = require('../middleware/authMiddleware');
const { authLimiter } = require('../middleware/rateLimiter');
const {
  registerSchema,
  loginSchema,
  verifyOtpSchema,
  forgotPasswordSchema,
  resetPasswordSchema
} = require('../validators/authValidator');

const router = express.Router();

router.post('/register', authLimiter, validate(registerSchema), authController.register);
router.post('/login', authLimiter, validate(loginSchema), authController.login);
router.post('/google', authLimiter, authController.googleLogin);
router.post('/verify-otp', authLimiter, validate(verifyOtpSchema), authController.verifyEmail);
router.post('/send-otp', authLimiter, authController.sendOtp); // Resend OTP
router.post('/forgot-password', authLimiter, validate(forgotPasswordSchema), authController.forgotPassword);
router.post('/reset-password', authLimiter, validate(resetPasswordSchema), authController.resetPassword);
router.post('/refresh-token', authController.refreshToken);
router.post('/logout', authController.logout);

// Check current session details
router.get('/me', protect, authController.getMe);
router.post('/apply-referral', protect, authController.applyReferral);

module.exports = router;
