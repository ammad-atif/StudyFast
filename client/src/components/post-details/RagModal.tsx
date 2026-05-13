import { useEffect, useMemo, useState } from "react";
import { Bot, CheckCircle2, Lock, MessagesSquare, Send, Sparkles } from "lucide-react";
import { api } from "../../api";
import {
  type EmbeddingStatusData,
  type RagResponseData,
  unwrapEnvelope,
} from "./aiTypes";
import { AiModalShell } from "./AiModalShell";

type RagModalProps = {
  isOpen: boolean;
  postId: string;
  postTitle: string;
  onClose: () => void;
};

export const RagModal = ({ isOpen, postId, postTitle, onClose }: RagModalProps) => {
  const [embeddingStatus, setEmbeddingStatus] = useState<EmbeddingStatusData | null>(null);
  const [statusLoading, setStatusLoading] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState<RagResponseData | null>(null);
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) {
      return;
    }

    let active = true;

    const loadStatus = async () => {
      setStatusLoading(true);
      setError(null);
      setAnswer(null);

      try {
        const response = await api.get(`/ai/embeddings/${postId}/status`);
        const payload = unwrapEnvelope<EmbeddingStatusData>(response);

        if (active) {
          setEmbeddingStatus(payload);
        }
      } catch (err: any) {
        if (active) {
          setEmbeddingStatus(null);
          setError(err?.message || "Failed to check embedding status.");
        }
      } finally {
        if (active) {
          setStatusLoading(false);
        }
      }
    };

    setQuestion("");
    loadStatus();

    return () => {
      active = false;
    };
  }, [isOpen, postId]);

  const isReady = embeddingStatus?.status === "completed";

  const readyText = useMemo(() => {
    if (statusLoading) {
      return "Checking embedding status...";
    }

    if (!embeddingStatus?.status) {
      return "Embedding status unavailable.";
    }

    if (isReady) {
      return "Embeddings ready for retrieval.";
    }

    return `Embeddings are ${embeddingStatus.status}.`;
  }, [embeddingStatus?.status, isReady, statusLoading]);

  const handleAsk = async () => {
    const trimmedQuestion = question.trim();
    if (!trimmedQuestion) {
      setError("Please type a question before asking.");
      return;
    }

    setAsking(true);
    setError(null);
    setAnswer(null);

    try {
      const response = await api.post("/ai/answer", {
        postId,
        query: trimmedQuestion,
      });
      const payload = unwrapEnvelope<RagResponseData>(response);
      if (payload) {
        setAnswer(payload);
      }
    } catch (err: any) {
      const statusCode = err?.statusCode;
      if (statusCode === 409) {
        setError("Embeddings are not completed yet. Please wait until processing finishes.");
      } else {
        setError(err?.message || "Failed to fetch an answer.");
      }
    } finally {
      setAsking(false);
    }
  };

  return (
    <AiModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Ask with RAG"
      subtitle={postTitle}
    >
      <div className="grid gap-5 lg:grid-cols-[0.92fr_1.08fr]">
        <aside className="space-y-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-slate-900 p-5 text-white shadow-sm">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl bg-white/10 p-3">
                <Bot size={18} />
              </div>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.22em] text-white/60">
                  Retrieval Assistant
                </p>
                <p className="mt-1 text-lg font-black">RAG question mode</p>
              </div>
            </div>
          </div>

          <div className={`rounded-[1.5rem] border p-5 shadow-sm ${isReady ? "border-emerald-200 bg-emerald-50" : "border-amber-200 bg-amber-50"}`}>
            <div className="flex items-center gap-2 text-sm font-black uppercase tracking-[0.18em] text-slate-700">
              {isReady ? <CheckCircle2 size={16} className="text-emerald-600" /> : <Lock size={16} className="text-amber-700" />}
              Embedding status
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-700">{readyText}</p>
            {embeddingStatus?.jobId ? (
              <p className="mt-2 text-xs font-semibold text-slate-500">Job ID: {embeddingStatus.jobId}</p>
            ) : null}
          </div>

          <div className="rounded-[1.5rem] border border-primary/20 bg-primary/5 p-5 text-sm text-slate-700">
            <div className="flex items-center gap-2 font-bold text-primary">
              <Sparkles size={16} />
              Smart prompt
            </div>
            <p className="mt-2 leading-6">
              Ask a specific question and the assistant will answer from the chunks linked to this post.
            </p>
          </div>
        </aside>

        <section className="space-y-4">
          <div className="rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
            <label className="mb-2 block text-sm font-black uppercase tracking-[0.18em] text-slate-500">
              Your question
            </label>
            <textarea
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask something specific about the post..."
              rows={4}
              className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm leading-6 text-slate-800 outline-none transition-colors placeholder:text-slate-400 focus:border-primary focus:bg-white focus:ring-4 focus:ring-primary/10"
            />

            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-slate-500">
                Server checks embedding completion before forwarding the request.
              </p>

              <button
                type="button"
                onClick={handleAsk}
                disabled={asking || !question.trim() || !isReady}
                className="inline-flex items-center gap-2 rounded-2xl bg-primary px-5 py-3 text-sm font-black text-white transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {asking ? "Asking..." : "Ask"}
                <Send size={15} />
              </button>
            </div>
          </div>

          {statusLoading && (
            <div className="space-y-3 rounded-[1.5rem] border border-slate-200 bg-white p-5 shadow-sm">
              <div className="h-4 w-1/2 animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-full animate-pulse rounded-full bg-slate-100" />
              <div className="h-4 w-5/6 animate-pulse rounded-full bg-slate-100" />
            </div>
          )}

          {error && (
            <div className="rounded-[1.5rem] border border-red-200 bg-red-50 p-5 text-sm font-semibold text-red-700">
              {error}
            </div>
          )}

          {answer && (
            <article className="overflow-hidden rounded-[1.5rem] border border-slate-200 bg-white shadow-sm">
              <div className="flex items-center justify-between gap-4 border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-5 py-4">
                <div className="flex items-center gap-3">
                  <div className="rounded-2xl bg-primary/10 p-3 text-primary">
                    <MessagesSquare size={18} />
                  </div>
                  <div>
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Answer
                    </p>
                    <h3 className="text-base font-black text-slate-900">Retrieved response</h3>
                  </div>
                </div>

                {typeof answer.chunks_used === "number" ? (
                  <div className="rounded-full bg-slate-900 px-3 py-1 text-xs font-black uppercase tracking-[0.16em] text-white">
                    {answer.chunks_used} chunks used
                  </div>
                ) : null}
              </div>

              <div className="px-5 py-5">
                <p className="whitespace-pre-wrap text-sm leading-7 text-slate-700">
                  {answer.answer}
                </p>

                {answer.chunks && answer.chunks.length > 0 ? (
                  <div className="mt-5 space-y-3">
                    <p className="text-xs font-black uppercase tracking-[0.18em] text-slate-400">
                      Source chunks
                    </p>
                    <div className="grid gap-3">
                      {answer.chunks.slice(0, 3).map((chunk) => (
                        <div key={`${chunk.chunk_index}-${chunk.text}`} className="rounded-2xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          <span className="mr-2 font-black text-primary">Chunk {chunk.chunk_index}</span>
                          {chunk.text}
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            </article>
          )}
        </section>
      </div>
    </AiModalShell>
  );
};