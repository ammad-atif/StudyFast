import { useEffect } from "react";
import type { ReactNode } from "react";
import { X } from "lucide-react";

type AiModalShellProps = {
  isOpen: boolean;
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
};

export const AiModalShell = ({
  isOpen,
  title,
  subtitle,
  onClose,
  children,
  footer,
}: AiModalShellProps) => {
  useEffect(() => {
    if (!isOpen) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center px-4 py-6">
      <button
        type="button"
        aria-label="Close modal"
        className="absolute inset-0 bg-slate-950/60 backdrop-blur-md"
        onClick={onClose}
      />

      <section
        role="dialog"
        aria-modal="true"
        className="relative z-[71] w-full max-w-4xl max-h-[88vh] overflow-hidden rounded-[2rem] border border-white/20 bg-white shadow-[0_30px_80px_rgba(15,23,42,0.25)]"
      >
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-white via-slate-50 to-white px-6 py-5">
          <div>
            <p className="text-[11px] font-black uppercase tracking-[0.28em] text-primary/70">
              AI Workspace
            </p>
            <h2 className="mt-1 text-2xl font-black text-slate-900">{title}</h2>
            {subtitle ? (
              <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
            ) : null}
          </div>

          <button
            type="button"
            onClick={onClose}
            className="rounded-full border border-slate-200 bg-white p-2 text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="max-h-[calc(88vh-92px)] overflow-y-auto bg-[radial-gradient(circle_at_top,rgba(59,130,246,0.08),transparent_28%),linear-gradient(180deg,rgba(248,250,252,0.96),white)] px-6 py-6">
          {children}
        </div>

        {footer ? (
          <div className="border-t border-slate-100 bg-white px-6 py-4">
            {footer}
          </div>
        ) : null}
      </section>
    </div>
  );
};
