import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { Spinner } from "../components/common/Spinner";
import { Trophy, Play, Award, Swords, ArrowRight, User } from "lucide-react";

const fetchRecentMatches = async () => {
  const response = await api.get("/match/history?limit=5");
  return response.data.data.matches;
};

export const Home = () => {
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const { data: recentMatches, isLoading } = useQuery({
    queryKey: ["recentMatches"],
    queryFn: fetchRecentMatches,
    enabled: !!user,
  });

  const stats = profile?.statistics || {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    rating: 1200,
    winRate: 0,
  };

  const winRatePercentage = stats.gamesPlayed
    ? Math.round((stats.wins / stats.gamesPlayed) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* Welcome Hero */}
      <div className="relative overflow-hidden bg-slate-900 border border-slate-800 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2 relative z-10">
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white">
            Welcome back,{" "}
            <span className="text-indigo-400">{user?.username}</span>!
          </h1>
          <p className="text-slate-400 max-w-md text-sm">
            Enter the queue to battle opponents in authoritative 3-active-symbol
            XO matchmaking!
          </p>
        </div>
        <div className="flex-shrink-0 relative z-10">
          <Button
            size="lg"
            className="flex items-center gap-2 group cursor-pointer"
            onClick={() => navigate("/match")}
          >
            <Play size={16} fill="currentColor" />
            <span>Find a Match</span>
            <ArrowRight
              size={16}
              className="group-hover:translate-x-1 transition-transform"
            />
          </Button>
        </div>
        {/* Decorative Grid Overlay */}
        <div className="absolute right-0 bottom-0 opacity-[0.03] select-none text-[150px] font-black tracking-tighter leading-none pointer-events-none pr-8">
          XO
        </div>
      </div>

      {/* Grid of Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="flex items-center justify-between p-6">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Rating
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {stats.rating}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            <Trophy size={20} />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-6">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Matches Played
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {stats.gamesPlayed}
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-emerald-500/10 border border-emerald-500/25 flex items-center justify-center text-emerald-400">
            <Swords size={20} />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-6">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Wins / Losses
            </span>
            <span className="text-2xl font-black text-white mt-1.5 block">
              <span className="text-emerald-400">{stats.wins}</span>
              <span className="text-slate-500"> / </span>
              <span className="text-rose-400">{stats.losses}</span>
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-amber-500/10 border border-amber-500/25 flex items-center justify-center text-amber-400">
            <Award size={20} />
          </div>
        </Card>

        <Card className="flex items-center justify-between p-6">
          <div>
            <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Win Rate
            </span>
            <span className="text-3xl font-black text-white mt-1 block">
              {winRatePercentage}%
            </span>
          </div>
          <div className="w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/25 flex items-center justify-center text-purple-400">
            <User size={20} />
          </div>
        </Card>
      </div>

      {/* Main Home Sections */}
      <div className="grid grid-cols-1 gap-6">
        {/* Recent Matches */}
        <Card title="Recent Matches">
          {isLoading ? (
            <Spinner className="py-8" />
          ) : recentMatches && recentMatches.length > 0 ? (
            <div className="divide-y divide-slate-800">
              {recentMatches.map((match) => {
                const isP1 = match.playerOne?._id === user?._id;
                const opponent = isP1 ? match.playerTwo : match.playerOne;
                
                const resultLabel = match.currentUserResult?.isWinner 
                  ? "Victory" 
                  : match.currentUserResult?.isDraw 
                    ? "Draw" 
                    : "Defeat";

                const resultColor =
                  resultLabel === "Victory"
                    ? "text-emerald-400 bg-emerald-500/10 border-emerald-500/20"
                    : resultLabel === "Defeat"
                      ? "text-rose-400 bg-rose-500/10 border-rose-500/20"
                      : "text-slate-400 bg-slate-800 border-slate-700";

                const amountText = match.amount > 0 ? `+₹${match.amount.toFixed(2)}` : match.amount < 0 ? `-₹${Math.abs(match.amount).toFixed(2)}` : "";
                const amountColor = match.amount > 0 ? "text-emerald-400" : match.amount < 0 ? "text-rose-400" : "text-slate-400";

                return (
                  <div
                    key={match._id}
                    className="py-4 flex items-center justify-between first:pt-0 last:pb-0 hover:bg-slate-800/30 transition-colors px-2 -mx-2 rounded-lg"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-750 flex items-center justify-center text-slate-300 font-bold text-sm shadow-inner">
                        {opponent?.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="block font-bold text-slate-200 text-sm">
                            {opponent?.username || "Unknown"}
                          </span>
                          <span className="text-[10px] uppercase font-bold text-slate-500 bg-slate-800 px-1.5 py-0.5 rounded">Opponent</span>
                        </div>
                        <span className="block text-xs text-slate-500 font-medium tracking-wide">
                          {new Date(match.createdAt).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })} • {new Date(match.createdAt).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" })}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-6">
                      {match.amount !== undefined && match.amount !== 0 && (
                        <span className={`font-bold ${amountColor} text-sm tracking-wide`}>
                          {amountText}
                        </span>
                      )}
                      <span
                        className={`px-3 py-1 rounded border text-xs font-bold w-20 text-center uppercase tracking-wider ${resultColor}`}
                      >
                        {resultLabel}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12 text-slate-500">
              No matches played yet. Go enter the queue to play!
            </div>
          )}
        </Card>
      </div>
    </div>
  );
};

export default Home;
