import React from "react";
import { useAuth } from "../context/AuthContext";
import { Card } from "../components/common/Card";
import { toast } from "react-hot-toast";
import { Copy, Gift, Users, Award, ShieldCheck } from "lucide-react";

export const Referral = () => {
  const { profile } = useAuth();
  const referralCode = profile?.referralCode || "NOT-AVAILABLE";
  const referredCount = profile?.referredCount || 0;

  const copyToClipboard = () => {
    navigator.clipboard.writeText(referralCode);
    toast.success("Referral code copied to clipboard!");
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
        Referrals
      </h1>

      {/* Referral Hero Info */}
      <div className="bg-gradient-to-br from-indigo-900/40 via-indigo-950/20 to-slate-900/60 border border-indigo-500/20 rounded-2xl p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
            <Gift size={22} />
          </div>
          <h2 className="text-xl font-extrabold text-white">
            Invite Friends, Earn Rating!
          </h2>
          <p className="text-slate-400 text-sm max-w-md leading-relaxed">
            Invite players using your referral code. Once they register and
            verify their email, your referral stats will increase!
          </p>
        </div>

        {/* Copy Box */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 md:p-5 flex flex-col items-center gap-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Your Referral Code
          </span>
          <div className="flex items-center gap-2 bg-slate-950 px-4 py-2.5 rounded-lg border border-slate-800">
            <code className="text-base font-black text-indigo-400 select-all tracking-wider">
              UID:{referralCode}
            </code>
            <button
              onClick={copyToClipboard}
              className="text-slate-400 hover:text-indigo-400 p-1 rounded transition-colors cursor-pointer"
              title="Copy"
            >
              <Copy size={16} />
            </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Referral stats */}
        <Card className="flex flex-col items-center text-center p-6 justify-center">
          <Users size={24} className="text-indigo-400 mb-2" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Friends Referred
          </span>
          <span className="text-3xl font-black text-white mt-1">
            {referredCount}
          </span>
        </Card>

        <Card className="flex flex-col items-center text-center p-6 justify-center">
          <Award size={24} className="text-emerald-400 mb-2" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Elo Bonus
          </span>
          <span className="text-3xl font-black text-white mt-1">
            +{referredCount * 10}
          </span>
        </Card>

        <Card className="flex flex-col items-center text-center p-6 justify-center">
          <ShieldCheck size={24} className="text-purple-400 mb-2" />
          <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Status tier
          </span>
          <span className="text-sm font-bold text-slate-350 mt-2">
            {referredCount >= 10
              ? "Arena Legend"
              : referredCount >= 5
                ? "Arena Veteran"
                : "Arena Rookie"}
          </span>
        </Card>
      </div>

      <Card title="Referral Program Rules">
        <ol className="list-decimal list-inside space-y-3.5 text-sm text-slate-400 pl-2">
          <li>
            Share your unique referral code with friends who are not yet
            registered on XO Arena.
          </li>
          <li>
            They must enter your referral code in the referral input field
            during account registration.
          </li>
          <li>
            Once they verify their email via OTP, the referral registers under
            your stats.
          </li>
          <li>
            Your profile rating gets a small boost for every successfully
            referred active player.
          </li>
        </ol>
      </Card>
    </div>
  );
};

export default Referral;
