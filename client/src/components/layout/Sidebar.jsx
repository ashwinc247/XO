import React from "react";
import { NavLink } from "react-router-dom";
import {
  Home,
  Swords,
  History,
  User,
  Share2,
  Settings,
  Shield,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const Sidebar = () => {
  const { user } = useAuth();
  const navItems = [
    { to: "/home", label: "Home", icon: Home },
    { to: "/match", label: "Play Arena", icon: Swords },
    { to: "/history", label: "Match History", icon: History },
    { to: "/profile", label: "My Profile", icon: User },
    { to: "/referral", label: "Referrals", icon: Share2 },
    { to: "/settings", label: "Settings", icon: Settings },
  ];

  const activeStyle =
    "flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-bold bg-indigo-600 text-white shadow-lg shadow-indigo-600/25 transition-all";
  const inactiveStyle =
    "flex items-center gap-3.5 px-4 py-3 rounded-lg text-sm font-semibold text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 transition-all";

  return (
    <aside className="w-64 bg-slate-900/40 border-r border-slate-800 flex-shrink-0 flex-col p-4 hidden md:flex min-h-[calc(100vh-64px)]">
      <nav className="flex-1 flex flex-col gap-1.5">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              isActive ? activeStyle : inactiveStyle
            }
          >
            <item.icon size={18} />
            <span>{item.label}</span>
          </NavLink>
        ))}

        {user && user.role === "admin" && (
          <NavLink
            to="/admin/dashboard"
            className={({ isActive }) =>
              isActive ? activeStyle : inactiveStyle
            }
          >
            <Shield size={18} />
            <span>Admin Panel</span>
          </NavLink>
        )}
      </nav>
    </aside>
  );
};
