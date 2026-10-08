import React from "react";

export const Skeleton = ({ className = "", variant = "rect" }) => {
  const shapes = {
    text: "h-4 w-3/4 rounded",
    rect: "rounded-lg",
    circle: "rounded-full",
  };

  return (
    <div
      className={`animate-pulse bg-slate-800/60 ${shapes[variant]} ${className}`}
    />
  );
};
