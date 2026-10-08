const matchRepository = require('../repositories/matchRepository');
const gameRepository = require('../repositories/gameRepository');
const userRepository = require('../repositories/userRepository');
const Transaction = require('../models/Transaction');
const Match = require('../models/Match');
const MatchSettlement = require('../models/MatchSettlement');

const WINNER_PAYOUT_PERCENT = 0.92;
const PLATFORM_COMMISSION_PERCENT = 0.05;
const LEVEL_1_REFERRAL_PERCENT = 0.02;
const LEVEL_2_REFERRAL_PERCENT = 0.01;

class GameService {
  WINNING_COMBINATIONS = [
    [0, 1, 2], [3, 4, 5], [6, 7, 8], // Rows
    [0, 3, 6], [1, 4, 7], [2, 5, 8], // Columns
    [0, 4, 8], [2, 4, 6]             // Diagonals
  ];

  checkWin(board, symbol) {
    return this.WINNING_COMBINATIONS.some(combination => {
      return combination.every(index => board[index] === symbol);
    });
  }

  async makeMove(matchId, playerId, position) {
    const match = await matchRepository.findById(matchId);
    if (!match) {
      throw new Error('Match not found');
    }

    if (match.status !== 'active') {
      throw new Error('Match is not active');
    }

    const playerOneId = match.playerOne._id.toString();
    const playerTwoId = match.playerTwo._id.toString();
    const currentPlayerId = playerId.toString();

    let symbol;

    if (currentPlayerId === playerOneId) {
      symbol = 'X';
    } else if (currentPlayerId === playerTwoId) {
      symbol = 'O';
    } else {
      throw new Error('Player is not part of this match');
    }

    console.log('[TURN DEBUG]', {
      matchId: matchId.toString(),
      currentPlayerId,
      playerOneId,
      playerTwoId,
      serverTurn: match.turn,
      calculatedSymbol: symbol
    });

    if (symbol !== match.turn) {
      throw new Error('not-your-turn');
    }

    if (position < 0 || position > 8) {
      throw new Error('Invalid board position');
    }

    // Check if slot is empty
    if (match.board[position] !== null) {
      throw new Error('Position already occupied');
    }

    
    let history = symbol === 'X' ? match.symbolsHistory.X : match.symbolsHistory.O;
    let removedPosition = null;

    // Custom 3-active-symbols rule
    if (history.length >= 3) {
      removedPosition = history[0]; // oldest symbol
      match.board[removedPosition] = null; // remove from board
      history.shift(); // remove from history list
    }

    // Place the new symbol
    match.board[position] = symbol;
    history.push(position);

    // Save updated history
    if (symbol === 'X') {
      match.symbolsHistory.X = history;
    } else {
      match.symbolsHistory.O = history;
    }

    // Increment move count
    match.totalMoves += 1;

    let hasWon = this.checkWin(match.board, symbol);
    let result = null;
    let winner = null;

    if (hasWon) {
      match.status = 'finished';
      match.endTime = new Date();
      match.duration = Math.round((match.endTime - match.startTime) / 1000);
      winner = playerId;
      match.winner = winner;
      match.result = symbol === 'X' ? 'win_one' : 'win_two';
      result = match.result;

      // Update ratings and win/loss statistics
      await this.updatePlayerStats(match._id, match.playerOne._id, match.playerTwo._id, winner, match.isCashMatch, match.entryFee);
    } else {
      // Toggle turn
      match.turn = symbol === 'X' ? 'O' : 'X';
    }

    // Save match state
    await match.save();
    const savedMatch = await matchRepository.findById(matchId);

    // Log the move in Moves collection
    await gameRepository.logMove({
      match: match._id,
      moveNumber: match.totalMoves,
      player: playerId,
      position,
      removedPosition,
      boardSnapshot: [...match.board]
    });

    return {
      match: savedMatch,
      winner,
      result,
      removedPosition
    };
  }

  async updatePlayerStats(matchId, playerOneId, playerTwoId, winnerId, isCashMatch = false, entryFee = 0) {
    const p1Profile = await userRepository.getProfileByUserId(playerOneId);
    const p2Profile = await userRepository.getProfileByUserId(playerTwoId);

    if (!p1Profile || !p2Profile) return;

    p1Profile.statistics.gamesPlayed += 1;
    p2Profile.statistics.gamesPlayed += 1;

    let winnerProfile = null;
    let loserProfile = null;
    let winnerOriginalId = null;
    let loserOriginalId = null;

    if (winnerId === null) {
      // Draw
      p1Profile.statistics.draws += 1;
      p2Profile.statistics.draws += 1;
    } else if (winnerId.toString() === playerOneId.toString()) {
      p1Profile.statistics.wins += 1;
      p2Profile.statistics.losses += 1;
      p1Profile.statistics.rating += 25;
      p2Profile.statistics.rating = Math.max(100, p2Profile.statistics.rating - 25);
      winnerProfile = p1Profile;
      loserProfile = p2Profile;
      winnerOriginalId = playerOneId;
      loserOriginalId = playerTwoId;
    } else {
      p2Profile.statistics.wins += 1;
      p1Profile.statistics.losses += 1;
      p2Profile.statistics.rating += 25;
      p1Profile.statistics.rating = Math.max(100, p1Profile.statistics.rating - 25);
      winnerProfile = p2Profile;
      loserProfile = p1Profile;
      winnerOriginalId = playerTwoId;
      loserOriginalId = playerOneId;
    }

    if (isCashMatch && entryFee > 0 && winnerProfile && loserProfile) {
      try {
        // Atomic Check for Settlement
        const existingSettlement = await MatchSettlement.findOne({ matchId });
        if (!existingSettlement) {
          const baseBetAmount = entryFee; // The amount the loser loses and is distributed

          // Calculate Splits
          // Use Math.floor/round where needed, but with 2 decimal precision typically we use cents or just floats if small enough.
          // Using floats to 2 decimal places to avoid JS math issues:
          const toFixedNumber = (num) => Number(num.toFixed(2));

          const winnerPayout = toFixedNumber(baseBetAmount * WINNER_PAYOUT_PERCENT);
          let platformCommission = toFixedNumber(baseBetAmount * PLATFORM_COMMISSION_PERCENT);
          let level1Commission = toFixedNumber(baseBetAmount * LEVEL_1_REFERRAL_PERCENT);
          let level2Commission = toFixedNumber(baseBetAmount * LEVEL_2_REFERRAL_PERCENT);

          let fallbackCommission = 0;
          let level1UserId = null;
          let level2UserId = null;

          // Check referrers for the WINNER
          if (winnerProfile.referredBy) {
            level1UserId = winnerProfile.referredBy;
            const level1Profile = await userRepository.getProfileByUserId(level1UserId);
            
            if (level1Profile && level1Profile.referredBy) {
              level2UserId = level1Profile.referredBy;
            } else {
              // No Level 2
              fallbackCommission += level2Commission;
              platformCommission += level2Commission;
              level2Commission = 0;
            }
          } else {
            // No Level 1, so no Level 2
            fallbackCommission += (level1Commission + level2Commission);
            platformCommission += (level1Commission + level2Commission);
            level1Commission = 0;
            level2Commission = 0;
          }

          // Force fix floating point rounding errors to ensure invariant:
          // winnerPayout + platformCommission + level1Commission + level2Commission === baseBetAmount
          const totalDistributed = toFixedNumber(winnerPayout + platformCommission + level1Commission + level2Commission);
          
          if (totalDistributed !== baseBetAmount) {
            // Adjust platform commission by the tiny difference
            const diff = toFixedNumber(baseBetAmount - totalDistributed);
            platformCommission = toFixedNumber(platformCommission + diff);
            fallbackCommission = toFixedNumber(fallbackCommission + diff); // Track it
          }

          const finalTotalDistributed = toFixedNumber(winnerPayout + platformCommission + level1Commission + level2Commission);

          // Apply deductions and additions
          loserProfile.walletBalance = Math.max(0, toFixedNumber((loserProfile.walletBalance || 0) - baseBetAmount));
          winnerProfile.walletBalance = toFixedNumber((winnerProfile.walletBalance || 0) + winnerPayout);

          const transactions = [];

          transactions.push({
            user: loserOriginalId,
            type: 'Match Loss',
            amount: baseBetAmount,
            referenceId: matchId,
            description: `Cash match defeat`
          });

          transactions.push({
            user: winnerOriginalId,
            type: 'BET_WIN_PAYOUT',
            amount: winnerPayout,
            referenceId: matchId,
            description: `Cash match victory payout`
          });

          // Payout L1
          if (level1Commission > 0 && level1UserId) {
            const l1Profile = await userRepository.getProfileByUserId(level1UserId);
            if (l1Profile) {
              l1Profile.bonusRewardBalance = toFixedNumber((l1Profile.bonusRewardBalance || 0) + level1Commission);
              await l1Profile.save();
              transactions.push({
                user: level1UserId,
                type: 'REFERRAL_COMMISSION_L1',
                amount: level1Commission,
                referenceId: matchId,
                description: `Level 1 Betting Commission`
              });
            }
          }

          // Payout L2
          if (level2Commission > 0 && level2UserId) {
            const l2Profile = await userRepository.getProfileByUserId(level2UserId);
            if (l2Profile) {
              l2Profile.bonusRewardBalance = toFixedNumber((l2Profile.bonusRewardBalance || 0) + level2Commission);
              await l2Profile.save();
              transactions.push({
                user: level2UserId,
                type: 'REFERRAL_COMMISSION_L2',
                amount: level2Commission,
                referenceId: matchId,
                description: `Level 2 Betting Commission`
              });
            }
          }

          await Transaction.create(transactions);

          // Create Settlement Record
          await MatchSettlement.create({
            matchId,
            baseBetAmount,
            winnerId: winnerOriginalId,
            loserId: loserOriginalId,
            winnerPayout,
            platformCommission,
            level1UserId,
            level1Commission,
            level2UserId,
            level2Commission,
            fallbackCommission,
            totalDistributed: finalTotalDistributed,
            status: 'completed'
          });
        }
      } catch (err) {
        console.error('[Settlement Error]', err);
        // Important: if settlement fails, don't rollback gamesPlayed/rating but wallet state could be mismatched if it partially saved.
        // In this architecture, saving profiles happens at the end.
      }
    }

    await p1Profile.save();
    await p2Profile.save();

    // Emit wallet updates if this was a cash match
    if (isCashMatch && entryFee > 0) {
      const socketService = require('./socketService');
      if (socketService.io) {
        const nsp = socketService.io.of('/game');
        nsp.to(`user_${playerOneId.toString()}`).emit('wallet_updated', {
          balance: p1Profile.walletBalance,
          reason: 'MATCH_SETTLEMENT',
          timestamp: new Date()
        });
        nsp.to(`user_${playerTwoId.toString()}`).emit('wallet_updated', {
          balance: p2Profile.walletBalance,
          reason: 'MATCH_SETTLEMENT',
          timestamp: new Date()
        });
      }
    }

    // Prune history asynchronously without blocking
    this.pruneMatchHistory(playerOneId).catch(console.error);
    this.pruneMatchHistory(playerTwoId).catch(console.error);
  }

  async handleForfeit(matchId, forfeitPlayerId, reason) {
    const match = await matchRepository.findById(matchId);
    if (!match || match.status !== 'active') return null;

    const isP1Forfeit = match.playerOne._id.toString() === forfeitPlayerId.toString();
    const winnerId = isP1Forfeit ? match.playerTwo._id : match.playerOne._id;

    match.status = 'finished';
    match.endTime = new Date();
    match.duration = Math.round((match.endTime - match.startTime) / 1000);
    match.winner = winnerId;

    if (reason === 'disconnect') {
      match.result = isP1Forfeit ? 'disconnect_win_two' : 'disconnect_win_one';
    } else if (reason === 'timeout') {
      match.result = isP1Forfeit ? 'timeout_two' : 'timeout_one';
    } else {
      match.result = isP1Forfeit ? 'forfeit_two' : 'forfeit_one';
    }

    await match.save();
    await this.updatePlayerStats(match._id, match.playerOne._id, match.playerTwo._id, winnerId, match.isCashMatch, match.entryFee);

    return match;
  }
  async pruneMatchHistory(playerId) {
    try {
      // Find all finished matches for this player, sorted by createdAt descending
      const matches = await Match.find({
        $or: [{ playerOne: playerId }, { playerTwo: playerId }],
        status: 'finished'
      }).sort({ createdAt: -1 });

      if (matches.length > 20) {
        const matchesToDelete = matches.slice(20);
        const matchIdsToDelete = matchesToDelete.map(m => m._id);

        await Match.deleteMany({ _id: { $in: matchIdsToDelete } });
        console.log(`[History Prune] Deleted ${matchIdsToDelete.length} old matches for player ${playerId}`);
      }
    } catch (err) {
      console.error(`[History Prune Error]`, err);
    }
  }
}

module.exports = new GameService();
