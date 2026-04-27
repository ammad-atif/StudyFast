import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Mail, Lock, ArrowRight } from "lucide-react";
import { Input } from "../global/Input";
import { Link, Navigate } from "react-router-dom";
import { Card } from "../global/Card";
import { Button } from "./Button";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../api";
import { useNavigate } from "react-router-dom";
import { setCredentials } from "../../store/authSlice";
import { useAppDispatch, useAppSelector } from "../../store";
const signinSchema = z.object({
  email: z
    .string()
    .min(1, "Email is required")
    .email("Please enter a valid academic email"),
  password: z
    .string()
    .min(1, "Password is required")
    .min(8, "Password must be at least 8 characters"),
});

type SigninFormData = z.infer<typeof signinSchema>;

// User data returned from login endpoint
type UserLoginData = {
  _id: string;
  fullName: string;
  email: string;
  isVerified: boolean;
  token: string;
};

type LoginResponse = {
  message?: string;
  data?: UserLoginData;
};

type ApiErrorShape = {
  message?: string;
};

export const SigninForm = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SigninFormData>({
    resolver: zodResolver(signinSchema),
    mode: "onBlur",
    reValidateMode: "onChange",
  });

  // Mutation for login using the shared axios client with interceptors
  const loginMutation = useMutation<
    LoginResponse,
    ApiErrorShape,
    SigninFormData
  >({
    mutationFn: async (payload) =>
      api.post("/auth/login", {
        email: payload.email,
        password: payload.password,
      }),
    onSuccess: (response) => {
      if (response?.data?.token) {
        // Update global auth state and persistence in one action.
        dispatch(
          setCredentials({
            accessToken: response.data.token,
            user: {
              _id: response.data._id,
              fullName: response.data.fullName,
              email: response.data.email,
              isVerified: response.data.isVerified,
            },
          }),
        );
      }

      // alert(response?.message || "Login successful!");
      navigate("/", { replace: true }); // Redirect to dashboard after successful login
    },
    onError: (error) => {
      // Surface the normalized error message from interceptor
      alert(error?.message || "Login failed. Please try again.");
    },
  });

  const onSubmit = async (data: SigninFormData) => {
    // Call login mutation with email and password
    await loginMutation.mutateAsync(data);
  };

  // Redirect before rendering the form to avoid auth-page flicker.
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <>
      {/* Login Card */}
      <Card
        title="Login to StudyFAST"
        description="Welcome back to our academic community"
      />

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <Input
          label="Email Address"
          icon={<Mail className="w-4 h-4 text-slate-blue" />}
          type="email"
          placeholder="Enter your email address"
          error={errors.email?.message}
          {...register("email")}
        />

        <Input
          label="Password"
          icon={<Lock className="w-4 h-4 text-slate-blue" />}
          type="password"
          placeholder="••••••••"
          error={errors.password?.message}
          {...register("password")}
        />

        {/* Forget Password */}
        <div className="text-xs font-bold text-primary hover:underline text-right">
          <Link to="/forgot-password">Forgot Password?</Link>
        </div>

        {/* Primary Action Button */}
        <Button
          disabled={isSubmitting || loginMutation.isPending}
          type="submit"
          variant="primary"
        >
          {isSubmitting || loginMutation.isPending ? "Logging in..." : "Login"}
          {!isSubmitting && !loginMutation.isPending && (
            <ArrowRight size={18} />
          )}
        </Button>

        {/* Divider */}
        <div className="flex items-center gap-3">
          <div className="h-px bg-slate-200 flex-1" />
          <span className="text-xs text-slate-400 font-bold uppercase">or</span>
          <div className="h-px bg-slate-200 flex-1" />
        </div>

        {/* Secondary Action Button */}
        <Link to="/sign-up">
          <Button variant="secondary" type="button">
            Don't have an account? Register{" "}
          </Button>
        </Link>
      </form>
    </>
  );
};
