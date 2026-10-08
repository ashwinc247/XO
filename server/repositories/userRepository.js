const User = require('../models/User');
const Profile = require('../models/Profile');
const Settings = require('../models/Settings');

class UserRepository {
  async findById(id) {
    return await User.findById(id);
  }

  async findByEmail(email) {
    return await User.findOne({ email }).select('+password');
  }

  async findByFirebaseUid(firebaseUid) {
    return await User.findOne({ firebaseUid });
  }

  async findByUsername(username) {
    return await User.findOne({ username }).select('+password');
  }

  async create(userData) {
    return await User.create(userData);
  }

  async update(id, updateData) {
    return await User.findByIdAndUpdate(id, updateData, { new: true, runValidators: true });
  }

  async getProfileByUserId(userId) {
    return await Profile.findOne({ user: userId }).populate('user');
  }

  async createProfile(profileData) {
    return await Profile.create(profileData);
  }

  async updateProfile(userId, updateData) {
    return await Profile.findOneAndUpdate({ user: userId }, updateData, { new: true, runValidators: true }).populate('user');
  }

  async findProfileByReferralCode(referralCode) {
    return await Profile.findOne({ referralCode });
  }

  async createDefaultSettings(userId) {
    return await Settings.create({ user: userId });
  }
}

module.exports = new UserRepository();
