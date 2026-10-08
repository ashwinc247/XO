const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const uuid = require('uuid');
const userRepository = require('../repositories/userRepository');
const otpService = require('./otpService');
const Session = require('../models/Session');
const Settings = require('../models/Settings');
const BonusTransaction = require('../models/BonusTransaction');
const Profile = require('../models/Profile');
const auditService = require('./auditService');
const { initialized } = require('../config/firebase');
const { getAuth } = require('firebase-admin/auth');

const LEVEL_1_REFERRAL_REWARD = 10;
const LEVEL_2_REFERRAL_REWARD = 5;

class AuthService {
  async generateUniqueReferralCode() {
    const letters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const numbers = '0123456789';
    let isUnique = false;
    let code = '';
    
    while (!isUnique) {
      code = '';
      for (let i = 0; i < 2; i++) code += letters.charAt(Math.floor(Math.random() * letters.length));
      for (let i = 0; i < 6; i++) code += numbers.charAt(Math.floor(Math.random() * numbers.length));
      
      const existing = await Profile.findOne({ referralCode: code });
      if (!existing) {
        isUnique = true;
      }
    }
    return code;
  }

  async register(username, email, password, referralCode = null) {
    // Check if user exists
    const existingEmail = await userRepository.findByEmail(email);
    if (existingEmail) {
      throw new Error('Email already registered');
    }

    const existingUsername = await userRepository.findByUsername(username);
    if (existingUsername) {
      throw new Error('Username already taken');
    }

    // Handle referral check
    let referrer = null;
    if (referralCode) {
      const referrerProfile = await userRepository.findProfileByReferralCode(referralCode);
      if (referrerProfile) {
        referrer = referrerProfile.user;
      }
    }

    // Create user
    const user = await userRepository.create({
      username,
      email,
      password,
      role: 'player'
    });

    // Create profile
    await userRepository.createProfile({
      user: user._id,
      displayName: username,
      referralCode: await this.generateUniqueReferralCode(),
      referredBy: referrer
    });

    // Create default settings
    await userRepository.createDefaultSettings(user._id);

    // If referred by someone, process the 2-level rewards
    if (referrer) {
      await userRepository.updateProfile(referrer, { $inc: { referredCount: 1 } });
      await this.processReferralRewards(user._id, referrer);
    }

    await auditService.log('register', user._id, user.role, '', '', 'success', { email });

    return { user };
  }

  async processReferralRewards(newUserId, referrerId) {
    try {
      // LEVEL 1
      const level1RefId = `ref_1_${newUserId}_to_${referrerId}`;
      const existingL1 = await BonusTransaction.findOne({ referenceId: level1RefId });

      if (!existingL1) {
        // Credit Level 1
        await Profile.findOneAndUpdate(
          { user: referrerId },
          { $inc: { bonusRewardBalance: LEVEL_1_REFERRAL_REWARD } }
        );

        await BonusTransaction.create({
          user: referrerId,
          type: 'referral_bonus',
          level: 1,
          amount: LEVEL_1_REFERRAL_REWARD,
          sourceUser: newUserId,
          referenceId: level1RefId,
          status: 'completed'
        });
      }

      // LEVEL 2
      const referrerProfile = await Profile.findOne({ user: referrerId });
      if (referrerProfile && referrerProfile.referredBy) {
        const level2ReferrerId = referrerProfile.referredBy;
        const level2RefId = `ref_2_${newUserId}_to_${level2ReferrerId}`;
        const existingL2 = await BonusTransaction.findOne({ referenceId: level2RefId });

        if (!existingL2) {
          // Credit Level 2
          await Profile.findOneAndUpdate(
            { user: level2ReferrerId },
            { $inc: { bonusRewardBalance: LEVEL_2_REFERRAL_REWARD } }
          );

          await BonusTransaction.create({
            user: level2ReferrerId,
            type: 'referral_bonus',
            level: 2,
            amount: LEVEL_2_REFERRAL_REWARD,
            sourceUser: newUserId,
            referenceId: level2RefId,
            status: 'completed'
          });
        }
      }
    } catch (error) {
      console.error('Error processing referral rewards:', error);
      // We don't throw to prevent registration rollback for a bonus failure.
    }
  }

  async login(usernameOrEmail, password, userAgentDetails = {}, ipAddress = '') {
    let user = await userRepository.findByUsername(usernameOrEmail);
    if (!user && usernameOrEmail.includes('@')) {
      user = await userRepository.findByEmail(usernameOrEmail);
    }

    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (user.status === 'suspended') {
      throw new Error('Your account is suspended. Please contact admin.');
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      throw new Error('Invalid credentials');
    }

    // Update last login
    user.lastLogin = new Date();
    await user.save();

    // Create tokens
    const tokens = await this.createSession(user, userAgentDetails, ipAddress);

    await auditService.log('login', user._id, user.role, ipAddress, '', 'success');

    // Remove password from returned user details
    const userJson = user.toJSON();
    delete userJson.password;

    return { user: userJson, tokens };
  }

  async googleLogin(idToken, referralCode = null, userAgentDetails = {}, ipAddress = '') {
    if (!initialized) {
      throw new Error('Firebase Admin not initialized on server.');
    }

    let decodedToken;
    try {
      decodedToken = await getAuth().verifyIdToken(idToken);
    } catch (error) {
      throw new Error('Invalid Firebase ID token: ' + error.message);
    }

    const { uid, email, name, picture, email_verified } = decodedToken;

    if (!email || !uid) {
      throw new Error('Invalid Google credential payload');
    }

    let isNewUser = false;
    let user = await userRepository.findByFirebaseUid(uid);

    if (!user) {
      // Safe migration check
      user = await userRepository.findByEmail(email);
      if (user) {
        // Link account
        user.firebaseUid = uid;
      } else {
        isNewUser = true;
        let baseUsername = (name || email.split('@')[0]).replace(/[^a-zA-Z0-9]/g, '').toLowerCase().substring(0, 15);
        if (baseUsername.length < 3) baseUsername = baseUsername + 'user';
        
        let finalUsername = baseUsername;
        let userExists = await userRepository.findByUsername(finalUsername);
        let counter = 1;
        while (userExists) {
          finalUsername = `${baseUsername}${Math.floor(100 + Math.random() * 900)}`;
          userExists = await userRepository.findByUsername(finalUsername);
          counter++;
          if(counter > 10) break; // safeguard
        }

        user = await userRepository.create({
          username: finalUsername,
          email,
          firebaseUid: uid,
          role: 'player',
          isEmailVerified: email_verified || true
        });

        let referrer = null;
        if (referralCode) {
          const referrerProfile = await userRepository.findProfileByReferralCode(referralCode);
          if (referrerProfile && referrerProfile.user.toString() !== user._id.toString()) {
            referrer = referrerProfile.user;
          }
        }

        await userRepository.createProfile({
          user: user._id,
          displayName: user.username,
          referralCode: await this.generateUniqueReferralCode(),
          avatarUrl: picture || '',
          referredBy: referrer
        });

        await userRepository.createDefaultSettings(user._id);

        if (referrer) {
          await userRepository.updateProfile(referrer, { $inc: { referredCount: 1 } });
          await this.processReferralRewards(user._id, referrer);
        }

        await auditService.log('register_google', user._id, user.role, ipAddress, '', 'success', { email, uid });
      }
    }

    user.lastLogin = new Date();
    await user.save();

    const tokens = await this.createSession(user, userAgentDetails, ipAddress);
    await auditService.log('login_google', user._id, user.role, ipAddress, '', 'success');

    const userJson = user.toJSON();
    delete userJson.password;

    return { user: userJson, tokens, isNewUser };
  }

  async applyReferral(userId, referralCode) {
    if (!referralCode) throw new Error('Referral code is required');
    
    const profile = await Profile.findOne({ user: userId });
    if (!profile) throw new Error('Profile not found');
    if (profile.referredBy) throw new Error('You have already applied a referral code');

    const referrerProfile = await Profile.findOne({ referralCode });
    if (!referrerProfile) throw new Error('Invalid referral code');
    
    if (referrerProfile.user.toString() === userId.toString()) {
      throw new Error('You cannot refer yourself');
    }

    profile.referredBy = referrerProfile.user;
    await profile.save();

    await Profile.findOneAndUpdate(
      { user: referrerProfile.user },
      { $inc: { referredCount: 1 } }
    );

    await this.processReferralRewards(userId, referrerProfile.user);
    return true;
  }

  async verifyEmailOTP(email, otp) {
    const verification = await otpService.verifyOTP(email, otp);
    if (!verification.success) {
      throw new Error(verification.reason);
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    user.isEmailVerified = true;
    await user.save();

    await otpService.deleteOTP(email);
    await auditService.log('verify_email', user._id, user.role, '', '', 'success');

    return { success: true };
  }

  async forgotPassword(email) {
    const user = await userRepository.findByEmail(email);
    if (!user) {
      // Don't leak user existence in secure apps, but in this platform we can tell them or mock it. Let's return success regardless to avoid user enumeration.
      return { success: true, message: 'If email exists, an OTP has been sent.' };
    }

    await otpService.generateOTP(email);
    return { success: true, message: 'OTP sent successfully.' };
  }

  async resetPassword(email, otp, newPassword) {
    const verification = await otpService.verifyOTP(email, otp);
    if (!verification.success) {
      throw new Error(verification.reason);
    }

    const user = await userRepository.findByEmail(email);
    if (!user) {
      throw new Error('User not found');
    }

    user.password = newPassword;
    await user.save();

    await otpService.deleteOTP(email);
    await auditService.log('reset_password', user._id, user.role, '', '', 'success');

    return { success: true };
  }

  async createSession(user, userAgentDetails = {}, ipAddress = '') {
    const accessToken = jwt.sign(
      { userId: user._id, role: user.role, username: user.username },
      process.env.JWT_SECRET || 'super_secret_access_token_key_12345',
      { expiresIn: '2d' }
    );

    const refreshToken = jwt.sign(
      { userId: user._id },
      process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_token_key_54321',
      { expiresIn: '2d' }
    );

    const salt = await bcrypt.genSalt(10);
    const refreshTokenHash = await bcrypt.hash(refreshToken, salt);
    const expiresAt = new Date(Date.now() + 2 * 24 * 60 * 60 * 1000); // 2 days

    await Session.create({
      user: user._id,
      refreshTokenHash,
      device: userAgentDetails.device || 'Unknown Device',
      browser: userAgentDetails.browser || 'Unknown Browser',
      os: userAgentDetails.os || 'Unknown OS',
      ipAddress,
      expiresAt
    });

    return { accessToken, refreshToken };
  }

  async refreshToken(rToken, userAgentDetails = {}, ipAddress = '') {
    let payload;
    try {
      payload = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_token_key_54321');
    } catch (err) {
      throw new Error('Invalid refresh token');
    }

    const sessions = await Session.find({ user: payload.userId });
    let validSession = null;

    for (const session of sessions) {
      const isMatch = await bcrypt.compare(rToken, session.refreshTokenHash);
      if (isMatch && session.expiresAt > new Date()) {
        validSession = session;
        break;
      }
    }

    if (!validSession) {
      throw new Error('Session not found or expired');
    }

    const user = await userRepository.findById(payload.userId);
    if (!user || user.status === 'suspended') {
      throw new Error('User inactive or suspended');
    }

    // Rotate refresh token - delete old session
    await validSession.deleteOne();

    // Create new session
    return await this.createSession(user, userAgentDetails, ipAddress);
  }

  async logout(rToken) {
    if (!rToken) return;

    let payload;
    try {
      payload = jwt.verify(rToken, process.env.JWT_REFRESH_SECRET || 'super_secret_refresh_token_key_54321');
    } catch (err) {
      return; // If token invalid, just return
    }

    const sessions = await Session.find({ user: payload.userId });
    for (const session of sessions) {
      const isMatch = await bcrypt.compare(rToken, session.refreshTokenHash);
      if (isMatch) {
        await session.deleteOne();
        await auditService.log('logout', payload.userId, '', '', '', 'success');
        break;
      }
    }
  }


}

module.exports = new AuthService();
