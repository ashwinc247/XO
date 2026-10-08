import React, { useEffect } from "react";
import { useSocket } from "../../context/SocketContext";
import { useAuth } from "../../context/AuthContext";

export const WalletSync = () => {
  const { socket } = useSocket();
  const { profile, updateProfileState } = useAuth();

  useEffect(() => {
    if (!socket || !profile) return;

    const handleWalletUpdated = (data) => {
      console.log("[WalletSync] Wallet updated:", data);
      if (data && typeof data.balance === "number") {
        updateProfileState({
          ...profile,
          walletBalance: data.balance,
        });
      }
    };

    socket.on("wallet_updated", handleWalletUpdated);

    return () => {
      socket.off("wallet_updated", handleWalletUpdated);
    };
  }, [socket, profile, updateProfileState]);

  return null; // This is a logic-only component
};
