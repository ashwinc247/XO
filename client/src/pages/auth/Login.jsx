import React, { useState, useEffect } from "react";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import api from "../../services/api";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { toast } from "react-hot-toast";
import { auth } from "../../firebase";
import { signInWithPopup, GoogleAuthProvider } from "firebase/auth";

export const Login = () => {
  const { loginWithGoogle } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isMaintenanceOn, setIsMaintenanceOn] = useState(false);
  const [maintenanceTitle, setMaintenanceTitle] = useState("");
  const [showReferralInput, setShowReferralInput] = useState(false);
  const [referralCode, setReferralCode] = useState(searchParams.get("ref") || "");
  const [isReferralSubmitting, setIsReferralSubmitting] = useState(false);

  useEffect(() => {
    api.get("/maintenance/status")
      .then(res => {
        if (res.data.success && res.data.data.enabled) {
          setIsMaintenanceOn(true);
          setMaintenanceTitle(res.data.data.title || "Platform is currently under maintenance.");
        }
      })
      .catch(() => { });
  }, []);

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const idToken = await result.user.getIdToken();
      
      const authResponse = await loginWithGoogle(idToken, searchParams.get("ref") || null);
      
      if (authResponse?.isNewUser && !searchParams.get("ref")) {
         setShowReferralInput(true);
      } else {
         toast.success("Successfully logged in!");
         navigate("/home");
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'auth/popup-closed-by-user') {
        toast.error("Google sign-in was cancelled.");
      } else {
        toast.error(err.response?.data?.message || "Google sign-in failed. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleApplyReferral = async () => {
    if (!referralCode) {
      navigate("/home");
      return;
    }
    
    setIsReferralSubmitting(true);
    try {
      await api.post("/auth/apply-referral", { referralCode });
      toast.success("Referral code applied successfully!");
      navigate("/home");
    } catch (err) {
      toast.error(err.response?.data?.message || "Invalid referral code.");
    } finally {
      setIsReferralSubmitting(false);
    }
  };

  if (showReferralInput) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div className="sm:mx-auto sm:w-full sm:max-w-md">
          <h2 className="mt-6 text-center text-3xl font-extrabold text-white">
            Complete Account Setup
          </h2>
          <p className="mt-2 text-center text-sm text-slate-400">
            Have a referral code? Enter it below to claim your bonus!
          </p>
        </div>

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10">
            <div className="space-y-6">
              <Input
                label="Referral Code (Optional)"
                type="text"
                placeholder="e.g. A1B2C3D"
                value={referralCode}
                onChange={(e) => setReferralCode(e.target.value.toUpperCase())}
              />
              <div className="flex gap-4">
                <Button 
                  onClick={() => navigate("/home")} 
                  className="w-full bg-slate-800 hover:bg-slate-700" 
                  disabled={isReferralSubmitting}
                >
                  Skip
                </Button>
                <Button 
                  onClick={handleApplyReferral} 
                  className="w-full bg-indigo-600 hover:bg-indigo-700" 
                  isLoading={isReferralSubmitting}
                  disabled={!referralCode}
                >
                  Continue
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {isMaintenanceOn && (
          <div className="mb-4 bg-red-900/50 border border-red-500/50 rounded-lg p-4 text-center">
            <h3 className="text-red-200 font-bold text-lg mb-1">🔧 {maintenanceTitle}</h3>
            <p className="text-red-300 text-sm">Take a break and come back soon! ⏳</p>
          </div>
        )}
        <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
          XO Arena
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Sign in to your multiplayer battle arena
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10 flex flex-col items-center">
          <button
            onClick={handleGoogleLogin}
            disabled={isLoading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-gray-50 text-slate-900 px-4 py-3 border border-gray-200 rounded-lg shadow-sm transition-colors duration-200"
          >
            {isLoading ? (
              <svg className="animate-spin h-5 w-5 text-slate-900" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
            )}
            <span className="font-medium">Continue with Google</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default Login;
