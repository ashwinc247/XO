const matchRepository = require('../repositories/matchRepository');
const userRepository = require('../repositories/userRepository');

class MatchmakingService {
  constructor() {
    this.queue = []; // array of { userId, socketId, username, rating, joinedAt }
    this.pendingMatches = new Map(); // matchId -> { p1SocketId, p2SocketId, timeoutId }
  }

  addToQueue(userId, socketId, username, rating = 1200, isCashMatch = false, betAmount = 10) {
    // Check if user is already in queue
    const index = this.queue.findIndex(item => item.userId.toString() === userId.toString());
    if (index !== -1) {
      this.queue[index].socketId = socketId;
      this.queue[index].isCashMatch = isCashMatch;
      this.queue[index].betAmount = betAmount;
      return this.queue[index];
    }

    const queueItem = {
      userId,
      socketId,
      username,
      rating,
      isCashMatch,
      betAmount,
      joinedAt: new Date()
    };
    this.queue.push(queueItem);
    console.log(`[Queue] Player joined: ${username} (${userId}) [Cash: ${isCashMatch}, Bet: $${betAmount}]`);
    return queueItem;
  }

  removeFromQueue(userId) {
    const initialLength = this.queue.length;
    this.queue = this.queue.filter(item => item.userId.toString() !== userId.toString());
    if (this.queue.length < initialLength) {
      console.log(`[Queue] Player left: ${userId}`);
    }
  }

  getQueue() {
    return this.queue;
  }

  findMatches() {
    if (this.queue.length < 2) return null;

    // Check cash battles
    const cashQueue = this.queue.filter(item => item.isCashMatch);
    if (cashQueue.length >= 2) {
      cashQueue.sort((a, b) => a.joinedAt - b.joinedAt);
      for (let i = 0; i < cashQueue.length; i++) {
        for (let j = i + 1; j < cashQueue.length; j++) {
          if (cashQueue[i].betAmount === cashQueue[j].betAmount) {
            const p1 = cashQueue[i];
            const p2 = cashQueue[j];
            this.queue = this.queue.filter(item => item.userId.toString() !== p1.userId.toString() && item.userId.toString() !== p2.userId.toString());
            return { p1, p2, isCashMatch: true, betAmount: p1.betAmount };
          }
        }
      }
    }

    // Check free battles
    const freeQueue = this.queue.filter(item => !item.isCashMatch);
    if (freeQueue.length >= 2) {
      freeQueue.sort((a, b) => a.joinedAt - b.joinedAt);
      const p1 = freeQueue[0];
      const p2 = freeQueue[1];
      this.queue = this.queue.filter(item => item.userId.toString() !== p1.userId.toString() && item.userId.toString() !== p2.userId.toString());
      return { p1, p2, isCashMatch: false };
    }

    return null;
  }

  async createPendingMatch(p1, p2, isCashMatch = false) {
    const actualP1 = p1; // First player in queue gets 'X'
    const actualP2 = p2;

    const match = await matchRepository.create({
      playerOne: actualP1.userId,
      playerTwo: actualP2.userId,
      status: 'pending_accept',
      board: Array(9).fill(null),
      symbolsHistory: { X: [], O: [] },
      turn: 'X', // 'X' always plays first
      isCashMatch,
      entryFee: isCashMatch ? actualP1.betAmount : 0,
      acceptance: {
        playerOneAccepted: false,
        playerTwoAccepted: false,
        expiresAt: new Date(Date.now() + 15 * 1000) // 15 seconds to accept
      }
    });

    console.log(`[Matchmaking] Match found: ${actualP1.username} vs ${actualP2.username}. Match ID: ${match._id}`);

    return {
      match,
      p1SocketId: p1.socketId,
      p2SocketId: p2.socketId
    };
  }

  addPendingMatchTimeout(matchId, timeoutId) {
    this.pendingMatches.set(matchId.toString(), { timeoutId });
  }

  clearPendingMatch(matchId) {
    const pending = this.pendingMatches.get(matchId.toString());
    if (pending && pending.timeoutId) {
      clearTimeout(pending.timeoutId);
    }
    this.pendingMatches.delete(matchId.toString());
  }

  async acceptMatch(matchId, playerId) {
    let match = await matchRepository.findById(matchId);
    if (!match || match.status !== 'pending_accept') {
      throw new Error('Match not available for acceptance');
    }

    const isP1 = match.playerOne._id.toString() === playerId.toString();
    const isP2 = match.playerTwo._id.toString() === playerId.toString();

    if (!isP1 && !isP2) {
      throw new Error('Not a player in this match');
    }

    const Match = require('../models/Match');
    const updateField = isP1 ? 'acceptance.playerOneAccepted' : 'acceptance.playerTwoAccepted';
    
    match = await Match.findByIdAndUpdate(
      matchId,
      { $set: { [updateField]: true } },
      { new: true }
    );

    // Check if both accepted and we haven't already activated it
    if (match.acceptance.playerOneAccepted && match.acceptance.playerTwoAccepted && match.status === 'pending_accept') {
      match.status = 'active';
      match.startTime = new Date();
      this.clearPendingMatch(matchId);
      await match.save();
    }

    return await matchRepository.findById(matchId);
  }
}

module.exports = new MatchmakingService();
