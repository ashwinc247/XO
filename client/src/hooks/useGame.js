import { useState, useEffect } from "react";
import useSocket from "./useSocket";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { toast } from "react-hot-toast";

const normalizeId = (id) => {
  if (!id) return null;
  if (typeof id === "object" && id.toString) {
    return id.toString();
  }
  return String(id);
};

export const useGame = () => {
  const { socket, matchId, setMatchId } = useSocket();
  const { user } = useAuth();
  const [board, setBoard] = useState(Array(9).fill(null));
  const [symbolsHistory, setSymbolsHistory] = useState({ X: [], O: [] });
  const [turn, setTurn] = useState(null);
  const [status, setStatus] = useState("pending_accept");
  const [playerOne, setPlayerOne] = useState(null);
  const [playerTwo, setPlayerTwo] = useState(null);
  const [winner, setWinner] = useState(null);
  const [result, setResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(30);
  const [opponentDisconnected, setOpponentDisconnected] = useState(false);
  const [reconnectTimeLeft, setReconnectTimeLeft] = useState(0);
  const [isCashMatch, setIsCashMatch] = useState(false);
  const [winnerPayout, setWinnerPayout] = useState(null);
  const [loserAmount, setLoserAmount] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleMatchStarted = (data) => {
      console.log("[Socket] Match started:", data);
      console.log('[CLIENT MATCH DEBUG]', {
        myUserId: user?._id || user?.id,
        playerOneId: data.playerOne?._id || data.playerOne,
        playerTwoId: data.playerTwo?._id || data.playerTwo,
        turn: data.turn
      });
      setBoard(data.board);
      setSymbolsHistory(data.symbolsHistory || { X: [], O: [] });
      setTurn(data.turn);
      setStatus(data.status);
      setPlayerOne(data.playerOne);
      setPlayerTwo(data.playerTwo);
      setWinner(null);
      setResult(null);
      setOpponentDisconnected(false);
      setReconnectTimeLeft(0);
      setIsCashMatch(data.isCashMatch || false);
      setWinnerPayout(null);
      setLoserAmount(null);
      setMatchId(data.matchId);
    };

    const handleMoveAccepted = (data) => {
      console.log("[Socket] Move accepted:", data);
      setBoard(data.board);
      setSymbolsHistory(data.symbolsHistory || { X: [], O: [] });
      setTurn(data.turn);
    };

    const handleMoveRejected = (data) => {
      console.error("[Socket] Move rejected:", data.message);
      toast.error(data.message || "Invalid move!");
    };

    const handleNotYourTurn = (data) => {
      console.error("[Socket] Not your turn:", data.message);
      toast.error(data.message || "It's not your turn!");
    };

    const handleTimerUpdate = (data) => {
      setTimeLeft(data.timeLeft);
    };

    const handleMatchFinished = (data) => {
      console.log("[Socket] Match finished:", data);
      setStatus("finished");
      setWinner(data.winner);
      setResult(data.result);
      setOpponentDisconnected(false);
      if (data.isCashMatch !== undefined) {
        setIsCashMatch(data.isCashMatch);
        setWinnerPayout(data.winnerPayout);
        setLoserAmount(data.loserAmount);
      }
    };

    const handlePlayerDisconnected = (data) => {
      console.log("[Socket] Opponent disconnected:", data);
      setOpponentDisconnected(true);
      setReconnectTimeLeft(data.reconnectTimeout);
      toast.error(`${data.username} disconnected. Waiting for reconnect...`);
    };

    const handlePlayerReconnected = (data) => {
      console.log("[Socket] Opponent reconnected:", data);
      setOpponentDisconnected(false);
      setReconnectTimeLeft(0);
      toast.success(`${data.username} reconnected!`);
    };

    const handleErrorMessage = (message) => {
      toast.error(message);
    };

    socket.on("match_started", handleMatchStarted);
    socket.on("move_accepted", handleMoveAccepted);
    socket.on("move_rejected", handleMoveRejected);
    socket.on("timer_update", handleTimerUpdate);
    socket.on("match_finished", handleMatchFinished);
    socket.on("player_disconnected", handlePlayerDisconnected);
    socket.on("player_reconnected", handlePlayerReconnected);
    socket.on("error_message", handleErrorMessage);
    socket.on("not-your-turn", handleNotYourTurn);

    // Latency fetch or match status logic can be initialized here
    // Let's ask server for current match state if reconnecting
    socket.emit("ping");

    return () => {
      socket.off("match_started", handleMatchStarted);
      socket.off("move_accepted", handleMoveAccepted);
      socket.off("move_rejected", handleMoveRejected);
      socket.off("timer_update", handleTimerUpdate);
      socket.off("match_finished", handleMatchFinished);
      socket.off("player_disconnected", handlePlayerDisconnected);
      socket.off("player_reconnected", handlePlayerReconnected);
      socket.off("error_message", handleErrorMessage);
      socket.off("not-your-turn", handleNotYourTurn);
    };
  }, [socket, setMatchId, user]);

  // Fetch match state if we have matchId but no local state (e.g. after navigating from matchmaking)
  useEffect(() => {
    if (matchId && !playerOne) {
      api.get(`/match/details/${matchId}`)
        .then(res => {
          if (res.data.success) {
            const match = res.data.data.match;
            setBoard(match.board);
            setSymbolsHistory(match.symbolsHistory || { X: [], O: [] });
            setTurn(match.turn);
            setStatus(match.status);
            setPlayerOne(match.playerOne);
            setPlayerTwo(match.playerTwo);
            setWinner(match.winner);
            setResult(match.result);
            setIsCashMatch(match.isCashMatch || false);
            // On reload from api, we won't have exact payout here unless returned, but for popup it doesn't matter much since popup triggers on match_finished
          }
        })
        .catch(err => {
          console.error("Failed to fetch match details:", err);
        });
    }
  }, [matchId, playerOne]);

  // Reconnect countdown timer helper
  useEffect(() => {
    if (!opponentDisconnected || reconnectTimeLeft <= 0) return;
    const timer = setInterval(() => {
      setReconnectTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [opponentDisconnected, reconnectTimeLeft]);

  const makeMove = (position) => {
    if (socket && matchId) {
      socket.emit("player_move", { matchId, position });
    }
  };

  const leaveMatch = () => {
    if (socket && matchId) {
      socket.emit("leave_match", { matchId });
    }
  };

  const myUserId = normalizeId(user?._id || user?.id);
  const p1Id = normalizeId(
    typeof playerOne === "object" && playerOne !== null
      ? playerOne._id || playerOne.id
      : playerOne
  );

  const mySymbol = myUserId && p1Id && myUserId === p1Id ? "X" : "O";
  const opponentSymbol = mySymbol === "X" ? "O" : "X";
  const isMyTurn = turn === mySymbol;

  // Determine if a position is the oldest symbol for a player
  const getOldestSymbolPosition = (symbol) => {
    const list = symbolsHistory[symbol];
    return list && list.length >= 3 ? list[0] : null;
  };

  const myOldestPosition = getOldestSymbolPosition(mySymbol);
  const opponentOldestPosition = getOldestSymbolPosition(opponentSymbol);

  return {
    board,
    symbolsHistory,
    turn,
    status,
    playerOne,
    playerTwo,
    winner,
    result,
    timeLeft,
    opponentDisconnected,
    reconnectTimeLeft,
    isCashMatch,
    winnerPayout,
    loserAmount,
    makeMove,
    leaveMatch,
    isMyTurn,
    mySymbol,
    opponentSymbol,
    myOldestPosition,
    opponentOldestPosition,
    matchId,
    setMatchId,
  };
};
