import React from "react";

export const Card = ({ title, children, className = "" }) => {
  return (
    <div
      className={`bg-slate-900 border border-slate-800 rounded-xl p-5 shadow-lg ${className}`}
    >
      {title && (
        <h3 className="text-base font-bold text-slate-200 border-b border-slate-800 pb-3 mb-4">
          {title}
        </h3>
      )}
      <div className="text-slate-300 text-sm">{children}</div>
    </div>
  );
};
