import { useState, useEffect } from "react";
import useSocket from "./useSocket";
import { toast } from "react-hot-toast";

export const useMatch = () => {
  const { socket, setMatchId } = useSocket();
  const [isQueued, setIsQueued] = useState(false);
  const [pendingMatch, setPendingMatch] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleQueueJoined = (data) => {
      console.log("[Socket] Joined matchmaking queue:", data);
      setIsQueued(true);
      toast.success("Joined matchmaking queue!");
    };

    const handleQueueCancelled = () => {
      console.log("[Socket] Queue cancelled");
      setIsQueued(false);
      toast.success("Left matchmaking queue.");
    };

    const handleMatchFound = (data) => {
      console.log("[Socket] Match found:", data);
      setIsQueued(false);
      setPendingMatch(data);
      setMatchId(data.matchId);
    };

    const handleMatchCancelled = (data) => {
      console.log("[Socket] Match cancelled:", data);
      setPendingMatch(null);
      setMatchId(null);
      if (data.reason === "acceptance_timeout") {
        toast.error("Match request expired.");
      } else if (data.reason === "player_declined") {
        toast.error("A player declined the match.");
      } else {
        toast.error("Match was cancelled.");
      }
    };

    socket.on("queue_joined", handleQueueJoined);
    socket.on("queue_cancelled", handleQueueCancelled);
    socket.on("match_found", handleMatchFound);
    socket.on("match_cancelled", handleMatchCancelled);

    return () => {
      socket.off("queue_joined", handleQueueJoined);
      socket.off("queue_cancelled", handleQueueCancelled);
      socket.off("match_found", handleMatchFound);
      socket.off("match_cancelled", handleMatchCancelled);
    };
  }, [socket, setMatchId]);

  const joinQueue = (isCashMatch = false, betAmount = 10) => {
    if (socket) {
      socket.emit("join_queue", { isCashMatch, betAmount });
    }
  };

  const cancelQueue = () => {
    if (socket) {
      socket.emit("cancel_queue");
    }
  };

  const acceptMatch = (matchId) => {
    if (socket) {
      socket.emit("match_accept", { matchId });
    }
  };

  const declineMatch = (matchId) => {
    if (socket) {
      socket.emit("match_decline", { matchId });
    }
  };

  return {
    isQueued,
    pendingMatch,
    setPendingMatch,
    joinQueue,
    cancelQueue,
    acceptMatch,
    declineMatch,
  };
};
