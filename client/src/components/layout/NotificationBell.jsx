import React, { useState, useEffect, useRef } from "react";
import { Bell, Check, CheckCircle2 } from "lucide-react";
import api from "../../services/api";
import useSocket from "../../hooks/useSocket";

export const NotificationBell = () => {
  const [announcements, setAnnouncements] = useState([]);
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);
  const { socket } = useSocket();

  const fetchAnnouncements = async () => {
    try {
      const response = await api.get("/announcements");
      setAnnouncements(response.data.data);
    } catch (err) {
      console.error("Failed to fetch announcements:", err);
    }
  };

  useEffect(() => {
    fetchAnnouncements();
  }, []);

  useEffect(() => {
    if (!socket) return;

    const handleNewAnnouncement = (announcement) => {
      // Add the new announcement at the beginning, marked as unread
      setAnnouncements((prev) => [
        { ...announcement, isRead: false },
        ...prev,
      ]);
    };

    socket.on("new_announcement", handleNewAnnouncement);

    return () => {
      socket.off("new_announcement", handleNewAnnouncement);
    };
  }, [socket]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await api.post(`/announcements/${id}/read`);
      setAnnouncements((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isRead: true } : a))
      );
    } catch (err) {
      console.error("Failed to mark as read:", err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await api.post("/announcements/read-all");
      setAnnouncements((prev) => prev.map((a) => ({ ...a, isRead: true })));
    } catch (err) {
      console.error("Failed to mark all as read:", err);
    }
  };

  const handleNotificationClick = (announcement) => {
    if (!announcement.isRead) {
      handleMarkAsRead(announcement._id);
    }
  };

  const unreadCount = announcements.filter((a) => !a.isRead).length;

  const getTypeColor = (type) => {
    switch (type) {
      case 'Important': return 'text-rose-500';
      case 'System': return 'text-amber-500';
      case 'Promotion': return 'text-emerald-500';
      default: return 'text-indigo-400';
    }
  };

  const getTypeBg = (type) => {
    switch (type) {
      case 'Important': return 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.6)]';
      case 'System': return 'bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.6)]';
      case 'Promotion': return 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.6)]';
      default: return 'bg-indigo-500 shadow-[0_0_8px_rgba(99,102,241,0.6)]';
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-slate-400 hover:text-indigo-400 transition-colors rounded-full hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/50 cursor-pointer"
      >
        <Bell size={20} />
        {unreadCount > 0 && (
          <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[10px] font-bold text-white ring-2 ring-slate-900">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 rounded-xl border border-slate-750 shadow-2xl overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="p-4 border-b border-slate-750 flex items-center justify-between bg-slate-800/50">
            <h3 className="text-sm font-bold text-slate-200">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                className="text-xs text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <CheckCircle2 size={14} />
                Mark all as read
              </button>
            )}
          </div>
          
          <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
            {announcements.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                No announcements yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {announcements.map((announcement) => (
                  <div
                    key={announcement._id}
                    onClick={() => handleNotificationClick(announcement)}
                    className={`p-4 hover:bg-slate-800 transition-colors cursor-pointer group ${
                      !announcement.isRead ? "bg-slate-800/30" : ""
                    }`}
                  >
                    <div className="flex gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <div
                          className={`w-2 h-2 rounded-full mt-1.5 ${
                            !announcement.isRead ? getTypeBg(announcement.type) : "bg-transparent"
                          }`}
                        />
                      </div>
                      <div className="flex-1 space-y-1">
                        <div className="flex justify-between items-start gap-2">
                          <h4
                            className={`text-sm font-semibold ${
                              !announcement.isRead ? getTypeColor(announcement.type) : "text-slate-300"
                            }`}
                          >
                            {announcement.title}
                          </h4>
                          <span className="text-[10px] text-slate-500 flex-shrink-0 mt-0.5">
                            {new Date(announcement.createdAt).toLocaleDateString()}{" "}
                            {new Date(announcement.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 leading-relaxed">
                          {announcement.message}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
