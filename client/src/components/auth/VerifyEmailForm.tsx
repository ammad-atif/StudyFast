import { useEffect, useRef } from "react";
import { useParams, Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { api } from "../../api";

type VerifyResponse = {
  message?: string;
};

type ApiErrorShape = {
  message?: string;
};

export const VerifyEmailForm = () => {
  const { token } = useParams<{ token: string }>();
  const hasRequestedRef = useRef(false);

  // Mutation for email verification using the shared axios client
  const { mutate, isPending, isSuccess, isError } = useMutation<
    VerifyResponse,
    ApiErrorShape,
    string
  >({
    mutationFn: async (verificationToken) =>
      api.get(`/auth/verify-email/${verificationToken}`),
    onSuccess: async (response) => {
      // Optionally show a success message before redirecting
      alert(
        response?.message ||
          "Email verified successfully! Redirecting to sign-in.",
      );
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 3000); // Redirect after 3 seconds
    },
    onError: async (error) => {
      // Optionally show an error message before redirecting
      alert(error?.message || "Email verification failed. Please try again.");
      setTimeout(() => {
        window.location.href = "/sign-in";
      }, 3000);
    },
  });

  // Trigger verification when component mounts or token changes
  useEffect(() => {
    // Guard against duplicate requests in React StrictMode/dev re-renders.
    if (!token || hasRequestedRef.current) return;
    hasRequestedRef.current = true;
    mutate(token);
  }, [token, mutate]);

  return (
    <div className="flex items-center justify-center min-h-screen">
      {/* Loading state: show spinner cursor and message */}
      {isPending && (
        <div className="text-center">
          <div className="inline-block">
            {/* Spinner cursor indicator */}
            <div className="animate-spin rounded-full h-12 w-12 border-4 border-slate-200 border-t-primary"></div>
          </div>
          <p className="mt-4 text-slate-600 font-semibold">
            Verifying your email...
          </p>
        </div>
      )}

      {/* Error/Success - will redirect automatically */}
      {(isSuccess || isError) && (
        <div className="text-center">
          <p className="text-slate-600 text-2xl font-bold">
            {isSuccess && "Email verified successfully!"}
          </p>
          <p className="text-red-400 text-2xl font-bold">
            {isError && "Email verification failed."}
          </p>
          <Link to="/sign-in" className="text-primary underline">
            Return
          </Link>
        </div>
      )}

      {/* If no token in URL */}
      {!token && (
        <div className="text-center">
          <p className="text-red-600 font-semibold">
            Invalid verification link
          </p>
        </div>
      )}
    </div>
  );
};
