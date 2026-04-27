import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Link } from "react-router-dom";
import { Input } from "../global/Input";
import { Button } from "./Button";
import { Mail, ArrowLeft, Send } from "lucide-react";
import { Card } from "../global/Card";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../api";
import { useState } from "react";

const forgotSchema = z.object({
  email: z.string().email("Please enter a valid university email"),
});

type ForgotFormData = z.infer<typeof forgotSchema>;

type ApiResponse = {
  message?: string;
};

type ApiErrorShape = {
  message?: string;
};

export const ForgotPasswordForm = () => {
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotFormData>({
    resolver: zodResolver(forgotSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const forgotPasswordMutation = useMutation<
    ApiResponse,
    ApiErrorShape,
    ForgotFormData
  >({
    mutationFn: async (payload) =>
      api.post("/auth/forgot-password", { email: payload.email }),
    onSuccess: (response) => {
      setSuccessMessage(
        response?.message ||
          "If the account exists, a password reset link has been sent.",
      );
    },
    onError: (error) => {
      alert(error?.message || "Could not send reset link.");
    },
  });

  const onSubmit = async (data: ForgotFormData) => {
    setSuccessMessage(null);
    await forgotPasswordMutation.mutateAsync(data);
  };

  return (
    <>
      {/* {Card} */}

      <Card
        title="Forgot Password?"
        description="Enter your email and we'll send you instructions to reset your password."
      ></Card>

      {successMessage && (
        <div className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-700">
          {successMessage}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
        <Input
          label="Email Address"
          icon={<Mail className="w-4 h-4 text-slate-blue" />}
          type="email"
          placeholder="name@university.edu"
          error={errors.email?.message}
          {...register("email")}
        />

        <Button
          disabled={isSubmitting || forgotPasswordMutation.isPending}
          variant="primary"
          type="submit"
        >
          {isSubmitting || forgotPasswordMutation.isPending
            ? "Sending..."
            : "Send Reset Link"}
          {!(isSubmitting || forgotPasswordMutation.isPending) && (
            <Send size={18} />
          )}
        </Button>
      </form>

      {/* Back to Login Link */}
      <Link to="/sign-in">
        <div className="mt-10 flex items-center justify-center gap-2 text-sm font-bold text-slate-blue hover:text-primary transition-colors group cursor-pointer">
          <ArrowLeft
            size={16}
            className="group-hover:-translate-x-3 transition-transform"
          />
          Back to Login
        </div>
      </Link>
    </>
  );
};
