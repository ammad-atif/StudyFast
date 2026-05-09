import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "../global/Input";
import { User, Mail, Lock, ShieldCheck } from "lucide-react";
import { Link } from "react-router-dom";
import { Card } from "../global/Card";
import { Button } from "./Button";
import { api } from "../../api";
import { useMutation } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";

const signupSchema = z
  .object({
    fullName: z
      .string()
      .min(1, "Name is required")
      .min(2, "Name must be at least 2 characters"),
    universityEmail: z
      .string()
      .email("Invalid university email")
      .optional(),
    personalEmail: z
      .string()
      .min(1, "Personal email is required")
      .email("Invalid email address"),
    password: z
      .string()
      .min(1, "Password is required")
      .min(8, "Password must be at least 8 characters"),
    confirmPassword: z.string().min(1, "Please confirm your password"),
  })
  .refine(
    (data) => {
      return data.password === data.confirmPassword;
    },
    {
      message: "Passwords don't match",
      path: ["confirmPassword"],
    },
  );

type SignupFormData = z.infer<typeof signupSchema>;

type RegisterResponse = {
  message?: string;
};

type ApiErrorShape = {
  message?: string;
};

export const SignupForm = () => {
  const navigate = useNavigate();
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SignupFormData>({
    resolver: zodResolver(signupSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  const signupMutation = useMutation<
    RegisterResponse,
    ApiErrorShape,
    {
      fullName: string;
      email: string;
      password: string;
    }
  >({
    mutationFn: async (payload) => api.post("/auth/register", payload),
    onSuccess: (response) => {
      alert(response?.message);

      setTimeout(() => {
        navigate("/sign-in");
      }, 3000);
    },
    onError: (error) => {
      // Interceptor normalizes the error object, so message is safe to surface.
      alert(error?.message);
    },
  });

  const onSubmit = async (data: SignupFormData) => {
    await signupMutation.mutateAsync({
      fullName: data.fullName,
      // Backend register accepts a single `email` field.
      email: data.personalEmail,
      password: data.password,
    });
  };

  return (
    <>
      {/* Signup Card */}
      <Card
        title="Create Account"
        description="Join our academic community today"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Full Name"
          icon={<User className="w-4 h-4 text-slate-blue" />}
          placeholder="Enter your full name"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* <Input
            label="University Email"
            icon={<Building2 className="w-4 h-4 text-slate-blue" />}
            placeholder="name@university.edu"
            type="email"
            error={errors.universityEmail?.message}
            {...register("universityEmail")}
          /> */}
          <div className="col-span-1 md:col-span-2">
            <Input
              label="Personal Email"
              icon={<Mail className="w-4 h-4 text-slate-blue" />}
              placeholder="name@example.com"
              type="email"
              error={errors.personalEmail?.message}
              {...register("personalEmail")}
            />
          </div>
        </div>

        <Input
          label="Password"
          icon={<Lock className="w-4 h-4 text-slate-blue" />}
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />

        <Input
          label="Confirm Password"
          icon={<ShieldCheck className="w-4 h-4 text-slate-blue" />}
          type="password"
          placeholder="••••••••"
          error={errors.confirmPassword?.message}
          {...register("confirmPassword")}
        />

        {/* Primary Action Button */}
        <Button
          disabled={isSubmitting || signupMutation.isPending}
          type="submit"
          variant="primary"
        >
          {isSubmitting || signupMutation.isPending
            ? "Creating Account..."
            : "Register Now"}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-xs text-slate-400 font-bold uppercase">or</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        {/* Secondary Action Button */}
        <Link to="/sign-in">
          <Button variant="secondary" type="button">
            Already have an account? Login
          </Button>
        </Link>
      </form>
    </>
  );
};
