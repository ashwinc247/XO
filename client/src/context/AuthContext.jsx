import React, { createContext, useState, useEffect, useContext } from "react";
import api from "../services/api";
import { auth } from "../firebase";
import { signOut } from "firebase/auth";

const AuthContext = createContext(undefined);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchCurrentUser = async () => {
    try {
      const response = await api.get("/auth/me");
      if (response.data.success) {
        setUser(response.data.data.user);
        setProfile(response.data.data.profile);
      }
    } catch (error) {
      // Not logged in or expired session
      setUser(null);
      setProfile(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    if (token) {
      fetchCurrentUser();
    } else {
      setLoading(false);
    }

    const handleLogoutEvent = () => {
      setUser(null);
      setProfile(null);
    };

    window.addEventListener("auth_logout", handleLogoutEvent);
    return () => {
      window.removeEventListener("auth_logout", handleLogoutEvent);
    };
  }, []);

  const login = async (usernameOrEmail, password) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/login", {
        usernameOrEmail,
        password,
      });
      if (response.data.success) {
        const { accessToken, user: loggedUser } = response.data.data;
        localStorage.setItem("accessToken", accessToken);
        setUser(loggedUser);
        // Fetch full profile details
        const meRes = await api.get("/auth/me");
        if (meRes.data.success) {
          setProfile(meRes.data.data.profile);
        }
      }
    } finally {
      setLoading(false);
    }
  };

  const loginWithGoogle = async (idToken, referralCode = null) => {
    setLoading(true);
    try {
      const response = await api.post("/auth/google", {
        idToken,
        referralCode
      });
      if (response.data.success) {
        const { accessToken, user: loggedUser, isNewUser } = response.data.data;
        localStorage.setItem("accessToken", accessToken);
        setUser(loggedUser);
        const meRes = await api.get("/auth/me");
        if (meRes.data.success) {
          setProfile(meRes.data.data.profile);
        }
        return { isNewUser };
      }
    } finally {
      setLoading(false);
    }
  };


  const register = async (username, email, password, referralCode) => {
    setLoading(true);
    try {
      await api.post("/auth/register", {
        username,
        email,
        password,
        referralCode,
      });
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (email, otp) => {
    await api.post("/auth/verify-otp", { email, otp });
    if (user && user.email === email) {
      setUser({ ...user, isEmailVerified: true });
    }
  };

  const resendOtp = async (email) => {
    await api.post("/auth/send-otp", { email });
  };

  const forgotPassword = async (email) => {
    await api.post("/auth/forgot-password", { email });
  };

  const resetPassword = async (email, otp, newPassword) => {
    await api.post("/auth/reset-password", { email, otp, newPassword });
  };

  const logout = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("accessToken");
      await api.post("/auth/logout", { token });
      await signOut(auth).catch(() => {});
    } catch (e) {
      console.error("Logout error:", e);
    } finally {
      localStorage.removeItem("accessToken");
      setUser(null);
      setProfile(null);
      setLoading(false);
    }
  };

  const refreshUser = async () => {
    await fetchCurrentUser();
  };

  const updateProfileState = (newProfile) => {
    setProfile(newProfile);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        isAuthenticated: !!user,
        login,
        loginWithGoogle,
        register,
        verifyOtp,
        resendOtp,
        forgotPassword,
        resetPassword,
        logout,
        refreshUser,
        updateProfileState,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
