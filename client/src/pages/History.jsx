import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/common/Card";
import { Spinner } from "../components/common/Spinner";
import { Button } from "../components/common/Button";
import { Swords, Clock, ChevronDown, ChevronUp } from "lucide-react";

const fetchMatchHistory = async (page) => {
  const response = await api.get(`/match/history?limit=10&page=${page}`);
  return response.data.data;
};

export const History = () => {
  const { user } = useAuth();
  const [page, setPage] = useState(1);
  const [expandedMatch, setExpandedMatch] = useState(null);

  const { data, isLoading } = useQuery({
    queryKey: ["matchHistory", page],
    queryFn: () => fetchMatchHistory(page),
    enabled: !!user,
  });

  const matches = data?.matches || [];
  const pagination = data?.pagination || { page: 1, pages: 1, total: 0 };

  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}m ${secs}s`;
  };

  const toggleExpand = (matchId) => {
    setExpandedMatch(expandedMatch === matchId ? null : matchId);
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
        Match History
      </h1>

      <Card title={`Recent Matches (${pagination.total})`}>
        {isLoading ? (
          <Spinner className="py-12" />
        ) : matches.length > 0 ? (
          <div className="space-y-3">
            {matches.map((match) => {
              const isP1 = match.playerOne?._id === user?._id;
              const opponent = isP1 ? match.playerTwo : match.playerOne;
              const mySymbol = isP1 ? 'X' : 'O';
              
              const didIWin = match.currentUserResult?.isWinner;
              const isDraw = match.currentUserResult?.isDraw;

              const statusText = didIWin ? "Victory" : isDraw ? "Draw" : "Defeat";
              const statusColor = didIWin
                ? "text-emerald-400"
                : isDraw
                  ? "text-slate-400"
                  : "text-rose-400";
              const bgColor = didIWin
                ? "bg-emerald-500/10 border-emerald-500/20"
                : isDraw
                  ? "bg-slate-800/50 border-slate-700/50"
                  : "bg-rose-500/10 border-rose-500/20";
                  
              const amountText = match.amount > 0 ? `+₹${match.amount.toFixed(2)}` : match.amount < 0 ? `-₹${Math.abs(match.amount).toFixed(2)}` : "";
              const amountColor = match.amount > 0 ? "text-emerald-400" : match.amount < 0 ? "text-rose-400" : "text-slate-400";
              const isExpanded = expandedMatch === match._id;

              return (
                <div key={match._id} className={`border rounded-xl transition-all ${bgColor} overflow-hidden`}>
                  {/* Summary Header (Always Visible) */}
                  <div 
                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                    onClick={() => toggleExpand(match._id)}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 font-black text-sm shadow-inner">
                        {opponent?.username?.[0]?.toUpperCase() || "?"}
                      </div>
                      <div>
                        <span className="block font-bold text-slate-200 text-sm">
                          {opponent?.username || "Unknown"}
                        </span>
                        <span className={`block text-xs font-black uppercase tracking-wider ${statusColor}`}>
                          {statusText}
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      {match.isCashMatch && (
                        <span className={`font-bold text-sm ${amountColor}`}>
                          {amountText}
                        </span>
                      )}
                      <div className="text-slate-500">
                        {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-800/50 text-xs text-slate-400 grid grid-cols-2 gap-y-3 bg-slate-900/30">
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Your Symbol</span>
                        <span className="font-semibold text-slate-300">{mySymbol}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Total Moves</span>
                        <span className="font-semibold text-slate-300">{match.totalMoves}</span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Duration</span>
                        <span className="font-semibold text-slate-300 flex items-center gap-1">
                          <Clock size={10} /> {formatDuration(match.duration)}
                        </span>
                      </div>
                      <div>
                        <span className="block text-[10px] uppercase tracking-wider text-slate-500 font-bold">Date & Time</span>
                        <span className="font-semibold text-slate-300">
                          {new Date(match.createdAt).toLocaleDateString()} {new Date(match.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {/* Pagination Controls */}
            {pagination.pages > 1 && (
              <div className="flex justify-between items-center border-t border-slate-850 pt-4 mt-2">
                <span className="text-xs text-slate-500 font-medium">
                  Page {pagination.page} of {pagination.pages}
                </span>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page === 1}
                    onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    size="sm"
                    variant="secondary"
                    disabled={page >= pagination.pages}
                    onClick={() =>
                      setPage((prev) => Math.min(pagination.pages, prev + 1))
                    }
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-16 text-slate-500 flex flex-col items-center gap-3">
            <Swords size={32} className="text-slate-600" />
            <p>You haven't played any matches yet.</p>
          </div>
        )}
      </Card>
    </div>
  );
};

export default History;
