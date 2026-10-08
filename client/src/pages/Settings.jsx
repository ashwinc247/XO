import React from "react";
import { useTheme } from "../context/ThemeContext";
import { useAuth } from "../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Card } from "../components/common/Card";
import { Button } from "../components/common/Button";
import { toast } from "react-hot-toast";
import { Volume2, VolumeX, Moon, LogOut } from "lucide-react";

export const Settings = () => {
  const { soundEnabled, setSoundEnabled } = useTheme();
  const handleLogout = async () => {
    try {
      await logout();
      toast.success("Successfully logged out.");
      navigate("/login");
    } catch (err) {
      toast.error("Logout failed.");
    }
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2">
        Settings
      </h1>

      <Card title="Gaming Preferences">
        <div className="space-y-6">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                {soundEnabled ? <Volume2 size={18} /> : <VolumeX size={18} />}
              </div>
              <div>
                <span className="block font-bold text-slate-200 text-sm">
                  Arena Sound Effects
                </span>
                <span className="block text-xs text-slate-500">
                  Play turn notifications and game finish audio alerts
                </span>
              </div>
            </div>
            <div>
              <button
                type="button"
                onClick={() => setSoundEnabled(!soundEnabled)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                  soundEnabled ? "bg-indigo-600" : "bg-slate-700"
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                    soundEnabled ? "translate-x-5" : "translate-x-0"
                  }`}
                />
              </button>
            </div>
          </div>

          {/* Theme Option */}
          <div className="flex items-center justify-between border-t border-slate-800 pt-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-indigo-500/10 border border-indigo-500/25 flex items-center justify-center text-indigo-400">
                <Moon size={18} />
              </div>
              <div>
                <span className="block font-bold text-slate-200 text-sm">
                  Forced Dark Theme
                </span>
                <span className="block text-xs text-slate-500">
                  XO Arena UI is locked to Dark mode for high contrast arena
                  visuals
                </span>
              </div>
            </div>
            <div>
              <span className="px-2.5 py-0.5 rounded text-xs font-semibold bg-slate-800 text-indigo-400 border border-slate-700">
                Enabled
              </span>
            </div>
          </div>
        </div>
      </Card>

      <Card title="Account Management">
        <div className="flex items-center justify-between">
          <div>
            <span className="block font-bold text-slate-200 text-sm">
              Logout of Account
            </span>
            <span className="block text-xs text-slate-500">
              Signs you out of this session across all tabs
            </span>
          </div>
          <div>
            <Button
              variant="danger"
              className="flex items-center gap-2 group cursor-pointer"
              onClick={handleLogout}
            >
              <LogOut size={14} />
              <span>Sign Out</span>
            </Button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default Settings;
