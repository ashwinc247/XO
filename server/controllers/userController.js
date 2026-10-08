const profileService = require('../services/profileService');

exports.getProfile = async (req, res, next) => {
  try {
    const profile = await profileService.getProfile(req.user._id);
    res.status(200).json({
      success: true,
      data: profile
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const profile = await profileService.updateProfile(req.user._id, req.body);
    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      data: profile
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.updateUsername = async (req, res, next) => {
  try {
    const { newUsername } = req.body;
    const result = await profileService.updateUsername(req.user._id, newUsername);
    res.status(200).json({
      success: true,
      message: 'Username updated successfully',
      data: result
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: 'No file uploaded or file rejected by validation rules'
      });
    }

    // Served statically from /uploads folder. Save path URL relative to host
    const avatarUrl = `/uploads/${req.file.filename}`;
    const profile = await profileService.updateAvatar(req.user._id, avatarUrl);

    res.status(200).json({
      success: true,
      message: 'Avatar uploaded successfully',
      data: {
        avatarUrl,
        profile
      }
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.getSettings = async (req, res, next) => {
  try {
    const settings = await profileService.getSettings(req.user._id);
    res.status(200).json({
      success: true,
      data: settings
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.updateSettings = async (req, res, next) => {
  try {
    const settings = await profileService.updateSettings(req.user._id, req.body);
    res.status(200).json({
      success: true,
      message: 'Settings updated successfully',
      data: settings
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};
