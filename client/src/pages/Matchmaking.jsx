import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useMatch } from "../hooks/useMatch";
import { useGame } from "../hooks/useGame";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { Modal } from "../components/common/Modal";
import { Swords, X, Trophy } from "lucide-react";

export const Matchmaking = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const {
    isQueued,
    pendingMatch,
    joinQueue,
    cancelQueue,
    acceptMatch,
    declineMatch,
    setPendingMatch,
  } = useMatch();
  const { status } = useGame();

  const [searchSeconds, setSearchSeconds] = useState(0);
  const [acceptSecondsLeft, setAcceptSecondsLeft] = useState(15);
  const [hasAccepted, setHasAccepted] = useState(false);
  const [isCashMatch, setIsCashMatch] = useState(false);
  const [betAmount, setBetAmount] = useState(10);

  // Redirection when match starts
  useEffect(() => {
    if (status === "active") {
      navigate("/game");
    }
  }, [status, navigate]);

  // Handle auto-join from "Play Again" button
  useEffect(() => {
    if (location.state?.autoJoin && !isQueued && !pendingMatch) {
      const stateCashMatch = location.state.isCashMatch || false;
      const stateBetAmount = location.state.betAmount || 10;

      setIsCashMatch(stateCashMatch);
      setBetAmount(stateBetAmount);

      // Clear the state so a page refresh doesn't auto-join again
      window.history.replaceState({}, document.title);

      // Join immediately
      joinQueue(stateCashMatch, stateBetAmount);
    }
  }, [location.state, isQueued, pendingMatch, joinQueue]);

  // Match search timer countdown
  useEffect(() => {
    if (!isQueued) {
      setSearchSeconds(0);
      return;
    }
    const timer = setInterval(() => {
      setSearchSeconds((prev) => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, [isQueued]);

  // Acceptance timer countdown
  useEffect(() => {
    if (!pendingMatch) {
      setAcceptSecondsLeft(15);
      setHasAccepted(false);
      return;
    }

    const expiresAt = new Date(pendingMatch.expiresAt).getTime();
    const updateCountdown = () => {
      const remaining = Math.max(
        0,
        Math.round((expiresAt - Date.now()) / 1000),
      );
      setAcceptSecondsLeft(remaining);
    };

    updateCountdown();
    const interval = setInterval(updateCountdown, 1000);
    return () => clearInterval(interval);
  }, [pendingMatch]);

  const handleJoin = () => {
    joinQueue(isCashMatch, betAmount);
  };

  const handleCancel = () => {
    cancelQueue();
  };

  const handleAccept = () => {
    if (pendingMatch) {
      acceptMatch(pendingMatch.matchId);
      setHasAccepted(true);
    }
  };

  const handleDecline = () => {
    if (pendingMatch) {
      declineMatch(pendingMatch.matchId);
      setPendingMatch(null);
    }
  };

  const formatSearchTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="max-w-md mx-auto py-12 space-y-6">
      <Card className="text-center p-8 flex flex-col items-center gap-6 w-full max-w-sm mx-auto">
        <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400 mx-auto">
          <Swords size={28} />
        </div>

        {!isQueued ? (
          <div className="space-y-5 w-full">
            <h1 className="text-2xl font-black text-white">Find Opponent</h1>
            <p className="text-sm text-slate-400 max-w-xs mx-auto">
              Join the matchmaking pool. We will pair you with an active player
              close to your rating.
            </p>

            {/* Mode selection */}
            <div className="flex gap-2 p-1 bg-slate-950 border border-slate-850 rounded-xl w-full">
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${!isCashMatch
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
                onClick={() => setIsCashMatch(false)}
              >
                Ranked
              </button>
              <button
                type="button"
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${isCashMatch
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-400 hover:text-slate-200"
                  }`}
                onClick={() => setIsCashMatch(true)}
              >
                Cash
              </button>
            </div>

            {isCashMatch && (
              <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-850 rounded-xl w-full">
                <span className="text-sm font-bold text-slate-300">Bet Amount</span>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    className="w-8 h-8 rounded bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition cursor-pointer"
                    onClick={() => setBetAmount(prev => Math.max(10, prev - 10))}
                  >
                    -
                  </button>
                  <span className="text-lg font-black text-indigo-400 w-12 text-center">₹{betAmount}</span>
                  <button
                    type="button"
                    className="w-8 h-8 rounded bg-slate-800 text-white font-bold flex items-center justify-center hover:bg-slate-700 transition cursor-pointer"
                    onClick={() => setBetAmount(prev => Math.min(200, prev + 10))}
                  >
                    +
                  </button>
                </div>
              </div>
            )}

            <Button
              size="lg"
              className="w-full flex items-center justify-center gap-2 cursor-pointer mt-2"
              onClick={handleJoin}
            >
              <Swords size={16} />
              <span>Enter Matchmaking</span>
            </Button>
          </div>
        ) : (
          <div className="space-y-6 w-full">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400/20 opacity-75"></span>
              <div className="relative w-16 h-16 rounded-full border-4 border-indigo-500/20 border-t-indigo-500 animate-spin"></div>
              <Swords size={20} className="absolute text-indigo-400" />
            </div>

            <div className="space-y-1.5">
              <h2 className="text-xl font-extrabold text-white">
                Searching for Match...
              </h2>
              <span className="block text-indigo-400 font-black text-lg">
                {formatSearchTime(searchSeconds)}
              </span>
              <p className="text-xs text-slate-500">
                Matching you with ELO-appropriate active fighters
              </p>
            </div>

            <Button
              variant="secondary"
              className="w-full flex items-center justify-center gap-2 cursor-pointer"
              onClick={handleCancel}
            >
              <X size={14} />
              <span>Cancel Search</span>
            </Button>
          </div>
        )}
      </Card>

      {/* Match Found acceptance modal */}
      <Modal
        isOpen={!!pendingMatch}
        onClose={() => { }}
        title="Match Found!"
        closeOnOverlayClick={false}
      >
        {pendingMatch && (
          <div className="space-y-6 text-center">
            <p className="text-sm text-slate-400">
              A suitable opponent has been located. Accept the combat!
            </p>

            <div className="grid grid-cols-2 gap-4 items-center border border-slate-800 rounded-xl p-4 bg-slate-950">
              <div className="text-center space-y-1">
                <span className="block text-xs text-slate-500 uppercase tracking-wider">
                  Player 1
                </span>
                <span className="block font-bold text-slate-200 truncate">
                  {pendingMatch.playerOne.username}
                </span>
                <div className="flex items-center justify-center gap-1 text-[11px] text-indigo-400">
                  <Trophy size={10} />
                  <span>{pendingMatch.playerOne.rating} ELO</span>
                </div>
              </div>
              <div className="text-center space-y-1 border-l border-slate-800">
                <span className="block text-xs text-slate-500 uppercase tracking-wider">
                  Player 2
                </span>
                <span className="block font-bold text-slate-200 truncate">
                  {pendingMatch.playerTwo.username}
                </span>
                <div className="flex items-center justify-center gap-1 text-[11px] text-indigo-400">
                  <Trophy size={10} />
                  <span>{pendingMatch.playerTwo.rating} ELO</span>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <span className="block text-xs text-slate-400">
                Acceptance window closes in:{" "}
                <span className="font-bold text-rose-400">
                  {acceptSecondsLeft}s
                </span>
              </span>
              <div className="w-full bg-slate-800 h-1 rounded-full overflow-hidden">
                <div
                  className="bg-indigo-500 h-full transition-all duration-1000"
                  style={{ width: `${(acceptSecondsLeft / 15) * 100}%` }}
                ></div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button
                variant="secondary"
                onClick={handleDecline}
                disabled={hasAccepted}
                className="w-full cursor-pointer"
              >
                Decline
              </Button>
              <Button
                variant="primary"
                onClick={handleAccept}
                disabled={hasAccepted}
                className="w-full cursor-pointer"
              >
                {hasAccepted ? "Accepted" : "Accept Match"}
              </Button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Matchmaking;
