import React from "react";
import { useAuth } from "../../context/AuthContext";
import useSocket from "../../hooks/useSocket";
import { LogOut, User, Wifi, WifiOff, MoreVertical, History, Settings, Gift } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { NotificationBell } from "./NotificationBell";

export const Navbar = () => {
  const { user, profile, logout } = useAuth();
  const { isConnected, latency } = useSocket();
  const navigate = useNavigate();

  const location = useLocation();
  const [menuOpen, setMenuOpen] = React.useState(false);
  const menuRef = React.useRef(null);

  // Click outside to close menu
  React.useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      navigate("/login");
    } catch (err) {
      console.error("Logout error:", err);
    }
  };

  // Determine connection color and ping visual
  let connectionColor = "text-rose-500";
  let connectionText = "Offline";
  let ConnectionIcon = WifiOff;

  if (isConnected) {
    if (latency < 100) {
      connectionColor = "text-emerald-500";
      connectionText = "Live";
    } else if (latency < 200) {
      connectionColor = "text-yellow-500";
      connectionText = "Slow";
    } else {
      connectionColor = "text-orange-500";
      connectionText = "Poor";
    }
    ConnectionIcon = Wifi;
  }

  // MINIMAL GAME TOP BAR (for /game route)
  if (location.pathname === "/game") {
    return (
      <header className="h-12 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40">
        {/* Left: Ping */}
        <div className="flex items-center gap-1.5 px-2 py-1 bg-slate-800 rounded-full border border-slate-700 text-[10px] font-bold">
          <ConnectionIcon size={12} className={connectionColor} />
          {isConnected && <span className={connectionColor}>{latency}ms</span>}
        </div>

        {/* Right: Wallet */}
        {user && (
          <div className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 text-xs font-bold shadow-sm">
            <span>₹{(profile?.walletBalance ?? 0).toFixed(2)}</span>
          </div>
        )}
      </header>
    );
  }

  return (
    <header className="h-16 border-b border-slate-800 bg-slate-900/50 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-40">
      {/* Brand logo */}
      <div
        className="flex items-center gap-2 cursor-pointer"
        onClick={() => navigate("/home")}
      >
        <span className="text-xl font-extrabold tracking-wider bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
          XO ARENA
        </span>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-2 sm:gap-4">
        {/* Connection status */}
        {user && (
          <div className="flex items-center gap-1.5 px-2 py-1 sm:px-3 bg-slate-800 sm:bg-slate-850 rounded-full border border-slate-700 sm:border-slate-800 text-xs">
            {isConnected ? (
              <>
                <Wifi size={13} className={`${connectionColor} animate-pulse`} />
                <span className={`${connectionColor} font-semibold hidden sm:inline`}>{connectionText}</span>
                <span className="text-slate-400 font-bold sm:font-medium text-[10px] sm:text-xs">
                  {latency}ms
                </span>
              </>
            ) : (
              <>
                <WifiOff size={13} className="text-rose-500" />
                <span className="text-rose-400 font-semibold hidden sm:inline">Offline</span>
              </>
            )}
          </div>
        )}

        {/* ELO Rating */}
        {user && (
          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 bg-slate-850 rounded-full border border-slate-800 text-xs font-semibold text-slate-350">
            <span>ELO:</span>
            <span className="text-indigo-400">
              {profile?.statistics?.rating ?? 1200}
            </span>
          </div>
        )}

        {/* Wallet Balance */}
        {user && (
          <div
            className="flex items-center gap-1.5 px-3 py-1 bg-indigo-500/10 text-indigo-400 rounded-full border border-indigo-500/20 text-xs cursor-pointer hover:bg-indigo-500/20 transition-all font-semibold"
            onClick={() => navigate("/wallet")}
          >
            <span className="hidden sm:inline">Wallet:</span>
            <span className="text-white">
              ₹ {(profile?.walletBalance ?? 10.0).toFixed(2)}
            </span>
          </div>
        )}

        {/* Notifications */}
        {user && <NotificationBell />}

        {/* Three-Dot Account Menu */}
        {user && (
          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen(!menuOpen)}
              className="text-slate-400 hover:text-white transition-all duration-200 p-1.5 rounded-full hover:bg-white/5 active:scale-95 focus:outline-none flex items-center justify-center"
            >
              <MoreVertical size={20} />
            </button>

            {menuOpen && (
              <div className="absolute right-0 mt-2 w-56 bg-slate-900 rounded-xl border border-slate-750 shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200 origin-top-right">
                <div className="p-4 border-b border-slate-800 bg-slate-850">
                  <p className="text-sm font-bold text-slate-200">{user.username}</p>
                  <p className="text-xs text-slate-400 truncate">{user.email}</p>
                </div>
                <div className="p-2 space-y-1">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/profile");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
                  >
                    <User size={16} className="text-indigo-400" />
                    Profile
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/rewards");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
                  >
                    <Gift size={16} className="text-emerald-400" />
                    Rewards
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/history");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
                  >
                    <History size={16} className="text-indigo-400" />
                    History
                  </button>
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      navigate("/settings");
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-left"
                  >
                    <Settings size={16} className="text-indigo-400" />
                    Settings
                  </button>
                </div>
                <div className="p-2 border-t border-slate-800">
                  <button
                    onClick={() => {
                      setMenuOpen(false);
                      handleLogout();
                    }}
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg transition-colors text-left"
                  >
                    <LogOut size={16} />
                    Logout
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
