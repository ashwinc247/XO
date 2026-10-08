const Move = require('../models/Move');

class GameRepository {
  async logMove(moveData) {
    return await Move.create(moveData);
  }

  async getMovesForMatch(matchId) {
    return await Move.find({ match: matchId }).sort({ moveNumber: 1 }).populate('player', 'username');
  }

  async getMovesCountForMatch(matchId) {
    return await Move.countDocuments({ match: matchId });
  }
}

module.exports = new GameRepository();
