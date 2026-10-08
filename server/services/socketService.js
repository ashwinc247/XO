const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const matchmakingService = require('./matchmakingService');
const gameService = require('./gameService');
const matchRepository = require('../repositories/matchRepository');
const userRepository = require('../repositories/userRepository');

class SocketService {
  constructor() {
    this.io = null;
    this.userSockets = new Map(); // userId -> socketId
    this.socketUsers = new Map(); // socketId -> user details (userId, username, role)
    this.activeReconnectTimers = new Map(); // userId -> timeoutId
    this.activeTurnTimers = new Map(); // matchId -> { intervalId, timeLeft }
  }

  setup(server) {
    this.io = new Server(server, {
      cors: {
        origin: [process.env.CLIENT_URL || 'http://localhost:5173', 'http://localhost:4173'],
        methods: ['GET', 'POST'],
        credentials: true
      }
    });

    const gameNamespace = this.io.of('/game');

    // Authentication Middleware
    gameNamespace.use((socket, next) => {
      const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization?.split(' ')[1];
      if (!token) {
        return next(new Error('Authentication error: Token missing'));
      }

      try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET || 'super_secret_access_token_key_12345');
        socket.user = decoded; // { userId, role, username }
        next();
      } catch (err) {
        return next(new Error('Authentication error: Invalid token'));
      }
    });

    gameNamespace.on('connection', async (socket) => {
      const userId = socket.user.userId;
      const username = socket.user.username;
      
      console.log(`[Socket] User connected: ${username} (${userId}) as socket ${socket.id}`);
      
      // Store socket maps
      this.userSockets.set(userId.toString(), socket.id);
      this.socketUsers.set(socket.id, socket.user);

      // Join a private room for targeted events like wallet updates
      socket.join(`user_${userId.toString()}`);
      
      // Join role-based room for broadcasting
      const role = socket.user.role || 'player';
      socket.join(`role_${role}`);

      // Handle reconnect mapping
      if (this.activeReconnectTimers.has(userId.toString())) {
        console.log(`[Socket] Reconnect detected for user: ${username}`);
        clearTimeout(this.activeReconnectTimers.get(userId.toString()));
        this.activeReconnectTimers.delete(userId.toString());

        // Check if there was an active match
        const activeMatch = await matchRepository.findActiveByPlayerId(userId);
        if (activeMatch && activeMatch.status === 'active') {
          // Join socket to match room
          const roomName = `match_${activeMatch._id}`;
          socket.join(roomName);

          // Increment reconnect count
          activeMatch.reconnectCount += 1;
          await activeMatch.save();

          // Notify room
          gameNamespace.to(roomName).emit('player_reconnected', {
            userId,
            username
          });

          // Send current state to reconnected player
          console.log('[MATCH START DEBUG]', {
            matchId: activeMatch._id.toString(),
            playerOne: activeMatch.playerOne?._id?.toString(),
            playerTwo: activeMatch.playerTwo?._id?.toString(),
            turn: activeMatch.turn
          });
          socket.emit('match_started', {
            matchId: activeMatch._id,
            playerOne: activeMatch.playerOne,
            playerTwo: activeMatch.playerTwo,
            board: activeMatch.board,
            symbolsHistory: activeMatch.symbolsHistory,
            turn: activeMatch.turn,
            status: activeMatch.status
          });
        }
      }

      socket.on('join_queue', async (data = {}) => {
        const isCashMatch = !!data.isCashMatch;
        const betAmount = parseInt(data.betAmount) || 10;
        try {
          const profile = await userRepository.getProfileByUserId(userId);
          const rating = profile?.statistics?.rating || 1200;

          if (isCashMatch) {
            const balance = profile?.walletBalance || 0;
            if (balance < betAmount) {
              return socket.emit('error_message', `Insufficient wallet balance for Cash Battle ($${betAmount} Entry).`);
            }
          }

          // Remove any existing timers or queue presence
          matchmakingService.removeFromQueue(userId);

          // Add to matchmaking queue
          matchmakingService.addToQueue(userId, socket.id, username, rating, isCashMatch, betAmount);
          socket.emit('queue_joined', { userId, username, rating, isCashMatch, betAmount });

          // Run pairing check
          const matchResult = matchmakingService.findMatches();
          if (matchResult) {
            const { p1, p2, isCashMatch: matchIsCash } = matchResult;
            
            const pendingDetails = await matchmakingService.createPendingMatch(p1, p2, matchIsCash);
            const { match, p1SocketId, p2SocketId } = pendingDetails;

            const roomName = `match_${match._id}`;

            // Join sockets to match room
            const s1 = gameNamespace.sockets.get(p1SocketId);
            const s2 = gameNamespace.sockets.get(p2SocketId);

            if (s1) s1.join(roomName);
            if (s2) s2.join(roomName);

            // Broadcast match found to room
            gameNamespace.to(roomName).emit('match_found', {
              matchId: match._id,
              playerOne: { userId: p1.userId, username: p1.username, rating: p1.rating },
              playerTwo: { userId: p2.userId, username: p2.username, rating: p2.rating },
              expiresAt: match.acceptance.expiresAt
            });

            // Set timeout for acceptance expiry (15s)
            const timeoutId = setTimeout(async () => {
              await this.handleAcceptanceTimeout(match._id, gameNamespace);
            }, 16 * 1000);

            matchmakingService.addPendingMatchTimeout(match._id, timeoutId);
          }
        } catch (err) {
          socket.emit('error_message', err.message);
        }
      });

      socket.on('cancel_queue', () => {
        matchmakingService.removeFromQueue(userId);
        socket.emit('queue_cancelled');
      });

      // 2. Acceptance Events
      socket.on('match_accept', async (data) => {
        const { matchId } = data;
        try {
          const match = await matchmakingService.acceptMatch(matchId, userId);
          const roomName = `match_${matchId}`;

          if (match.status === 'active') {
            console.log(`[Match] Match ${matchId} started!`);
            console.log('[MATCH START DEBUG]', {
              matchId: match._id.toString(),
              playerOne: match.playerOne?._id?.toString(),
              playerTwo: match.playerTwo?._id?.toString(),
              turn: match.turn
            });
            gameNamespace.to(roomName).emit('match_started', {
              matchId: match._id,
              playerOne: match.playerOne,
              playerTwo: match.playerTwo,
              board: match.board,
              symbolsHistory: match.symbolsHistory,
              turn: match.turn,
              status: match.status
            });

            // Start turn timer
            this.startTurnTimer(match._id, gameNamespace);
          } else {
            // Broadcast acceptance state
            gameNamespace.to(roomName).emit('match_accepted_status', {
              playerOneAccepted: match.acceptance.playerOneAccepted,
              playerTwoAccepted: match.acceptance.playerTwoAccepted
            });
          }
        } catch (err) {
          socket.emit('error_message', err.message);
        }
      });

      socket.on('match_decline', async (data) => {
        const { matchId } = data;
        await this.cancelMatchOnDecline(matchId, userId, gameNamespace);
      });

      // 3. Gameplay Event
      socket.on('player_move', async (data) => {
        const { matchId, position } = data;
        const roomName = `match_${matchId}`;
        try {
          // Clear current turn timer
          this.stopTurnTimer(matchId);

          const result = await gameService.makeMove(matchId, userId, position);
          
          // Broadcast successful move
          gameNamespace.to(roomName).emit('move_accepted', {
            board: result.match.board,
            symbolsHistory: result.match.symbolsHistory,
            turn: result.match.turn,
            totalMoves: result.match.totalMoves,
            removedPosition: result.removedPosition
          });

          // If game finished, broadcast finish
          if (result.match.status === 'finished') {
            const MatchSettlement = require('../models/MatchSettlement');
            let settlementAmount = null;
            let lossAmount = null;
            if (result.match.isCashMatch) {
              const settlement = await MatchSettlement.findOne({ matchId: result.match._id });
              if (settlement) {
                settlementAmount = settlement.winnerPayout;
                lossAmount = settlement.baseBetAmount;
              }
            }

            gameNamespace.to(roomName).emit('match_finished', {
              matchId: result.match._id,
              winner: result.winner,
              result: result.result,
              duration: result.match.duration,
              isCashMatch: result.match.isCashMatch,
              winnerPayout: settlementAmount,
              loserAmount: lossAmount
            });
          } else {
            // Start turn timer for new player turn
            this.startTurnTimer(matchId, gameNamespace);
          }
        } catch (err) {
          if (err.message === 'not-your-turn') {
            socket.emit('not-your-turn', { message: "It's not your turn!" });
          } else {
            socket.emit('move_rejected', { message: err.message });
          }
          // Restart turn timer since move was rejected
          this.startTurnTimer(matchId, gameNamespace);
        }
      });

      socket.on('leave_match', async (data) => {
        const { matchId } = data;
        const roomName = `match_${matchId}`;
        try {
          this.stopTurnTimer(matchId);
          const match = await gameService.handleForfeit(matchId, userId, 'forfeit');
          if (match) {
            const MatchSettlement = require('../models/MatchSettlement');
            let settlementAmount = null;
            let lossAmount = null;
            if (match.isCashMatch) {
              const settlement = await MatchSettlement.findOne({ matchId: match._id });
              if (settlement) {
                settlementAmount = settlement.winnerPayout;
                lossAmount = settlement.baseBetAmount;
              }
            }
            gameNamespace.to(roomName).emit('match_finished', {
              matchId: match._id,
              winner: match.winner,
              result: match.result,
              duration: match.duration,
              isCashMatch: match.isCashMatch,
              winnerPayout: settlementAmount,
              loserAmount: lossAmount
            });
          }
        } catch (err) {
          socket.emit('error_message', err.message);
        }
      });

      socket.on('ping', () => {
        socket.emit('pong');
      });

      // Disconnect lifecycle
      socket.on('disconnect', async () => {
        console.log(`[Socket] User disconnected: ${username} (${userId})`);
        
        // Remove from mappings
        this.socketUsers.delete(socket.id);
        if (this.userSockets.get(userId.toString()) === socket.id) {
          this.userSockets.delete(userId.toString());
        }

        // Remove from queue
        matchmakingService.removeFromQueue(userId);

        // Check if user was in an active match
        const activeMatch = await matchRepository.findActiveByPlayerId(userId);
        if (activeMatch && activeMatch.status === 'active') {
          const roomName = `match_${activeMatch._id}`;

          // Increment disconnect count
          activeMatch.disconnectCount += 1;
          await activeMatch.save();

          // Inform opponent
          gameNamespace.to(roomName).emit('player_disconnected', {
            userId,
            username,
            reconnectTimeout: 20 // 20 seconds to reconnect
          });

          // Set reconnect timeout
          const reconnectTimeoutId = setTimeout(async () => {
            console.log(`[Match] Reconnect timeout expired for user: ${username}`);
            this.activeReconnectTimers.delete(userId.toString());

            // Stop turn timers
            this.stopTurnTimer(activeMatch._id);

            // Handle forfeit
            const finishedMatch = await gameService.handleForfeit(activeMatch._id, userId, 'disconnect');
            if (finishedMatch) {
              const MatchSettlement = require('../models/MatchSettlement');
              let settlementAmount = null;
              let lossAmount = null;
              if (finishedMatch.isCashMatch) {
                const settlement = await MatchSettlement.findOne({ matchId: finishedMatch._id });
                if (settlement) {
                  settlementAmount = settlement.winnerPayout;
                  lossAmount = settlement.baseBetAmount;
                }
              }
              gameNamespace.to(roomName).emit('match_finished', {
                matchId: finishedMatch._id,
                winner: finishedMatch.winner,
                result: finishedMatch.result,
                duration: finishedMatch.duration,
                isCashMatch: finishedMatch.isCashMatch,
                winnerPayout: settlementAmount,
                loserAmount: lossAmount
              });
            }
          }, 20 * 1000);

          this.activeReconnectTimers.set(userId.toString(), reconnectTimeoutId);
        }
      });
    });
  }

  async handleAcceptanceTimeout(matchId, namespace) {
    const match = await matchRepository.findById(matchId);
    if (!match || match.status !== 'pending_accept') return;

    match.status = 'cancelled';
    match.result = 'draw'; // Cancelled due to timeout
    await match.save();

    const roomName = `match_${matchId}`;
    namespace.to(roomName).emit('match_cancelled', {
      reason: 'acceptance_timeout',
      playerOneAccepted: match.acceptance.playerOneAccepted,
      playerTwoAccepted: match.acceptance.playerTwoAccepted
    });

    matchmakingService.clearPendingMatch(matchId);
  }

  async cancelMatchOnDecline(matchId, decliningPlayerId, namespace) {
    const match = await matchRepository.findById(matchId);
    if (!match || match.status !== 'pending_accept') return;

    match.status = 'cancelled';
    match.result = 'draw';
    await match.save();

    const roomName = `match_${matchId}`;
    namespace.to(roomName).emit('match_cancelled', {
      reason: 'player_declined',
      declinedBy: decliningPlayerId
    });

    matchmakingService.clearPendingMatch(matchId);
  }

  // Turn Timer Helpers
  startTurnTimer(matchId, namespace) {
    this.stopTurnTimer(matchId);

    const roomName = `match_${matchId}`;
    let timeLeft = 30; // 30 seconds turn time

    // Initial broadcast
    namespace.to(roomName).emit('timer_update', { timeLeft });

    const intervalId = setInterval(async () => {
      timeLeft -= 1;
      namespace.to(roomName).emit('timer_update', { timeLeft });

      if (timeLeft <= 0) {
        clearInterval(intervalId);
        this.activeTurnTimers.delete(matchId.toString());

        console.log(`[Timer] Turn timeout for match: ${matchId}`);
        // Fetch match to see whose turn it was
        const match = await matchRepository.findById(matchId);
        if (match && match.status === 'active') {
          // Current turn player loses
          const forfeitPlayerId = match.turn === 'X' ? match.playerOne._id : match.playerTwo._id;
          const finishedMatch = await gameService.handleForfeit(matchId, forfeitPlayerId, 'timeout');
          if (finishedMatch) {
            const MatchSettlement = require('../models/MatchSettlement');
            let settlementAmount = null;
            let lossAmount = null;
            if (finishedMatch.isCashMatch) {
              const settlement = await MatchSettlement.findOne({ matchId: finishedMatch._id });
              if (settlement) {
                settlementAmount = settlement.winnerPayout;
                lossAmount = settlement.baseBetAmount;
              }
            }
            namespace.to(roomName).emit('match_finished', {
              matchId: finishedMatch._id,
              winner: finishedMatch.winner,
              result: finishedMatch.result,
              duration: finishedMatch.duration,
              isCashMatch: finishedMatch.isCashMatch,
              winnerPayout: settlementAmount,
              loserAmount: lossAmount
            });
          }
        }
      }
    }, 1000);

    this.activeTurnTimers.set(matchId.toString(), { intervalId, timeLeft });
  }

  stopTurnTimer(matchId) {
    const timer = this.activeTurnTimers.get(matchId.toString());
    if (timer) {
      clearInterval(timer.intervalId);
      this.activeTurnTimers.delete(matchId.toString());
    }
  }
}

module.exports = new SocketService();
