import React, { useState, useEffect } from "react";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import api from "../../services/api";
import { Button } from "../common/Button";
import { toast } from "react-hot-toast";

export const WithdrawFlow = ({ onClose, onSuccess }) => {
  const queryClient = useQueryClient();
  const [amount, setAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [saveUpi, setSaveUpi] = useState(false);

  // Get current balance and saved UPI ID
  const { data: walletData } = useQuery({
    queryKey: ["walletDetails"],
    queryFn: async () => {
      const response = await api.get("/wallet");
      return response.data.data;
    },
  });

  const availableBalance = walletData?.balance || 0;

  useEffect(() => {
    if (walletData?.withdrawalUpiId) {
      setUpiId(walletData.withdrawalUpiId);
      setSaveUpi(true); // If they already have one, keep it saved by default
    }
  }, [walletData?.withdrawalUpiId]);

  const withdrawMutation = useMutation({
    mutationFn: async (data) => {
      const response = await api.post("/wallet/withdraw", data);
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(data.message || "Withdrawal request submitted.");
      queryClient.invalidateQueries({ queryKey: ["walletDetails"] });
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
      if (onSuccess) onSuccess();
      onClose();
    },
    onError: (error) => {
      toast.error(error.response?.data?.message || "Failed to submit withdrawal request.");
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    const withdrawAmount = parseFloat(amount);
    
    if (isNaN(withdrawAmount) || withdrawAmount < 100) {
      toast.error("Minimum withdrawal amount is ₹100");
      return;
    }
    if (withdrawAmount > availableBalance) {
      toast.error("Insufficient wallet balance");
      return;
    }
    if (!upiId || upiId.trim() === "") {
      toast.error("UPI ID is required");
      return;
    }
    if (!upiId.includes("@")) {
      toast.error("Please enter a valid UPI ID (e.g., name@bank)");
      return;
    }

    withdrawMutation.mutate({
      amount: withdrawAmount,
      upiId: upiId.trim(),
      saveUpi
    });
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 bg-slate-900/50">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-xl font-black text-white">Withdraw Funds</h2>
              <p className="text-xs text-slate-400 mt-1">Available Balance: ₹{availableBalance.toFixed(2)}</p>
            </div>
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-white transition-colors p-2"
            >
              ✕
            </button>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                Amount (₹)
              </label>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Enter amount (Min. ₹100)"
                min="100"
                step="1"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all font-mono text-lg"
              />
            </div>
            
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
                UPI ID
              </label>
              <input
                type="text"
                value={upiId}
                onChange={(e) => setUpiId(e.target.value)}
                placeholder="e.g. name@bank"
                required
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 transition-all"
              />
            </div>

            <div className="flex items-center gap-2 mt-2">
              <input
                type="checkbox"
                id="saveUpi"
                checked={saveUpi}
                onChange={(e) => setSaveUpi(e.target.checked)}
                className="w-4 h-4 rounded border-slate-700 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-900"
              />
              <label htmlFor="saveUpi" className="text-xs text-slate-400 cursor-pointer select-none">
                Save this UPI ID for future withdrawals
              </label>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <Button
              type="submit"
              className="w-full py-4 text-sm uppercase tracking-wider"
              isLoading={withdrawMutation.isPending}
              disabled={withdrawMutation.isPending || availableBalance < 100}
            >
              Request Withdrawal
            </Button>
            <p className="text-[10px] text-slate-500 text-center mt-3">
              Withdrawal requests are processed manually and may take some time.
            </p>
          </div>
        </form>
      </div>
    </div>
  );
};
