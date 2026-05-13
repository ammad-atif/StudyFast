import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Sparkles, FileText, MessageSquareText } from "lucide-react";
import { api } from "../../api";
import {
  splitIntoParagraphs,
  splitIntoSentences,
  type SummaryResponseData,
  unwrapEnvelope,
} from "./aiTypes";
import { AiModalShell } from "./AiModalShell";

type SummaryModalProps = {
  isOpen: boolean;
  postId: string;
  postTitle: string;
  onClose: () => void;
};

export const SummaryModal = ({ isOpen, postId, postTitle, onClose }: SummaryModalProps) => {
  const queryKey = ["post", postId, "summary"];

  const { data: summaryData, isLoading, isError, error } = useQuery<string, unknown>({
    queryKey,
    queryFn: async (): Promise<string> => {
      const response = await api.post("/ai/summary", { postId });
      const payload = unwrapEnvelope<SummaryResponseData>(response);
      return payload?.summary || "";
    },
    enabled: Boolean(isOpen && postId),
    staleTime: Infinity, // summary won't change — cache forever
  });

  const summary = summaryData || "";

  const sentences = useMemo(() => splitIntoSentences(summary), [summary]);
  const paragraphs = useMemo(() => splitIntoParagraphs(summary), [summary]);

  const highlights = useMemo(() => {
    const bulletLines = paragraphs.filter((line) => /^[-*•]/.test(line));
    if (bulletLines.length > 0) {
      return bulletLines.map((line) => line.replace(/^[-*•]\s*/, ""));
    }

    return sentences.slice(0, 4);
  }, [paragraphs, sentences]);

  const wordCount = summary.trim() ? summary.trim().split(/\s+/).length : 0;

  return (
    <AiModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Summary"
      subtitle={postTitle}
    >
      <div className="grid gap-5 lg:grid-cols-[1.2fr_0.8fr]">
        <section className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-3">
            <div className="rounded-2xl bg-primary/10 p-3 text-primary">
              <Sparkles size={18} />
            </div>
            <div>
              <p className="text-xs font-black uppercase tracking-[0.2em] text-primary/70">
                Executive Summary
              </p>
              <h3 className="text-lg font-black text-slate-900">Readable breakdown of the post</h3>
            </div>
          </div>

          {isLoading && (
            <div className="space-y-3">
              <div className="h-4 w-2/3 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-11/12 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-4/5 animate-pulse rounded-full bg-slate-100" />
            </div>
          )}

          {isError && (
            <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm font-semibold text-red-700">
              {((error instanceof Error && error.message) || (error && (error as Record<string, unknown>).message) || "Failed to generate summary.") as string}
            </div>
          )}

          {!isLoading && !isError && summary && (
            <div className="space-y-4">
              {paragraphs.map((paragraph, index) => (
                <p key={`${index}-${paragraph}`} className="text-sm leading-7 text-slate-700 whitespace-pre-wrap">
                  {paragraph}
                </p>
              ))}
            </div>
          )}

          {!isLoading && !isError && !summary && (
            <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 p-6 text-sm text-slate-500">
              The summary will appear here once the AI finishes processing.
            </div>
          )}
        </section>

        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <FileText size={18} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
                  Post Snapshot
                </p>
                <p className="mt-1 text-lg font-black">{wordCount} words summarized</p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="mb-3 flex items-center gap-2 text-slate-900">
              <MessageSquareText size={16} className="text-primary" />
              <h4 className="text-sm font-black uppercase tracking-[0.18em]">Key Takeaways</h4>
            </div>

            <div className="space-y-3">
              {highlights.length > 0 ? (
                highlights.map((highlight, index) => (
                  <div
                    key={`${index}-${highlight}`}
                    className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-700"
                  >
                    {highlight}
                  </div>
                ))
              ) : (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-500">
                  Highlights will appear here.
                </div>
              )}
            </div>
          </div>
        </aside>
      </div>
    </AiModalShell>
  );
};