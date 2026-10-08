import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { toast } from "react-hot-toast";

export const ResetPassword = () => {
  const { resetPassword } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get("email") || "";

  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm({
    defaultValues: {
      otp: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const passwordVal = watch("newPassword");

  const onSubmit = async (data) => {
    if (!email) {
      toast.error("No email specified.");
      return;
    }

    setIsLoading(true);
    try {
      await resetPassword(email, data.otp, data.newPassword);
      toast.success("Password reset successfully! Please sign in.");
      navigate("/login");
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Failed to reset password. Please check the OTP code.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-indigo-400 to-indigo-600 bg-clip-text text-transparent">
          Reset Password
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Enter the OTP code and set your new password for{" "}
          <span className="font-semibold text-slate-300">{email}</span>
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10">
          <form className="space-y-4" onSubmit={handleSubmit(onSubmit)}>
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

            <Input
              label="New Password"
              type="password"
              placeholder="••••••••"
              error={errors.newPassword?.message}
              {...register("newPassword", {
                required: "New password is required",
                minLength: {
                  value: 8,
                  message: "Password must be at least 8 characters",
                },
                pattern: {
                  value:
                    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
                  message:
                    "Must include uppercase, lowercase, number, and special character",
                },
              })}
            />

            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              error={errors.confirmPassword?.message}
              {...register("confirmPassword", {
                required: "Please confirm your new password",
                validate: (val) =>
                  val === passwordVal || "Passwords do not match",
              })}
            />

            <div className="pt-2">
              <Button type="submit" className="w-full" isLoading={isLoading}>
                Reset Password
              </Button>
            </div>
          </form>

          <div className="mt-6 text-center text-sm">
            <Link
              to="/login"
              className="font-medium text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
