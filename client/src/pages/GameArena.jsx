import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useGame } from "../hooks/useGame";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Swords, LogOut, AlertTriangle, Clock } from "lucide-react";
import { toast } from "react-hot-toast";
import { Confetti } from "../components/magicui/confetti";
import { useRef } from "react";

export const GameArena = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const {
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
    makeMove,
    leaveMatch,
    isMyTurn,
    mySymbol,
    opponentSymbol,
    myOldestPosition,
    opponentOldestPosition,
    matchId,
    setMatchId,
    isCashMatch,
    winnerPayout,
    loserAmount,
  } = useGame();

  const [isLeaveModalOpen, setIsLeaveModalOpen] = useState(false);
  const confettiRef = useRef(null);
  const celebrationTriggeredRef = useRef(false);

  // Reset celebration guard when match changes
  useEffect(() => {
    celebrationTriggeredRef.current = false;
  }, [matchId]);

  // Redirect to match selector if game is cancelled or no matchId
  useEffect(() => {
    if (status === "cancelled") {
      toast.error("Match was cancelled or aborted.");
      navigate("/match");
    }
  }, [status, navigate]);

  const handleCellClick = (index) => {
    if (!isMyTurn) {
      toast.error("It's not your turn!");
      return;
    }
    if (board[index] !== null) {
      toast.error("Cell is already occupied!");
      return;
    }
    makeMove(index);
  };

  const handleForfeit = () => {
    leaveMatch();
    setIsLeaveModalOpen(false);
  };

  const handleReturnHome = () => {
    setMatchId(null);
    navigate("/home");
  };

  const handlePlayAgain = () => {
    setMatchId(null);
    navigate("/match", {
      state: {
        autoJoin: true,
        isCashMatch,
        betAmount: loserAmount || 10
      }
    });
  };

  // Determine game results text
  const getOutcomeDetails = () => {
    if (status !== "finished") return { title: "", desc: "" };

    const myUserId = user?._id || user?.id;
    let normalizedWinner = winner;
    if (winner && typeof winner === 'object') {
      normalizedWinner = winner._id || winner.id || winner.toString();
    }
    
    // Ensure strict string comparison
    const isWinnerMe = String(normalizedWinner) === String(myUserId);
    const isWinnerOpponent = normalizedWinner && String(normalizedWinner) !== String(myUserId);

    if (isWinnerMe) {
      let desc = "You defeated your opponent in battle!";
      if (result?.includes("disconnect"))
        desc = "Opponent forfeited by disconnecting.";
      if (result?.includes("timeout")) desc = "Opponent ran out of time.";
      if (result?.includes("forfeit")) desc = "Opponent resigned.";
      return { title: "VICTORY!", desc, isWin: true };
    } else if (isWinnerOpponent) {
      let desc = "Your opponent defeated you.";
      if (result?.includes("disconnect"))
        desc = "You were marked as disconnected.";
      if (result?.includes("timeout")) desc = "You ran out of time.";
      if (result?.includes("forfeit")) desc = "You forfeited the match.";
      return { title: "DEFEAT", desc, isLoss: true };
    } else {
      return {
        title: "DRAW",
        desc: "The match ended in a draw.",
        isDraw: true,
      };
    }
  };

  const outcome = getOutcomeDetails();

  // Trigger Confetti on Win
  useEffect(() => {
    if (status === "finished" && outcome.isWin && isCashMatch && !celebrationTriggeredRef.current) {
      const storageKey = `confetti_triggered_${matchId}`;
      if (matchId && !localStorage.getItem(storageKey)) {
        celebrationTriggeredRef.current = true;
        localStorage.setItem(storageKey, "true");
        // Small delay to let modal render first
        setTimeout(() => {
          confettiRef.current?.fire({
            particleCount: 150,
            spread: 80,
            origin: { y: 0.6 },
          });
        }, 300);
      }
    }
  }, [status, outcome.isWin, isCashMatch, matchId]);

  const isUserPlayerOne = user?._id === playerOne?._id;
  const opponent = isUserPlayerOne ? playerTwo : playerOne;

  return (
    <div className="flex flex-col h-[calc(100vh-3rem)] max-w-lg mx-auto w-full pt-2 pb-4 px-4 overflow-hidden relative">
      
      {/* HUD: Opponent (Left) - Timer (Center) - You (Right) */}
      <div className="flex justify-between items-center mb-6 mt-2">
        {/* Opponent Top-Left */}
        <div className={`flex items-center gap-3 p-2 pr-4 rounded-full bg-slate-900 border transition-all ${turn === opponentSymbol ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-500/10' : 'border-slate-800'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${opponentSymbol === 'X' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40' : 'bg-purple-600/20 text-purple-400 border-purple-500/40'} border`}>
            {opponentSymbol}
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-bold text-slate-200 truncate max-w-[90px]">{opponent?.username || 'Opponent'}</span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Opponent</span>
          </div>
        </div>

        {/* Timer Center */}
        <div className="flex flex-col items-center justify-center">
          <div className={`w-14 h-14 rounded-full border-4 flex items-center justify-center text-xl font-black ${timeLeft <= 5 ? 'border-rose-500 text-rose-500 animate-pulse' : 'border-slate-700 text-slate-300'} bg-slate-900 shadow-xl`}>
            {timeLeft}
          </div>
        </div>

        {/* You Top-Right */}
        <div className={`flex items-center gap-3 p-2 pl-4 rounded-full bg-slate-900 border transition-all flex-row-reverse ${turn === mySymbol ? 'border-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.3)] bg-emerald-500/10' : 'border-slate-800'}`}>
          <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-lg ${mySymbol === 'X' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/40' : 'bg-purple-600/20 text-purple-400 border-purple-500/40'} border`}>
            {mySymbol}
          </div>
          <div className="flex flex-col items-end">
            <span className="text-sm font-bold text-slate-200 truncate max-w-[90px]">You</span>
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{user?.username}</span>
          </div>
        </div>
      </div>

      {/* Disconnect Banner */}
      {opponentDisconnected && (
        <div className="bg-rose-500/10 border border-rose-500/25 text-rose-400 p-3 rounded-xl flex items-center justify-center gap-2 animate-pulse text-xs font-bold mb-4">
          <AlertTriangle size={14} />
          <span>Opponent disconnected! Forfeit in {reconnectTimeLeft}s</span>
        </div>
      )}

      {/* Center Action Text */}
      <div className="text-center mb-6">
        {isMyTurn ? (
          <span className="text-lg font-black tracking-widest text-emerald-400 drop-shadow-[0_0_8px_rgba(52,211,153,0.5)] animate-pulse">
            YOUR TURN
          </span>
        ) : (
          <span className="text-sm font-bold tracking-widest text-slate-500 uppercase">
            Wait for Opponent
          </span>
        )}
      </div>

      {/* Board Container */}
      <div className="flex-1 flex flex-col justify-center items-center px-2">
        <div className="grid grid-cols-3 gap-3 bg-slate-900 border border-slate-800 p-3.5 rounded-2xl w-full max-w-[340px] aspect-square shadow-2xl relative">
          {board.map((cell, index) => {
            const isOldestMe = index === myOldestPosition;
            const isOldestOpponent = index === opponentOldestPosition;
            const isOldest = isOldestMe || isOldestOpponent;

            let oldestWarningStyle = "";
            if (isOldestMe) {
              oldestWarningStyle = "animate-pulse bg-indigo-950/20 border border-amber-500/30 opacity-50";
            } else if (isOldestOpponent) {
              oldestWarningStyle = "animate-pulse bg-purple-950/20 border border-amber-500/20 opacity-50";
            }

            return (
              <div
                key={index}
                onClick={() => handleCellClick(index)}
                className={`bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-center font-black cursor-pointer select-none transition-all hover:bg-slate-850 text-4xl sm:text-5xl aspect-square relative shadow-inner ${oldestWarningStyle}`}
              >
                {cell === "X" ? (
                  <span className="text-indigo-400 drop-shadow-[0_0_10px_rgba(129,140,248,0.5)]">X</span>
                ) : cell === "O" ? (
                  <span className="text-purple-400 drop-shadow-[0_0_10px_rgba(192,132,252,0.5)]">O</span>
                ) : null}

                {isOldest && (
                  <span className="absolute bottom-1 right-1.5 text-[9px] font-black text-amber-500 uppercase tracking-widest leading-none select-none">
                    Fade
                  </span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Bottom Controls */}
      <div className="mt-auto pt-6 pb-2 flex justify-center">
        <Button
          variant="danger"
          size="md"
          className="flex items-center gap-2 cursor-pointer bg-slate-900 border border-rose-500/30 text-rose-400 hover:bg-rose-500/10 rounded-full px-6 py-2"
          onClick={() => setIsLeaveModalOpen(true)}
        >
          <LogOut size={14} />
          <span className="font-bold text-sm tracking-wide">Forfeit Match</span>
        </Button>
      </div>

      {/* Modal: Confirm Forfeit */}
      <Modal
        isOpen={isLeaveModalOpen}
        onClose={() => setIsLeaveModalOpen(false)}
        title="Forfeit Match?"
      >
        <div className="space-y-4">
          <p className="text-sm text-slate-400 leading-relaxed text-center">
            Are you sure you want to resign this match? Leaving will count as a direct defeat.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <Button variant="secondary" onClick={() => setIsLeaveModalOpen(false)} className="cursor-pointer flex-1">
              Cancel
            </Button>
            <Button variant="danger" onClick={handleForfeit} className="cursor-pointer flex-1">
              Yes, Forfeit
            </Button>
          </div>
        </div>
      </Modal>

      {/* Modal: Match Finished */}
      <Modal
        isOpen={status === "finished"}
        onClose={() => {}}
        title="Match Completed"
        closeOnOverlayClick={false}
      >
        <div className="space-y-6 text-center">
          <div className="py-4">
            <span
              className={`block text-4xl font-black tracking-widest ${
                outcome.isWin
                  ? "text-emerald-400 drop-shadow-[0_0_15px_rgba(52,211,153,0.4)]"
                  : outcome.isLoss
                    ? "text-rose-500 drop-shadow-[0_0_15px_rgba(244,63,94,0.4)]"
                    : "text-slate-400"
              }`}
            >
              {outcome.title}
            </span>

            {/* CASH MATCH RESULT AMOUNT */}
            {isCashMatch && status === "finished" && (
              <div className="mt-4 flex justify-center">
                {outcome.isWin && winnerPayout !== null && (
                  <span className="text-4xl sm:text-5xl font-black text-emerald-400 drop-shadow-[0_0_10px_rgba(52,211,153,0.6)]">
                    +₹{winnerPayout.toFixed(2)}
                  </span>
                )}
                {outcome.isLoss && loserAmount !== null && (
                  <span className="text-4xl sm:text-5xl font-black text-rose-500 drop-shadow-[0_0_10px_rgba(244,63,94,0.6)]">
                    -₹{loserAmount.toFixed(2)}
                  </span>
                )}
              </div>
            )}

            <p className="mt-3 text-sm font-semibold text-slate-400 max-w-xs mx-auto">
              {outcome.desc}
            </p>
          </div>

          <div className="pt-2 flex flex-col gap-3">
            <Button variant="primary" onClick={handlePlayAgain} className="w-full cursor-pointer py-3 text-lg font-bold shadow-lg shadow-indigo-500/20">
              Play Again
            </Button>
            <Button variant="secondary" onClick={handleReturnHome} className="w-full cursor-pointer py-3 text-lg font-bold border-slate-700 text-slate-300">
              Return to Arena
            </Button>
          </div>
        </div>
      </Modal>

      {/* Magic UI Confetti Canvas */}
      <Confetti
        ref={confettiRef}
        manualstart={true}
        className="fixed top-0 left-0 w-screen h-screen z-[100] pointer-events-none"
      />
    </div>
  );
};

export default GameArena;
