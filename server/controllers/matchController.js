const matchRepository = require('../repositories/matchRepository');
const gameRepository = require('../repositories/gameRepository');

exports.getMatchHistory = async (req, res, next) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;

    const matches = await matchRepository.getMatchHistory(req.user._id, limit, skip);
    const total = await matchRepository.getMatchHistoryCount(req.user._id);

    const formattedMatches = matches.map(match => {
      const matchObj = match.toObject();
      const isWinner = match.winner && match.winner._id.toString() === req.user._id.toString();
      const isDraw = !match.winner;

      if (match.isCashMatch) {
        if (isDraw) matchObj.amount = 0;
        else if (isWinner) matchObj.amount = match.entryFee * 0.92;
        else matchObj.amount = -match.entryFee;
      } else {
        matchObj.amount = 0;
      }

      matchObj.currentUserResult = {
        isWinner,
        isDraw,
        isLoser: !isWinner && !isDraw
      };

      return matchObj;
    });

    res.status(200).json({
      success: true,
      data: {
        matches: formattedMatches,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};

exports.getMatchDetails = async (req, res, next) => {
  try {
    const matchId = req.params.id;
    const match = await matchRepository.findById(matchId);
    
    if (!match) {
      return res.status(404).json({
        success: false,
        message: 'Match not found'
      });
    }

    // Verify requesting player is part of the match (or is admin)
    const isPlayer = 
      match.playerOne._id.toString() === req.user._id.toString() || 
      match.playerTwo._id.toString() === req.user._id.toString();
    const isAdmin = req.user.role === 'admin';

    if (!isPlayer && !isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this match details'
      });
    }

    const moves = await gameRepository.getMovesForMatch(matchId);

    res.status(200).json({
      success: true,
      data: {
        match,
        moves
      }
    });
  } catch (error) {
    res.status(400);
    next(error);
  }
};
