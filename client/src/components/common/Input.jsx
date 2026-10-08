import React, { forwardRef } from "react";

export const Input = forwardRef(
  ({ label, error, className = "", ...props }, ref) => {
    return (
      <div className="w-full text-left mb-4">
        {label && (
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
            {label}
          </label>
        )}
        <input
          ref={ref}
          className={`w-full bg-slate-900 border ${
            error
              ? "border-rose-500 focus:ring-rose-500 focus:border-rose-500"
              : "border-slate-800 focus:ring-indigo-500 focus:border-indigo-500"
          } text-slate-200 rounded-lg px-3.5 py-2 text-sm placeholder-slate-500 focus:outline-none focus:ring-2 transition-all ${
            className
          }`}
          {...props}
        />

        {error && (
          <span className="block mt-1 text-xs text-rose-500 font-medium">
            {error}
          </span>
        )}
      </div>
    );
  },
);

Input.displayName = "Input";
