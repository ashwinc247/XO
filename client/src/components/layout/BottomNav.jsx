import React from "react";
import { NavLink, useLocation } from "react-router-dom";
import { Home, Swords, Wallet } from "lucide-react";

export const BottomNav = () => {
  const location = useLocation();

  // Hide BottomNav during active gameplay
  if (location.pathname === "/game") {
    return null;
  }

  const activeStyle =
    "flex flex-col items-center gap-1 text-indigo-400 py-1 transition-all";
  const inactiveStyle =
    "flex flex-col items-center gap-1 text-slate-500 hover:text-slate-300 py-1 transition-all";

  return (
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-slate-900 border-t border-slate-800 flex items-center justify-around z-40 md:hidden px-4 shadow-[0_-10px_40px_rgba(0,0,0,0.5)] pb-safe">
      <NavLink
        to="/home"
        className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
        style={{ width: "60px" }}
      >
        <Home size={22} />
        <span className="text-[10px] font-bold mt-1">Home</span>
      </NavLink>

      {/* Center Play Button Container */}
      <div className="absolute left-1/2 -translate-x-1/2 bottom-2 flex flex-col items-center z-50">
        <NavLink
          to="/match"
          className="flex flex-col items-center justify-center w-[60px] h-[60px] rounded-full border-4 border-slate-900 bg-gradient-to-tr from-indigo-500 to-indigo-400 text-white shadow-[0_4px_20px_rgba(99,102,241,0.5)] transition-transform active:scale-95"
        >
          <Swords size={26} className={location.pathname === "/match" ? "animate-pulse" : ""} />
        </NavLink>
        <span className="text-[11px] font-black text-indigo-300 tracking-wider mt-1 drop-shadow-md">PLAY</span>
      </div>

      <NavLink
        to="/wallet"
        className={({ isActive }) => (isActive ? activeStyle : inactiveStyle)}
        style={{ width: "60px" }}
      >
        <Wallet size={22} />
        <span className="text-[10px] font-bold mt-1">Vault</span>
      </NavLink>
    </nav>
  );
};
