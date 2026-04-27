import React from "react";
import { Edit3 } from "lucide-react";

interface ProfileFieldProps {
  label: string;
  value: string;
  icon?: React.ReactNode;
  onEdit?: () => void;
}

export const ProfileField = ({
  label,
  value,
  icon,
  onEdit,
}: ProfileFieldProps) => {
  return (
    <div className="w-full">
      {/* Label */}
      <label className="text-primary text-[13px] font-bold flex items-center gap-2 mb-2">
        {icon && <span className="opacity-90">{icon}</span>}
        {label}
      </label>

      {/* Field Container */}
      <div className="w-full p-4 rounded-xl text-sm border border-slate-300 bg-slate-50/50 text-primary flex items-center justify-between">
        {/* Value Text */}
        <span className="font-medium tracking-tight">{value}</span>

        {/* Edit Icon */}
        <button
          type="button"
          onClick={onEdit}
          disabled={!onEdit}
          aria-label={`Edit ${label}`}
          className="text-slate-400 hover:text-primary transition-colors cursor-pointer"
        >
          <Edit3 size={18} />
        </button>
      </div>
    </div>
  );
};
