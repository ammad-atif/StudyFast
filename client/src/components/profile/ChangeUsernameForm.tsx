import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation } from "@tanstack/react-query";
import { User, Lock } from "lucide-react";
import { Input } from "../global/Input";
import { Button } from "../auth/Button";
import { api } from "../../api";

const changeUsernameSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Username must be at least 2 characters")
    .max(50, "Username cannot exceed 50 characters"),
  currentPassword: z.string().min(1, "Password confirmation is required"),
});

type ChangeUsernameFormData = z.infer<typeof changeUsernameSchema>;

type ChangeNameResponse = {
  message?: string;
  data?: {
    fullName?: string;
  };
};

type ApiErrorShape = {
  message?: string;
};

type ChangeUsernameFormProps = {
  initialName: string;
  onCancel: () => void;
  onNameUpdated: (newName: string) => void;
};

export const ChangeUsernameForm = ({
  initialName,
  onCancel,
  onNameUpdated,
}: ChangeUsernameFormProps) => {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ChangeUsernameFormData>({
    resolver: zodResolver(changeUsernameSchema),
    defaultValues: {
      fullName: initialName,
      currentPassword: "",
    },
    mode: "onBlur",
  });

  const changeNameMutation = useMutation<
    ChangeNameResponse,
    ApiErrorShape,
    ChangeUsernameFormData
  >({
    mutationFn: async (payload) => api.patch("/auth/change-name", payload),
    onSuccess: (response, variables) => {
      // Update profile name in parent/global state after successful API response.
      onNameUpdated(response?.data?.fullName || variables.fullName);
      alert(response?.message || "Username updated successfully.");
      onCancel();
    },
    onError: (error) => {
      alert(error?.message || "Could not update username.");
    },
  });

  const onSubmit = async (data: ChangeUsernameFormData) => {
    await changeNameMutation.mutateAsync(data);
  };

  return (
    <div className="w-full rounded-2xl border border-slate-200 bg-white/95 p-4 shadow-2xl shadow-slate-900/10 backdrop-blur-sm">
      <h3 className="text-sm font-black text-primary tracking-wide mb-4">
        Update Username
      </h3>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <Input
          label="New Username"
          icon={<User size={16} className="text-slate-blue" />}
          placeholder="Enter your new username"
          error={errors.fullName?.message}
          {...register("fullName")}
        />

        <Input
          label="Confirm Password"
          icon={<Lock size={16} className="text-slate-blue" />}
          type="password"
          placeholder="Enter your current password"
          error={errors.currentPassword?.message}
          {...register("currentPassword")}
        />

        <div className="flex gap-3 pt-2">
          <Button
            type="submit"
            variant="primary"
            disabled={isSubmitting || changeNameMutation.isPending}
          >
            {isSubmitting || changeNameMutation.isPending
              ? "Updating..."
              : "Save Username"}
          </Button>

          <Button
            type="button"
            variant="secondary"
            onClick={onCancel}
            disabled={isSubmitting || changeNameMutation.isPending}
          >
            Cancel
          </Button>
        </div>
      </form>
    </div>
  );
};
