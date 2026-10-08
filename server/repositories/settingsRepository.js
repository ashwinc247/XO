const Settings = require('../models/Settings');

class SettingsRepository {
  async findByUserId(userId) {
    return await Settings.findOne({ user: userId });
  }

  async create(settingsData) {
    return await Settings.create(settingsData);
  }

  async update(userId, settingsData) {
    return await Settings.findOneAndUpdate({ user: userId }, settingsData, {
      new: true,
      upsert: true,
      runValidators: true
    });
  }
}

module.exports = new SettingsRepository();
