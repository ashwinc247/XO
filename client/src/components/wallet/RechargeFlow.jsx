import React, { useState, useEffect } from "react";
import { Button } from "../common/Button";
import { Input } from "../common/Input";
import { Copy, Upload, ArrowRight, CheckCircle2 } from "lucide-react";
import { toast } from "react-hot-toast";
import api from "../../services/api";

const PREDEFINED_AMOUNTS = [100, 200, 300, 500, 1000];

export const RechargeFlow = ({ onClose, onSuccess }) => {
  const [step, setStep] = useState(1);
  const [amount, setAmount] = useState("");
  const [customAmount, setCustomAmount] = useState("");
  const [upiId, setUpiId] = useState("");
  const [rechargeRequest, setRechargeRequest] = useState(null);
  
  const [screenshot, setScreenshot] = useState(null);
  const [utr, setUtr] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState(600); // 10 mins in seconds

  useEffect(() => {
    let timer;
    if (step === 3 && rechargeRequest && timeLeft > 0) {
      timer = setInterval(() => {
        setTimeLeft((prev) => prev - 1);
      }, 1000);
    } else if (timeLeft <= 0 && step === 3) {
      toast.error("Recharge request expired.");
      onClose();
    }
    return () => clearInterval(timer);
  }, [step, rechargeRequest, timeLeft, onClose]);

  const handleAmountSelect = (amt) => {
    setAmount(amt);
    setCustomAmount("");
  };

  const handleCustomAmount = (e) => {
    setCustomAmount(e.target.value);
    setAmount(e.target.value);
  };

  const handleProceedToPayment = async () => {
    const amt = parseFloat(amount);
    if (isNaN(amt) || amt < 100 || amt > 1000) {
      toast.error("Amount must be between ₹100 and ₹1000");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await api.post("/wallet/recharge/create", { amount: amt });
      setRechargeRequest(res.data.data.recharge);
      setUpiId(res.data.data.upiId);
      setStep(2);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to initiate recharge");
    } finally {
      setIsSubmitting(false);
    }
  };

  const copyUpiId = () => {
    navigator.clipboard.writeText(upiId);
    toast.success("UPI ID copied to clipboard!");
  };

  const openUpiApp = (app) => {
    const url = `upi://pay?pa=${upiId}&pn=XO_ARENA&am=${amount}&cu=INR`;
    window.location.href = url;
    setTimeout(() => {
      setStep(3); // Move to proof submission after trying to open app
    }, 1000);
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      if (!file.type.startsWith("image/")) {
        toast.error("Please select a valid image file");
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error("File size must be less than 5MB");
        return;
      }
      setScreenshot(file);
    }
  };

  const handleSubmitProof = async () => {
    if (!utr.trim()) {
      toast.error("Please enter the UTR / Transaction ID");
      return;
    }
    if (!screenshot) {
      toast.error("Please upload the payment screenshot");
      return;
    }

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      formData.append("utr", utr);
      formData.append("screenshot", screenshot);

      await api.post(`/wallet/recharge/submit/${rechargeRequest._id}`, formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      toast.success("Payment proof submitted successfully!");
      setStep(4);
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to submit proof");
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, "0");
    const s = (seconds % 60).toString().padStart(2, "0");
    return `${m}:${s}`;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[90vh]">
        <div className="p-4 border-b border-slate-800 flex justify-between items-center bg-slate-900 sticky top-0 z-10">
          <h2 className="text-lg font-bold text-slate-200">Recharge Wallet</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            ✕
          </button>
        </div>

        <div className="p-6 overflow-y-auto">
          {step === 1 && (
            <div className="space-y-6">
              <div>
                <h3 className="text-sm font-semibold text-slate-300 mb-3">Select Amount (₹)</h3>
                <div className="grid grid-cols-3 gap-3 mb-4">
                  {PREDEFINED_AMOUNTS.map((amt) => (
                    <button
                      key={amt}
                      onClick={() => handleAmountSelect(amt)}
                      className={`py-2 rounded-lg font-bold text-sm border transition-all ${
                        parseFloat(amount) === amt
                          ? "bg-indigo-600 border-indigo-500 text-white"
                          : "bg-slate-800 border-slate-700 text-slate-300 hover:border-indigo-500/50"
                      }`}
                    >
                      ₹{amt}
                    </button>
                  ))}
                </div>
                <Input
                  label="Or Enter Custom Amount (₹100 - ₹1000)"
                  type="number"
                  placeholder="₹___"
                  value={customAmount}
                  onChange={handleCustomAmount}
                />
              </div>
              <Button
                className="w-full"
                onClick={handleProceedToPayment}
                isLoading={isSubmitting}
                disabled={!amount || isNaN(amount) || amount < 100 || amount > 1000}
              >
                Proceed to Pay
              </Button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6 text-center">
              <div className="bg-slate-800/50 rounded-xl p-4 border border-slate-700">
                <p className="text-slate-400 text-xs mb-1">Amount to pay</p>
                <h3 className="text-3xl font-black text-indigo-400">₹{amount}</h3>
              </div>

              <div>
                <p className="text-sm text-slate-300 mb-4">Pay using UPI</p>
                <div className="flex flex-col gap-3">
                  <Button variant="secondary" className="w-full justify-between" onClick={() => openUpiApp('gpay')}>
                    <span>Google Pay</span>
                    <ArrowRight size={16} />
                  </Button>
                  <Button variant="secondary" className="w-full justify-between" onClick={() => openUpiApp('phonepe')}>
                    <span>PhonePe</span>
                    <ArrowRight size={16} />
                  </Button>
                  <Button variant="secondary" className="w-full justify-between" onClick={() => openUpiApp('paytm')}>
                    <span>Paytm</span>
                    <ArrowRight size={16} />
                  </Button>
                </div>
              </div>

              <div className="border-t border-slate-800 pt-4">
                <p className="text-xs text-slate-400 mb-2">Or copy UPI ID to pay manually</p>
                <div className="flex items-center gap-2 bg-slate-950 border border-indigo-500/30 p-3 rounded-lg justify-between">
                  <span className="font-mono text-sm text-indigo-300 font-bold tracking-wide">{upiId}</span>
                  <button onClick={copyUpiId} className="text-indigo-400 hover:text-indigo-300 p-1 bg-indigo-500/10 rounded">
                    <Copy size={16} />
                  </button>
                </div>
              </div>
              
              <Button className="w-full mt-4" variant="primary" onClick={() => setStep(3)}>
                I have made the payment
              </Button>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-5">
              <div className="bg-rose-500/10 border border-rose-500/20 p-3 rounded-xl text-center">
                <p className="text-xs text-rose-400 font-bold uppercase tracking-wider mb-1">Time Remaining</p>
                <p className="text-2xl font-mono font-bold text-rose-500">{formatTime(timeLeft)}</p>
              </div>

              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-slate-200">Submit Payment Proof</h3>
                
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400">UTR / Transaction ID</label>
                  <input
                    type="text"
                    placeholder="Enter 12-digit UTR"
                    className="w-full text-sm bg-slate-950 border border-slate-800 rounded-lg p-3 text-slate-200 focus:border-indigo-500"
                    value={utr}
                    onChange={(e) => setUtr(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-400">Upload Screenshot</label>
                  <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-slate-800 border-dashed rounded-lg cursor-pointer hover:bg-slate-800/50 transition-colors bg-slate-950">
                    <div className="flex flex-col items-center justify-center pt-5 pb-6">
                      <Upload className="w-8 h-8 mb-3 text-slate-500" />
                      <p className="mb-2 text-sm text-slate-400 font-semibold">
                        {screenshot ? screenshot.name : "Click to upload"}
                      </p>
                      <p className="text-xs text-slate-500">PNG, JPG up to 5MB</p>
                    </div>
                    <input type="file" className="hidden" accept="image/*" onChange={handleFileChange} />
                  </label>
                </div>
              </div>

              <Button
                className="w-full"
                onClick={handleSubmitProof}
                isLoading={isSubmitting}
                disabled={!utr || !screenshot}
              >
                Submit for Verification
              </Button>
            </div>
          )}

          {step === 4 && (
            <div className="text-center py-8 space-y-4">
              <div className="mx-auto w-16 h-16 bg-emerald-500/20 text-emerald-500 flex items-center justify-center rounded-full">
                <CheckCircle2 size={32} />
              </div>
              <h2 className="text-xl font-bold text-slate-200">Verification Pending</h2>
              <p className="text-sm text-slate-400">
                Your payment proof has been submitted successfully. Your wallet will be credited once the admin verifies the payment.
              </p>
              <Button
                className="w-full mt-6"
                onClick={() => {
                  onSuccess();
                  onClose();
                }}
              >
                Done
              </Button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
