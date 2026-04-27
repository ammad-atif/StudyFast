import {
  Save,
  Verified,
  X,
  User,
  Mail,
  LayoutDashboard,
  LogOut,
} from "lucide-react";
import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { ProfileField } from "../components/profile/ProfileField";
import { Link, useNavigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "../store";
import { logout, setCredentials } from "../store/authSlice";
import { ChangeUsernameForm } from "../components/profile/ChangeUsernameForm";
import { api } from "../api";
import { getAvatarUrl } from "../utils/avatar";

type MessageResponse = {
  message?: string;
};

type ApiErrorShape = {
  message?: string;
};

export const ProfilePage = () => {
  const { user, accessToken } = useAppSelector((state) => state.auth);
  const verified = user?.isVerified || false;
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const [showChangeUsername, setShowChangeUsername] = useState(false);

  const displayName = user?.fullName || "Student";
  const displayEmail = user?.email || "No email available";
  const avatarSrc = getAvatarUrl(displayName || displayEmail);

  const resendVerificationMutation = useMutation<
    MessageResponse,
    ApiErrorShape,
    string
  >({
    mutationFn: async (email) =>
      api.post("/auth/resend-verification", { email }),
    onSuccess: (response) => {
      alert(response?.message || "Verification email has been sent.");
    },
    onError: (error) => {
      alert(error?.message || "Could not send verification email.");
    },
  });

  const handleLogout = () => {
    // Clear auth state and persisted session, then return to sign-in.
    dispatch(logout());
    navigate(-1); // Go back to previous page or you could navigate to "/sign-in" directly.
  };

  const handleNameUpdated = (newName: string) => {
    // Keep Redux/global auth user in sync after name update.
    if (user && accessToken) {
      dispatch(
        setCredentials({
          accessToken,
          user: {
            ...user,
            fullName: newName,
          },
        }),
      );
    }
  };

  return (
    <main className="min-h-screen flex flex-col items-center justify-center gap-8 p-8 bg-background-light">
      {/* Centered modal overlay for username update form */}
      {showChangeUsername && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
          onClick={() => setShowChangeUsername(false)}
        >
          <div
            className="w-full max-w-md"
            onClick={(event) => event.stopPropagation()}
          >
            <ChangeUsernameForm
              initialName={displayName}
              onCancel={() => setShowChangeUsername(false)}
              onNameUpdated={handleNameUpdated}
            />
          </div>
        </div>
      )}

      {/* Profile Card */}
      <div className="w-full max-w-xl bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        {/* Avatar Section */}
        <div className="flex flex-col items-center justify-center mb-8">
          <div className="relative ">
            <div className="h-28 w-28 rounded-full border-4 border-white overflow-hidden bg-slate-50 shadow-xl">
              <img
                src={avatarSrc}
                alt="User Avatar"
                className="h-full w-full object-cover"
              />
            </div>
          </div>

          {/* User name and email from global auth state */}
          <div className="mt-4 text-center">
            <h2 className="text-2xl font-black text-primary tracking-tight">
              {displayName}
            </h2>
            <p className="text-slate-400 text-sm font-bold  tracking-widest mt-1 opacity-70">
              {displayEmail}
            </p>
          </div>
        </div>

        {/* Content Area */}
        <div className="space-y-5">
          <div className="space-y-4">
            <ProfileField
              label="Full Name"
              value={displayName}
              icon={<User size={16} />}
              onEdit={() => setShowChangeUsername(true)}
            />
            <ProfileField
              label="Email Address"
              value={displayEmail}
              icon={<Mail size={16} />}
            />
          </div>

          {verified ? (
            <div className="p-5 rounded-2xl bg-emerald-50/50 border border-emerald-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Verified
                  size={22}
                  className="text-emerald-500 fill-emerald-500/10"
                />
                <span className="text-sm font-bold text-emerald-800">
                  You are a Verified Student
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-emerald-500 text-white tracking-widest">
                VERIFIED
              </span>
            </div>
          ) : (
            <div className="p-5 rounded-2xl bg-red-50/50 border border-red-100 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <X size={22} className="text-red-500 fill-red-500/10" />
                <span className="text-sm font-bold text-red-800">
                  You are not a Verified Student
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-lg text-[9px] font-black bg-red-500 text-white tracking-widest">
                  NOT VERIFIED
                </span>
                <button
                  type="button"
                  onClick={() => {
                    if (user?.email) {
                      resendVerificationMutation.mutate(user.email);
                    } else {
                      alert("No valid email found for verification.");
                    }
                  }}
                  disabled={resendVerificationMutation.isPending}
                  className="px-3 py-1.5 rounded-lg text-[10px] font-black bg-white text-red-700 border border-red-300 hover:bg-red-100 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  {resendVerificationMutation.isPending
                    ? "Sending..."
                    : "Verify Now"}
                </button>
              </div>
            </div>
          )}

          <div className="pt-6 space-y-3 hidden">
            <button className="w-full py-4 bg-primary text-white font-black rounded-2xl shadow-lg shadow-primary/10 hover:bg-[#1e293b] transition-all active:scale-[0.98] flex items-center justify-center gap-2">
              <Save size={18} />
              Save Changes
            </button>
            <Link
              to="/dashboard"
              className="w-full py-4 bg-secondary text-primary font-black rounded-2xl transition-all hover:bg-border-subtle flex items-center justify-center gap-2"
            >
              <LayoutDashboard size={18} />
              Back to Dashboard
            </Link>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            className="w-full max-w-xl py-4 bg-red-600 text-white font-black rounded-2xl shadow-lg shadow-red-600/20 hover:cursor-pointer transition-all flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>
        </div>
      </div>
    </main>
  );
};
