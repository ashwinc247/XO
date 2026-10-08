import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { toast } from "react-hot-toast";

export const VerifyEmail = () => {
  const { verifyOtp, resendOtp } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [isLoading, setIsLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [timeLeft, setTimeLeft] = useState(300); // 5 minutes

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      otp: "",
    },
  });

  useEffect(() => {
    if (!email) {
      toast.error("No email specified for verification.");
      navigate("/login");
      return;
    }

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [email, navigate]);

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await verifyOtp(email, data.otp);
      toast.success("Email verified successfully! You can now log in.");
      navigate("/login");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Verification failed. Please check the OTP code.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    setResendLoading(true);
    try {
      await resendOtp(email);
      toast.success("A new OTP has been sent to your email.");
      setTimeLeft(300); // Reset timer to 5 minutes
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Could not resend OTP. Please try again later.";
      toast.error(msg);
    } finally {
      setResendLoading(false);
    }
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
          Verify Email
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enter the 6-digit OTP code sent to{" "}
          <span className="font-semibold text-slate-300">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="OTP Code"
              type="text"
              placeholder="123456"
              maxLength={6}
              error={errors.otp?.message}
              {...register("otp", {
                required: "OTP code is required",
                pattern: {
                  value: /^[0-9]{6}$/,
                  message: "OTP code must be exactly 6 digits",
                },
              })}
            />

            <div className="flex items-center justify-between text-sm">
              <span className="text-slate-500">
                Expires in:{" "}
                <span className="font-bold text-slate-400">
                  {formatTime(timeLeft)}
                </span>
              </span>

              <button
                type="button"
                onClick={handleResend}
                disabled={timeLeft > 0 || resendLoading}
                className="font-medium text-indigo-400 hover:text-indigo-300 disabled:text-slate-600 transition-colors cursor-pointer"
              >
                {resendLoading ? "Resending..." : "Resend OTP"}
              </button>
            </div>

            <div>
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Verify Code
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default VerifyEmail;
