const authService = require('../services/authService');
const otpService = require('../services/otpService');
const userRepository = require('../repositories/userRepository');

exports.register = async (req, res, next) => {
  try {
    const { username, email, password, referralCode } = req.body;
    const result = await authService.register(username, email, password, referralCode);
    res.status(201).json({
      success: true,
      message: 'User registered successfully. Verification OTP sent to email.',
      data: result
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { usernameOrEmail, password } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgentDetails = {
      device: req.headers['user-agent']?.includes('Mobi') ? 'Mobile' : 'Desktop',
      browser: req.headers['user-agent']?.split(' ')[0] || 'Unknown Browser',
      os: req.headers['user-agent']?.includes('Windows') ? 'Windows' : req.headers['user-agent']?.includes('Mac') ? 'MacOS' : 'Linux'
    };

    const result = await authService.login(usernameOrEmail, password, userAgentDetails, ipAddress);
    
    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken
      }
    });
  } catch (error) {
    res.status(401);
    next(error);
  }
};

exports.googleLogin = async (req, res, next) => {
  try {
    const { idToken, referralCode } = req.body;
    const ipAddress = req.ip || req.headers['x-forwarded-for'] || '';
    const userAgentDetails = {
      device: req.headers['user-agent']?.includes('Mobi') ? 'Mobile' : 'Desktop',
      browser: req.headers['user-agent']?.split(' ')[0] || 'Unknown Browser',
      os: req.headers['user-agent']?.includes('Windows') ? 'Windows' : req.headers['user-agent']?.includes('Mac') ? 'MacOS' : 'Linux'
    };

    const result = await authService.googleLogin(idToken, referralCode, userAgentDetails, ipAddress);

    // Set refresh token in httpOnly cookie
    res.cookie('refreshToken', result.tokens.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.status(200).json({
      success: true,
      message: 'Google login successful',
      data: {
        user: result.user,
        accessToken: result.tokens.accessToken,
        isNewUser: result.isNewUser
      }
    });
  } catch (error) {
    res.status(401);
    next(error);
  }
};

exports.applyReferral = async (req, res, next) => {
  try {
    const { referralCode } = req.body;
    const userId = req.user._id;
    await authService.applyReferral(userId, referralCode);
    res.status(200).json({
      success: true,
      message: 'Referral code applied successfully.'
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.verifyEmail = async (req, res, next) => {
  try {
    const { email, otp } = req.body;
    await authService.verifyEmailOTP(email, otp);
    res.status(200).json({
      success: true,
      message: 'Email verified successfully.'
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.sendOtp = async (req, res, next) => {
  try {
    const { email } = req.body;
    await otpService.generateOTP(email);
    res.status(200).json({
      success: true,
      message: 'OTP sent successfully.'
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const result = await authService.forgotPassword(email);
    res.status(200).json({
      success: true,
      message: result.message
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    await authService.resetPassword(email, otp, newPassword);
    res.status(200).json({
      success: true,
      message: 'Password reset successfully.'
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.refreshToken = async (req, res, next) => {
  try {
    const rToken = req.cookies?.refreshToken || req.body.refreshToken;
    if (!rToken) {
      return res.status(401).json({ success: false, message: 'Refresh token missing' });
    }

    const ipAddress = req.ip || '';
    const userAgentDetails = {
      device: req.headers['user-agent']?.includes('Mobi') ? 'Mobile' : 'Desktop'
    };

    const result = await authService.refreshToken(rToken, userAgentDetails, ipAddress);

    // Set new refresh token cookie
    res.cookie('refreshToken', result.refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(200).json({
      success: true,
      message: 'Token refreshed',
      data: {
        accessToken: result.accessToken
      }
    });
  } catch (error) {
    res.status(401);
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const rToken = req.cookies?.refreshToken || req.body.refreshToken;
    await authService.logout(rToken);
    
    res.clearCookie('refreshToken');
    res.status(200).json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const profile = await userRepository.getProfileByUserId(req.user._id);
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
        profile
      }
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};


