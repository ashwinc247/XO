import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { Card } from "../common/Card";
import { CheckCircle2, ChevronLeft, ChevronRight, Hash, TrendingUp, Users, DollarSign } from "lucide-react";

export const MatchSettlements = () => {
  const [page, setPage] = useState(1);
  const limit = 10;

  const { data: sData, isLoading } = useQuery({
    queryKey: ["adminSettlements", page],
    queryFn: async () => {
      const res = await api.get(`/admin/matches/settlements?page=${page}&limit=${limit}`);
      return res.data.data;
    },
    keepPreviousData: true,
  });

  const settlements = sData?.settlements || [];
  const pagination = sData?.pagination || { page: 1, pages: 1 };

  return (
    <Card title="Match Settlements (Commissions)" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs text-slate-400 uppercase bg-slate-900/50 border-b border-slate-800">
            <tr>
              <th className="px-4 py-3"><div className="flex items-center gap-2"><Hash size={14} /> Match ID</div></th>
              <th className="px-4 py-3"><div className="flex items-center gap-2"><TrendingUp size={14} /> Base Bet</div></th>
              <th className="px-4 py-3"><div className="flex items-center gap-2"><CheckCircle2 size={14} /> Winner Payout</div></th>
              <th className="px-4 py-3"><div className="flex items-center gap-2"><DollarSign size={14} /> Platform Comm.</div></th>
              <th className="px-4 py-3"><div className="flex items-center gap-2"><Users size={14} /> Referrer L1</div></th>
              <th className="px-4 py-3"><div className="flex items-center gap-2"><Users size={14} /> Referrer L2</div></th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                  <div className="flex justify-center items-center gap-2">
                    <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                    Loading settlements...
                  </div>
                </td>
              </tr>
            ) : settlements.length === 0 ? (
              <tr>
                <td colSpan="7" className="px-4 py-8 text-center text-slate-500">
                  No settlements found.
                </td>
              </tr>
            ) : (
              settlements.map((s) => (
                <tr key={s._id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-4 py-3 font-mono text-xs text-indigo-400">
                    {s.matchId?.slice(-6) || 'N/A'}
                  </td>
                  <td className="px-4 py-3 font-bold text-white">
                    ₹{s.baseBetAmount?.toFixed(2)}
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-emerald-400 font-bold">₹{s.winnerPayout?.toFixed(2)}</div>
                    <div className="text-[10px] text-slate-500">Won by {s.winnerId?.username || 'Unknown'}</div>
                  </td>
                  <td className="px-4 py-3">
                    <div className="text-indigo-400 font-bold">₹{s.platformCommission?.toFixed(2)}</div>
                    {s.fallbackCommission > 0 && (
                      <div className="text-[10px] text-rose-400">Includes +₹{s.fallbackCommission?.toFixed(2)} fallback</div>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.level1UserId ? (
                      <div>
                        <div className="text-emerald-400 font-bold">₹{s.level1Commission?.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">{s.level1UserId.username}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    {s.level2UserId ? (
                      <div>
                        <div className="text-emerald-400 font-bold">₹{s.level2Commission?.toFixed(2)}</div>
                        <div className="text-[10px] text-slate-500">{s.level2UserId.username}</div>
                      </div>
                    ) : (
                      <span className="text-xs text-slate-600">N/A</span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded uppercase tracking-wider">
                      {s.status}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {!isLoading && pagination.pages > 1 && (
        <div className="p-4 border-t border-slate-800 bg-slate-900/30 flex items-center justify-between">
          <div className="text-xs text-slate-500">
            Page <span className="font-bold text-white">{pagination.page}</span> of{" "}
            <span className="font-bold text-white">{pagination.pages}</span>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="p-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pagination.pages, p + 1))}
              disabled={page === pagination.pages}
              className="p-1 rounded bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white disabled:opacity-50 transition-colors"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </Card>
  );
};
