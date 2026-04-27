import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../global/Input";
import { Lock, ShieldCheck, CheckCircle2 } from "lucide-react";
import { Card } from "../global/Card";
import { Button } from "./Button";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../api";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useState } from "react";

const resetSchema = z
  .object({
    password: z.string().min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  });

type ResetFormData = z.infer<typeof resetSchema>;

type ApiResponse = {
  message?: string;
};

type ApiErrorShape = {
  message?: string;
};

export const ResetPasswordForm = () => {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetFormData>({
    resolver: zodResolver(resetSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const resetPasswordMutation = useMutation<
    ApiResponse,
    ApiErrorShape,
    ResetFormData
  >({
    mutationFn: async (payload) => {
      if (!token) {
        throw new Error("Reset token is missing.");
      }

      return api.post(`/auth/reset-password/${token}`, {
        password: payload.password,
      });
    },
    onSuccess: async (response) => {
      setSuccessMessage(
        response?.message || "Password reset successful. You can now log in.",
      );
      setTimeout(() => {
        navigate("/sign-in", { replace: true });
      }, 1200);
    },
    onError: (error) => {
      alert(error?.message || "Could not reset password.");
    },
  });

  const onSubmit = async (data: ResetFormData) => {
    setSuccessMessage(null);
    await resetPasswordMutation.mutateAsync(data);
  };

  if (!token) {
    return (
      <>
        <Card
          title="Reset Your Password"
          description="The reset link is invalid or missing. Please request a new one."
        />
        <Link to="/forgot-password" className="text-primary underline">
          Request reset link
        </Link>
      </>
    );
  }

  return (
    <>
      {/* Reset Password Card */}
      <Card
        title="Reset Your Password"
        description="Enter your new password below to regain access to your account."
      />

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Input
          label="New Password"
          icon={<Lock className="w-4 h-4 text-slate-blue" />}
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label="Confirm New Password"
          icon={<ShieldCheck className="w-4 h-4 text-slate-blue" />}
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {/* Primary Action Button */}
        <Button
          disabled={isSubmitting || resetPasswordMutation.isPending}
          type="submit"
          variant="primary"
        >
          {isSubmitting || resetPasswordMutation.isPending
            ? "Updating..."
            : "Update Password"}
          {!(isSubmitting || resetPasswordMutation.isPending) && (
            <CheckCircle2 size={18} />
          )}
        </Button>
      </form>
    </>
  );
};
