import React from "react";

export const Badge = ({ children, variant = "neutral", className = "" }) => {
  const styles = {
    success: "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20",
    warning: "bg-amber-500/10 text-amber-400 border border-amber-500/20",
    danger: "bg-rose-500/10 text-rose-400 border border-rose-500/20",
    info: "bg-indigo-500/10 text-indigo-400 border border-indigo-500/20",
    neutral: "bg-slate-800 text-slate-400 border border-slate-700",
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold select-none ${styles[variant]} ${className}`}
    >
      {children}
    </span>
  );
};
