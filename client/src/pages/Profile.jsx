import React, { useState, useRef } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import api from "../services/api";
import { Card } from "../components/common/Card";
import { Input } from "../components/common/Input";
import { Button } from "../components/common/Button";
import { toast } from "react-hot-toast";
import { Camera, User, Swords, Trophy, Award, AlertTriangle, ShieldCheck } from "lucide-react";

export const Profile = () => {
  const { user, profile, refreshUser, updateProfileState } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [formData, setFormData] = React.useState({
    withdrawalUpiId: profile?.withdrawalUpiId || "",
    mobileNumber: profile?.mobileNumber || "",
    isWhatsapp: profile?.isWhatsapp || false,
    address: profile?.address || "",
    state: profile?.state || "",
    country: profile?.country || "",
  });
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const handleProfileSubmit = async (e) => {
    e.preventDefault();
    if (!formData.withdrawalUpiId || !formData.mobileNumber || !formData.state || !formData.country) {
      return toast.error("Please fill all required fields.");
    }

    setIsSubmitting(true);
    try {
      const response = await api.put("/users/profile", {
        ...formData,
        isProfileCompleted: true,
      });
      if (response.data.success) {
        toast.success("Profile details saved permanently!");
        updateProfileState(response.data.data);
        navigate("/home");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to update profile.");
    } finally {
      setIsSubmitting(false);
    }
  };



  const handleAvatarChange = async (e) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const file = files[0];
    // Validation rules: max size 2MB, types jpg/png/webp
    if (file.size > 2 * 1024 * 1024) {
      toast.error("File size exceeds 2MB limit.");
      return;
    }

    const allowedTypes = ["image/png", "image/jpeg", "image/jpg", "image/webp"];
    if (!allowedTypes.includes(file.type)) {
      toast.error("Invalid file type. Allowed: PNG, JPG, JPEG, WEBP.");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    setIsUploadingAvatar(true);
    try {
      const response = await api.post("/users/avatar", formData, {
        headers: {
          "Content-Type": "multipart/form-data",
        },
      });

      if (response.data.success) {
        updateProfileState(response.data.data.profile);
        toast.success("Avatar uploaded successfully!");
      }
    } catch (err) {
      toast.error(err.response?.data?.message || "Failed to upload avatar.");
    } finally {
      setIsUploadingAvatar(false);
    }
  };

  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const stats = profile?.statistics || {
    gamesPlayed: 0,
    wins: 0,
    losses: 0,
    draws: 0,
    rating: 1200,
    winRate: 0,
  };

  const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api/v1";
  const socketHost = API_URL.replace("/api/v1", "");
  const avatarSrc = profile?.avatarUrl
    ? profile.avatarUrl.startsWith("http")
      ? profile.avatarUrl
      : `${socketHost}${profile.avatarUrl}`
    : "";

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-white mb-2 text-center">
        My Profile
      </h1>

      <div className="flex flex-col space-y-6">
        {/* Avatar and Info */}
        <div className="space-y-6">
          <Card className="text-center p-6 relative">
            <div className="flex flex-col items-center w-full">
              <div
                className="relative group cursor-pointer w-24 h-24"
                onClick={() => fileInputRef.current?.click()}
              >
              <div className="w-24 h-24 rounded-full bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center text-slate-350">
                {avatarSrc ? (
                  <img
                    src={avatarSrc}
                    alt="Avatar"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <User size={40} />
                )}
              </div>
              <div className="absolute inset-0 bg-slate-950/60 rounded-full opacity-0 group-hover:opacity-100 flex items-center justify-center text-white transition-opacity">
                {isUploadingAvatar ? (
                  <svg
                    className="animate-spin h-5 w-5 text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    />
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    />
                  </svg>
                ) : (
                  <Camera size={20} />
                )}
              </div>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".png,.jpg,.jpeg,.webp"
              className="hidden"
              onChange={handleAvatarChange}
              disabled={isUploadingAvatar}
            />

            <h2 className="mt-4 text-xl font-extrabold text-white">
              {user?.username}
            </h2>
            <span className="text-sm text-slate-500 font-medium block mb-1">
              {user?.email}
            </span>
            <span className="text-xs bg-slate-800 text-slate-300 px-2 py-0.5 rounded font-mono border border-slate-700 inline-block">
              UID:{profile?.referralCode}
            </span>

            {/* Ratings Badge */}
            <div className="mt-3 flex items-center justify-center gap-1 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-xs font-bold px-3 py-1 rounded-full w-fit">
              <Trophy size={12} />
              <span>ELO Rating: {stats.rating}</span>
            </div>
            </div>
          </Card>

          {/* Quick Statistics */}
          <Card title="Gamer Statistics">
            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="p-3 bg-slate-850 rounded-lg border border-slate-800">
                <Swords size={16} className="text-indigo-400 mx-auto mb-1" />
                <span className="block text-[10px] text-slate-500 font-bold uppercase">
                  Played
                </span>
                <span className="block text-lg font-black text-slate-200">
                  {stats.gamesPlayed}
                </span>
              </div>
              <div className="p-3 bg-slate-850 rounded-lg border border-slate-800">
                <Trophy size={16} className="text-emerald-400 mx-auto mb-1" />
                <span className="block text-[10px] text-slate-500 font-bold uppercase">
                  Wins
                </span>
                <span className="block text-lg font-black text-slate-200">
                  {stats.wins}
                </span>
              </div>
              <div className="p-3 bg-slate-850 rounded-lg border border-slate-800">
                <Award size={16} className="text-rose-400 mx-auto mb-1" />
                <span className="block text-[10px] text-slate-500 font-bold uppercase">
                  Losses
                </span>
                <span className="block text-lg font-black text-slate-200">
                  {stats.losses}
                </span>
              </div>
            </div>
          </Card>
        </div>

        {/* Verification Form */}
        <Card title="Personal Details & Verification">
          {!profile?.isProfileCompleted && (
            <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-start gap-3">
              <AlertTriangle className="flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm">
                <span className="font-bold block mb-1">IMPORTANT: ONE-TIME UPDATE ONLY</span>
                Please fill in your details correctly. These details can only be submitted once. If you submit wrong details, you will have to contact customer support to change them.
              </div>
            </div>
          )}

          {profile?.isProfileCompleted && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-start gap-3">
              <ShieldCheck className="flex-shrink-0 mt-0.5" size={18} />
              <div className="text-sm">
                <span className="font-bold block mb-1">PROFILE VERIFIED</span>
                Your details have been locked securely. To change these details, please contact customer support.
              </div>
            </div>
          )}

          <form onSubmit={handleProfileSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="UPI ID (For Withdrawals) *"
                placeholder="e.g. 9876543210@ybl"
                value={profile?.isProfileCompleted ? profile?.withdrawalUpiId : formData.withdrawalUpiId}
                onChange={(e) => setFormData({ ...formData, withdrawalUpiId: e.target.value })}
                disabled={profile?.isProfileCompleted || isSubmitting}
                required
              />
              <div className="space-y-1">
                <Input
                  label="Mobile Number *"
                  placeholder="e.g. 9876543210"
                  value={profile?.isProfileCompleted ? profile?.mobileNumber : formData.mobileNumber}
                  onChange={(e) => setFormData({ ...formData, mobileNumber: e.target.value })}
                  disabled={profile?.isProfileCompleted || isSubmitting}
                  required
                />
                <label className="flex items-center gap-2 mt-2 text-sm text-slate-300 cursor-pointer pl-1">
                  <input
                    type="checkbox"
                    className="rounded border-slate-700 bg-slate-800 text-indigo-500 focus:ring-indigo-500/50"
                    checked={profile?.isProfileCompleted ? profile?.isWhatsapp : formData.isWhatsapp}
                    onChange={(e) => setFormData({ ...formData, isWhatsapp: e.target.checked })}
                    disabled={profile?.isProfileCompleted || isSubmitting}
                  />
                  Is this number available on WhatsApp?
                </label>
              </div>
              <Input
                label="State *"
                placeholder="e.g. Maharashtra"
                value={profile?.isProfileCompleted ? profile?.state : formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                disabled={profile?.isProfileCompleted || isSubmitting}
                required
              />
              <Input
                label="Country *"
                placeholder="e.g. India"
                value={profile?.isProfileCompleted ? profile?.country : formData.country}
                onChange={(e) => setFormData({ ...formData, country: e.target.value })}
                disabled={profile?.isProfileCompleted || isSubmitting}
                required
              />
              <div className="md:col-span-2">
                <Input
                  label="Full Address (Optional)"
                  placeholder="e.g. 123 Main St, City"
                  value={profile?.isProfileCompleted ? profile?.address : formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  disabled={profile?.isProfileCompleted || isSubmitting}
                />
              </div>
            </div>

            {!profile?.isProfileCompleted && (
              <div className="pt-4 flex justify-end">
                <Button type="submit" isLoading={isSubmitting} variant="primary">
                  Submit Details Permanently
                </Button>
              </div>
            )}
          </form>
        </Card>
      </div>
    </div>
  );
};

export default Profile;
