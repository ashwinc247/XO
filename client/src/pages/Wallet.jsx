import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import api from "../services/api";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { RechargeFlow } from "../components/wallet/RechargeFlow";
import { WithdrawFlow } from "../components/wallet/WithdrawFlow";
import { toast } from "react-hot-toast";
import {
  Wallet as WalletIcon,
  ArrowUpRight,
  ArrowDownLeft,
  Shield,
  Landmark,
  Clock,
  AlertCircle
} from "lucide-react";

export const Wallet = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const [isRechargeOpen, setIsRechargeOpen] = useState(false);
  const [isWithdrawOpen, setIsWithdrawOpen] = useState(false);

  // Fetch Wallet details
  const { data: walletData, isLoading } = useQuery({
    queryKey: ["walletDetails"],
    queryFn: async () => {
      const response = await api.get("/wallet");
      return response.data.data;
    },
  });

  const handleWithdrawClick = () => {
    setIsWithdrawOpen(true);
  };

  const handleRechargeSuccess = () => {
    queryClient.invalidateQueries({ queryKey: ["walletDetails"] });
  };

  const currentBalance = walletData?.balance ?? profile?.walletBalance ?? 0.0;

  const getStatusIcon = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
      case 'PROOF_SUBMITTED':
      case 'UNDER_REVIEW':
        return <Clock size={12} className="text-amber-400" />;
      case 'REJECTED':
      case 'EXPIRED':
      case 'failed':
        return <AlertCircle size={12} className="text-rose-400" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'PENDING_PAYMENT':
      case 'PROOF_SUBMITTED':
      case 'UNDER_REVIEW':
        return 'text-amber-400';
      case 'REJECTED':
      case 'EXPIRED':
      case 'failed':
        return 'text-rose-400';
      case 'completed':
      case 'APPROVED':
        return 'text-emerald-400';
      default:
        return 'text-slate-400';
    }
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header and Balance card */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-gradient-to-br from-indigo-900/40 to-slate-900 border-indigo-500/20 flex flex-col justify-between p-6">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-xs text-slate-400 font-bold uppercase tracking-wider">
                Total Wallet Balance
              </span>
              <h2 className="text-3xl font-black text-white mt-1">
                ₹{currentBalance.toFixed(2)}
              </h2>
            </div>
            <div className="bg-indigo-500/20 p-2.5 rounded-lg text-indigo-400">
              <WalletIcon size={20} />
            </div>
          </div>
          <div className="mt-8 flex items-center gap-2 text-xs text-indigo-400 bg-indigo-500/10 py-1.5 px-3 rounded-lg border border-indigo-500/10">
            <Shield size={14} />
            <span>100% Secure Payments</span>
          </div>
        </Card>

        {/* Deposit Panel */}
        <Card className="md:col-span-1 p-6 flex flex-col justify-center items-center text-center space-y-4 hover:border-indigo-500/50 transition-colors">
          <div className="w-12 h-12 rounded-full bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2">
            <ArrowUpRight size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">Recharge Wallet</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">Add funds securely using UPI</p>
          </div>
          <Button className="w-full" onClick={() => setIsRechargeOpen(true)}>
            Recharge Now
          </Button>
        </Card>

        {/* Withdraw Panel */}
        <Card className="md:col-span-1 p-6 flex flex-col justify-center items-center text-center space-y-4 opacity-75 hover:opacity-100 transition-opacity">
          <div className="w-12 h-12 rounded-full bg-indigo-500/10 flex items-center justify-center text-indigo-400 mb-2">
            <ArrowDownLeft size={24} />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-200">Withdraw Funds</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">Transfer winnings to your bank</p>
          </div>
          <Button variant="secondary" className="w-full" onClick={handleWithdrawClick}>
            Withdraw Now
          </Button>
        </Card>
      </div>

      {/* Transaction log */}
      <Card className="p-6">
        <h3 className="text-sm font-bold text-slate-200 mb-4 flex items-center gap-2">
          <Landmark size={16} className="text-slate-400" />
          Transaction logs
        </h3>

        {isLoading ? (
          <div className="text-slate-500 text-center py-6 text-xs">
            Loading transaction logs...
          </div>
        ) : (
          <div className="space-y-3">
            {(walletData?.transactions || []).length > 0 ? (
              (walletData?.transactions || []).map((tx, idx) => (
                <div key={idx} className="bg-slate-900 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black ${
                      tx.type === "credit" ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                    }`}>
                      {tx.type === "credit" ? "+" : "-"}
                    </div>
                    <div>
                      <span className="block font-bold text-slate-200 text-sm">
                        {tx.transactionType || tx.type}
                        {tx.status && tx.status !== 'completed' && (
                          <span className={`ml-2 text-[10px] uppercase font-bold flex items-center gap-1 inline-flex ${getStatusColor(tx.status)}`}>
                            {getStatusIcon(tx.status)} {tx.status.replace('_', ' ')}
                          </span>
                        )}
                      </span>
                      <div className="text-[10px] text-slate-400 mt-0.5 truncate max-w-[200px] md:max-w-md">
                        {tx.description}
                      </div>
                      {tx.utr && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          UTR: <span className="font-mono text-slate-300">{tx.utr}</span>
                        </div>
                      )}
                      {tx.reference && (
                        <div className="text-[10px] text-slate-500 mt-0.5">
                          Ref: <span className="font-mono text-slate-300">{tx.reference}</span>
                        </div>
                      )}
                      <div className="flex items-center gap-2 text-[10px] text-slate-500 font-semibold uppercase tracking-wider mt-1">
                        <span>{new Date(tx.date).toLocaleDateString()}</span>
                        <span>•</span>
                        <span>{new Date(tx.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-col items-end">
                    <span className={`font-black text-lg ${tx.type === "credit" ? "text-emerald-400" : "text-rose-400"}`}>
                      {tx.type === "credit" ? "+" : "-"}₹{tx.amount.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-6 text-slate-500 text-sm">
                No transactions found.
              </div>
            )}
          </div>
        )}
      </Card>

      {isRechargeOpen && (
        <RechargeFlow
          onClose={() => setIsRechargeOpen(false)}
          onSuccess={handleRechargeSuccess}
        />
      )}
      
      {isWithdrawOpen && (
        <WithdrawFlow
          onClose={() => setIsWithdrawOpen(false)}
          onSuccess={() => queryClient.invalidateQueries({ queryKey: ["walletDetails"] })}
        />
      )}
    </div>
  );
};
