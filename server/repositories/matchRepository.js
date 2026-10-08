const Match = require('../models/Match');

class MatchRepository {
  async findById(id) {
    return await Match.findById(id)
      .populate('playerOne', 'username email isEmailVerified role status')
      .populate('playerTwo', 'username email isEmailVerified role status');
  }

  async create(matchData) {
    return await Match.create(matchData);
  }

  async update(id, updateData) {
    return await Match.findByIdAndUpdate(id, updateData, { new: true, runValidators: true })
      .populate('playerOne', 'username email isEmailVerified role status')
      .populate('playerTwo', 'username email isEmailVerified role status');
  }

  async findActiveByPlayerId(playerId) {
    return await Match.findOne({
      $or: [{ playerOne: playerId }, { playerTwo: playerId }],
      status: { $in: ['pending_accept', 'active'] }
    })
    .populate('playerOne', 'username email isEmailVerified role status')
    .populate('playerTwo', 'username email isEmailVerified role status');
  }

  async getMatchHistory(playerId, limit = 10, skip = 0) {
    return await Match.find({
      $or: [{ playerOne: playerId }, { playerTwo: playerId }],
      status: 'finished'
    })
    .sort({ createdAt: -1 })
    .skip(skip)
    .limit(limit)
    .populate('playerOne', 'username avatarUrl')
    .populate('playerTwo', 'username avatarUrl')
    .populate('winner', 'username avatarUrl');
  }

  async getMatchHistoryCount(playerId) {
    return await Match.countDocuments({
      $or: [{ playerOne: playerId }, { playerTwo: playerId }],
      status: 'finished'
    });
  }

  async getAllMatches(filter = {}, limit = 50, skip = 0) {
    return await Match.find(filter)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .populate('playerOne', 'username')
      .populate('playerTwo', 'username')
      .populate('winner', 'username');
  }

  async getAllMatchesCount(filter = {}) {
    return await Match.countDocuments(filter);
  }
}

module.exports = new MatchRepository();
