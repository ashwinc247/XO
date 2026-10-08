const userRepository = require('../repositories/userRepository');
const settingsRepository = require('../repositories/settingsRepository');
const auditService = require('./auditService');
const User = require('../models/User');

class ProfileService {
  async getProfile(userId) {
    const profile = await userRepository.getProfileByUserId(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }
    return profile;
  }

  async updateProfile(userId, updateData) {
    const profileDoc = await userRepository.getProfileByUserId(userId);
    if (!profileDoc) throw new Error('Profile not found');

    const allowedUpdates = {};
    if (updateData.displayName !== undefined) allowedUpdates.displayName = updateData.displayName;
    if (updateData.bio !== undefined) allowedUpdates.bio = updateData.bio;
    if (updateData.timezone !== undefined) allowedUpdates.timezone = updateData.timezone;
    if (updateData.preferredLanguage !== undefined) allowedUpdates.preferredLanguage = updateData.preferredLanguage;

    if (!profileDoc.isProfileCompleted) {
      if (updateData.mobileNumber !== undefined) allowedUpdates.mobileNumber = updateData.mobileNumber;
      if (updateData.isWhatsapp !== undefined) allowedUpdates.isWhatsapp = updateData.isWhatsapp;
      if (updateData.address !== undefined) allowedUpdates.address = updateData.address;
      if (updateData.state !== undefined) allowedUpdates.state = updateData.state;
      if (updateData.country !== undefined) allowedUpdates.country = updateData.country;
      if (updateData.withdrawalUpiId !== undefined) allowedUpdates.withdrawalUpiId = updateData.withdrawalUpiId;
      
      if (updateData.isProfileCompleted) {
        allowedUpdates.isProfileCompleted = true;
      }
    } else {
      // Allow country to be updated if it was missed? The requirement says ONE time change for these details.
      // We strictly ignore updates to these fields if already completed, except when contacting support.
    }

    const profile = await userRepository.updateProfile(userId, allowedUpdates);
    await auditService.log('update_profile', userId, profile.user.role, '', '', 'success', allowedUpdates);
    return profile;
  }

  async updateUsername(userId, newUsername) {
    const user = await userRepository.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const profile = await userRepository.getProfileByUserId(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    // Cooldown check: 30 days
    const COOLDOWN_DAYS = 30;
    if (profile.lastUsernameChange) {
      const diffTime = Math.abs(new Date() - profile.lastUsernameChange);
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      if (diffDays < COOLDOWN_DAYS) {
        throw new Error(`Username can only be changed once every ${COOLDOWN_DAYS} days. Remaining days: ${COOLDOWN_DAYS - diffDays}`);
      }
    }

    // Uniqueness check
    const existing = await User.findOne({ username: newUsername });
    if (existing) {
      throw new Error('Username already in use');
    }

    // Update username
    user.username = newUsername;
    await user.save();

    profile.lastUsernameChange = new Date();
    if (!profile.displayName || profile.displayName === user.username) {
      profile.displayName = newUsername;
    }
    await profile.save();

    await auditService.log('update_username', userId, user.role, '', '', 'success', { newUsername });

    return { user, profile };
  }

  async updateAvatar(userId, avatarUrl) {
    const profile = await userRepository.getProfileByUserId(userId);
    if (!profile) {
      throw new Error('Profile not found');
    }

    profile.avatarUrl = avatarUrl;
    await profile.save();

    await auditService.log('update_avatar', userId, profile.user.role, '', '', 'success', { avatarUrl });

    return profile;
  }

  async getSettings(userId) {
    let settings = await settingsRepository.findByUserId(userId);
    if (!settings) {
      settings = await settingsRepository.create({ user: userId });
    }
    return settings;
  }

  async updateSettings(userId, settingsData) {
    const updates = {};
    if (settingsData.soundEnabled !== undefined) updates.soundEnabled = settingsData.soundEnabled;
    if (settingsData.darkTheme !== undefined) updates.darkTheme = settingsData.darkTheme;
    if (settingsData.language !== undefined) updates.language = settingsData.language;

    return await settingsRepository.update(userId, updates);
  }
}

module.exports = new ProfileService();
