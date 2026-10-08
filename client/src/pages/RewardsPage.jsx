import React, { useState } from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/common/Card";
import { toast } from "react-hot-toast";
import { Copy, Gift, Share2, Users, ArrowDownRight, Crown, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";

export const RewardsPage = () => {
  const { profile, checkAuth } = useAuth();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("referrals"); // referrals, history

  const { data: stats, isLoading, isError } = useQuery({
    queryKey: ["rewardStats"],
    queryFn: async () => {
      const res = await api.get("/rewards");
      return res.data.data;
    }
  });

  const referralCode = stats?.referralCode || profile?.referralCode || "NOT-AVAILABLE";
  const referralLink = `${window.location.origin}/register?ref=${referralCode}`;

  const copyToClipboard = (text, type = "code") => {
    navigator.clipboard.writeText(text);
    toast.success(`${type === "code" ? "Referral code" : "Referral link"} copied!`);
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Join XO Arena!",
          text: `Use my referral code ${referralCode} to join!`,
          url: referralLink,
        });
      } catch (err) {
        console.error("Error sharing", err);
      }
    } else {
      copyToClipboard(referralLink, "link");
    }
  };

  const claimMutation = useMutation({
    mutationFn: async () => {
      const res = await api.post("/rewards/claim");
      return res.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Bonus claimed to wallet!");
      queryClient.invalidateQueries({ queryKey: ["rewardStats"] });
      // Update global profile context so navbar wallet balance updates
      if (checkAuth) checkAuth(); 
    },
    onError: (err) => {
      toast.error(err.response?.data?.message || "Failed to claim bonus");
    }
  });

  const canClaim = stats?.bonusRewardBalance > 0;
  let claimText = "Claim to Wallet";
  if (stats?.lastBonusClaimedAt) {
    const hoursSinceLast = (new Date() - new Date(stats.lastBonusClaimedAt)) / (1000 * 60 * 60);
    if (hoursSinceLast < 24) {
      claimText = `Available in ${Math.ceil(24 - hoursSinceLast)}h`;
    }
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6 pb-20 md:pb-0">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2 px-4 md:px-0">
        Rewards
      </h1>

      {/* Bonus Reward Wallet Card */}
      <div className="px-4 md:px-0">
        <div className="bg-gradient-to-br from-emerald-900/40 via-emerald-800/20 to-slate-900/60 border border-emerald-500/20 rounded-2xl p-6 relative overflow-hidden shadow-xl">
          <div className="absolute top-0 right-0 -mt-4 -mr-4 w-32 h-32 bg-emerald-500/10 blur-3xl rounded-full"></div>
          <div className="relative z-10 flex flex-col">
            <span className="text-emerald-400/80 text-xs font-bold uppercase tracking-widest flex items-center gap-2 mb-2">
              <Gift size={14} /> Bonus Rewards
            </span>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-white">
                ₹{stats?.bonusRewardBalance?.toFixed(2) || "0.00"}
              </span>
            </div>
            <div className="flex items-center justify-between mt-4">
              <p className="text-slate-400 text-[10px] font-medium">
                * This balance is separate from your main wallet.
              </p>
              <button
                onClick={() => claimMutation.mutate()}
                disabled={!canClaim || claimMutation.isPending || claimText.includes("Available")}
                className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 disabled:cursor-not-allowed text-slate-900 text-xs font-bold py-1.5 px-3 rounded-md transition-colors shadow-lg shadow-emerald-500/20"
              >
                <Download size={14} />
                {claimMutation.isPending ? "Claiming..." : claimText}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="px-4 md:px-0">
        <div className="flex items-center gap-2 bg-slate-900/50 p-1.5 rounded-lg border border-slate-800">
          <button
            onClick={() => setActiveTab("referrals")}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
              activeTab === "referrals"
                ? "bg-slate-800 text-emerald-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            Refer & Earn
          </button>
          <button
            onClick={() => setActiveTab("history")}
            className={`flex-1 py-2 text-xs font-bold rounded-md transition-all ${
              activeTab === "history"
                ? "bg-slate-800 text-emerald-400 shadow-sm"
                : "text-slate-400 hover:text-slate-200"
            }`}
          >
            History
          </button>
        </div>
      </div>

      {activeTab === "referrals" && (
        <div className="px-4 md:px-0 space-y-6">
          {/* Share Section */}
          <Card className="p-5 flex flex-col gap-4">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Share2 size={16} className="text-indigo-400" /> Share your link
            </h3>
            
            <div className="bg-slate-900 rounded-lg border border-slate-800 p-3 flex flex-col gap-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-wide font-bold">Code</span>
                <span className="text-sm font-black text-white tracking-widest">{referralCode}</span>
                <button
                  onClick={() => copyToClipboard(referralCode, "code")}
                  className="bg-indigo-500/10 text-indigo-400 px-3 py-1.5 rounded text-xs font-bold hover:bg-indigo-500/20 transition"
                >
                  COPY
                </button>
              </div>
              <div className="h-px bg-slate-800 w-full"></div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400 uppercase tracking-wide font-bold">Link</span>
                <span className="text-xs font-medium text-slate-500 truncate w-32 md:w-auto">{referralLink}</span>
                <button
                  onClick={handleShare}
                  className="bg-emerald-500/10 text-emerald-400 px-3 py-1.5 rounded text-xs font-bold hover:bg-emerald-500/20 transition flex items-center gap-1"
                >
                  <Share2 size={12} />
                  SHARE
                </button>
              </div>
            </div>
          </Card>

          {/* Earnings Overview */}
          <Card title="Rewards Summary">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Referral Signup Bonuses</span>
                <span className="text-lg font-black text-white mt-1">₹{stats?.summary?.referralSignupBonuses?.toFixed(2) || "0.00"}</span>
              </div>
              
              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">L1 Betting Commission</span>
                <span className="text-lg font-black text-white mt-1">₹{stats?.summary?.bettingCommissionL1?.toFixed(2) || "0.00"}</span>
              </div>

              <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">L2 Betting Commission</span>
                <span className="text-lg font-black text-white mt-1">₹{stats?.summary?.bettingCommissionL2?.toFixed(2) || "0.00"}</span>
              </div>

              <div className="bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 flex flex-col justify-center">
                <span className="text-[10px] uppercase font-bold text-emerald-400/80 tracking-wider">Total Earned</span>
                <span className="text-2xl font-black text-emerald-400 mt-1">₹{stats?.summary?.totalEarned?.toFixed(2) || "0.00"}</span>
              </div>
            </div>
          </Card>

          {/* Referral List */}
          <Card title="Referral Network">
            <div className="space-y-4">
              {/* Level 1 List */}
              {stats?.level1?.referrals?.length > 0 && (
                <div>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1 border-b border-slate-800 pb-2">Direct Referrals (Level 1)</h4>
                  <div className="space-y-2">
                    {stats.level1.referrals.map((ref, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-200">{ref.username}</span>
                          <span className="text-[10px] text-slate-500">Joined: {new Date(ref.joinedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400">+₹{ref.amount}</span>
                          <div className="text-[10px] text-slate-500">Level 1</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Level 2 List */}
              {stats?.level2?.referrals?.length > 0 && (
                <div className="pt-2">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 px-1 border-b border-slate-800 pb-2">Indirect Referrals (Level 2)</h4>
                  <div className="space-y-2">
                    {stats.level2.referrals.map((ref, idx) => (
                      <div key={idx} className="flex items-center justify-between bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                        <div className="flex flex-col">
                          <span className="text-sm font-bold text-slate-200">{ref.username}</span>
                          <span className="text-[10px] text-slate-500">Joined: {new Date(ref.joinedAt).toLocaleDateString()}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-bold text-emerald-400">+₹{ref.amount}</span>
                          <div className="text-[10px] text-slate-500">Level 2</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {(!stats?.level1?.referrals?.length && !stats?.level2?.referrals?.length) && (
                <div className="text-center py-8 text-slate-500 text-sm">
                  You haven't referred anyone yet.
                </div>
              )}
            </div>
          </Card>
        </div>
      )}

      {activeTab === "history" && (
        <div className="px-4 md:px-0 space-y-6">
          <Card title="Referral Bonus History">
            <p className="text-xs text-slate-500 mb-4">* Betting commissions are aggregated in your summary and not listed individually here.</p>
            {stats?.history?.length > 0 ? (
              <div className="space-y-3">
                {stats.history.map((tx) => (
                  <div key={tx._id} className="flex items-center gap-3 p-3 bg-slate-900/50 rounded-lg border border-slate-800">
                    <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 flex-shrink-0">
                      <ArrowDownRight size={18} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-0.5">
                        <span className="text-sm font-bold text-white truncate">
                          Level {tx.level} Referral
                        </span>
                        <span className="text-sm font-black text-emerald-400 whitespace-nowrap">
                          +₹{tx.amount}
                        </span>
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs text-slate-400 truncate">
                          {tx.sourceUser?.username || 'Unknown'} joined
                        </span>
                        <span className="text-[10px] text-slate-500">
                          {new Date(tx.createdAt).toLocaleDateString()} · {new Date(tx.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-slate-500 text-sm">
                No bonus transactions yet.
              </div>
            )}
          </Card>
        </div>
      )}
    </div>
  );
};

export default RewardsPage;
