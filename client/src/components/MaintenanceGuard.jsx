import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import api from '../services/api';

export const MaintenanceGuard = ({ children }) => {
  const { user, logout } = useAuth();
  const { socket } = useSocket();
  const [isMaintenanceOn, setIsMaintenanceOn] = useState(false);
  const [maintenanceDetails, setMaintenanceDetails] = useState(null);

  useEffect(() => {
    const checkStatus = async () => {
      try {
        const res = await api.get('/maintenance/status');
        if (res.data.success && res.data.data.enabled) {
          setIsMaintenanceOn(true);
          setMaintenanceDetails(res.data.data);
        }
      } catch (err) {
        // Assume false if the check fails completely
      }
    };
    checkStatus();
  }, []);

  useEffect(() => {
    if (!socket) return;
    
    const handleMaintenanceEvent = (data) => {
      if (data.enabled) {
        setIsMaintenanceOn(true);
        setMaintenanceDetails(data);
      } else {
        setIsMaintenanceOn(false);
        setMaintenanceDetails(null);
      }
    };

    socket.on('maintenance_enabled', handleMaintenanceEvent);
    socket.on('maintenance_disabled', handleMaintenanceEvent); // Optional future-proofing
    
    return () => {
      socket.off('maintenance_enabled', handleMaintenanceEvent);
      socket.off('maintenance_disabled', handleMaintenanceEvent);
    };
  }, [socket]);

  if (user?.role === 'admin') {
    return <>{children}</>;
  }

  if (isMaintenanceOn) {
    return (
      <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-950/90 backdrop-blur-md">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl max-w-md w-full mx-4 text-center">
          <div className="text-5xl mb-6">🔧</div>
          <h2 className="text-2xl font-bold text-white mb-4">
            {maintenanceDetails?.title || "Scheduled Maintenance"}
          </h2>
          <p className="text-slate-400 mb-8">
            {maintenanceDetails?.description || "The platform is currently undergoing maintenance checks. Please try again later."}
          </p>
          <button 
            onClick={() => {
              setIsMaintenanceOn(false);
              logout();
            }}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-3 px-6 rounded-lg transition-colors"
          >
            OK
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};
