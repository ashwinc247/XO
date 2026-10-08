import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { useAuth } from "../../context/AuthContext";
import { useNavigate } from "react-router-dom";
import { Input } from "../../components/common/Input";
import { Button } from "../../components/common/Button";
import { toast } from "react-hot-toast";
import { ShieldAlert } from "lucide-react";

export const AdminLogin = () => {
  const { login, logout } = useAuth();
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    defaultValues: {
      usernameOrEmail: "",
      password: "",
    },
  });

  const onSubmit = async (data) => {
    setIsLoading(true);
    try {
      await login(data.usernameOrEmail, data.password);
      // Wait for user state to be populated
      // Fetch user role from localStorage/JWT or state
      const token = localStorage.getItem("accessToken");
      if (token) {
        // Parse JWT role
        const payload = JSON.parse(atob(token.split(".")[1]));
        if (payload.role !== "admin") {
          toast.error("Access denied. Admin role required.");
          await logout();
          return;
        }
        toast.success("Admin login successful!");
        navigate("/admin/dashboard");
      }
    } catch (err) {
      const msg =
        err.response?.data?.message ||
        "Login failed. Please check your credentials.";
      toast.error(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <div className="mx-auto w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-center justify-center text-rose-400">
          <ShieldAlert size={24} />
        </div>
        <h2 className="mt-6 text-center text-3xl font-extrabold bg-gradient-to-r from-rose-400 to-indigo-600 bg-clip-text text-transparent">
          XO Arena Admin
        </h2>
        <p className="mt-2 text-center text-sm text-slate-400">
          Secure Portal for Platform Administrators
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-slate-900 border border-slate-800 py-8 px-4 shadow-xl rounded-xl sm:px-10">
          <form className="space-y-6" onSubmit={handleSubmit(onSubmit)}>
            <Input
              label="Admin ID / Email"
              type="text"
              placeholder="admin"
              error={errors.usernameOrEmail?.message}
              {...register("usernameOrEmail", {
                required: "Credentials are required",
              })}
            />

            <Input
              label="Secure Password"
              type="password"
              placeholder="••••••••"
              error={errors.password?.message}
              {...register("password", {
                required: "Password is required",
              })}
            />

            <div>
              <Button
                type="submit"
                className="w-full bg-rose-600 hover:bg-rose-700 shadow-rose-600/30"
                isLoading={isLoading}
              >
                Access Dashboard
              </Button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;
