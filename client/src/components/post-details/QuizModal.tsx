import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
// icons removed to keep modal lightweight
import { api } from "../../api";
import {
  type QuizQuestion,
  type QuizResponseData,
  unwrapEnvelope,
} from "./aiTypes";
import { AiModalShell } from "./AiModalShell";

type QuizModalProps = {
  isOpen: boolean;
  postId: string;
  postTitle: string;
  onClose: () => void;
};

const normalizeQuizResponse = (response: unknown) => {
  const payload = unwrapEnvelope<QuizResponseData>(response);
  const quizContainer = payload?.quiz?.[0];

  const title = quizContainer?.title || payload?.message || "Quiz";
  const questions = Array.isArray(quizContainer?.questions)
    ? quizContainer.questions
    : [];
  const rawOutput = quizContainer?.raw_output || "";

  return { title, questions, rawOutput };
};

export const QuizModal = ({
  isOpen,
  postId,
  postTitle,
  onClose,
}: QuizModalProps) => {
  // Use React Query to cache quiz results per post
  const queryKey = ["post", postId, "quiz"];

  const { data: rawResponse, isLoading, isError, error } = useQuery({
    queryKey,
    queryFn: async () => {
      const res = await api.post("/ai/quiz", { postId });
      return res;
    },
    enabled: Boolean(isOpen && postId),
    staleTime: Infinity,
  });

  // Attach minimal global error listener only for diagnostics (no UI state updates)
  useEffect(() => {
    if (!isOpen) return;

    const onError = (event: ErrorEvent) => {
      console.error("Global error captured in QuizModal:", event.error || event.message, event);
    };

    window.addEventListener("error", onError);

    return () => {
      window.removeEventListener("error", onError);
    };
  }, [isOpen]);

  const normalized = normalizeQuizResponse(rawResponse);

  const title = normalized?.title || "Quiz";
  const questions = (Array.isArray(normalized?.questions) ? normalized.questions : []) as QuizQuestion[];
  const rawOutput = normalized?.rawOutput || "";

  const hasStructuredQuestions = questions.length > 0;
  const hasRawOutput = Boolean(String(rawOutput).trim());

  return (
    <AiModalShell
      isOpen={isOpen}
      onClose={onClose}
      title="Generate Quiz"
      subtitle={postTitle}
    >
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-bold">{title}</h3>
        </div>

        {isLoading && <div className="text-sm text-slate-500">Generating quiz…</div>}

        {isError && (() => {
          const msg = (error instanceof Error && error.message) || (error && (error as unknown as Record<string, unknown>).message) || "Failed to generate quiz.";
          return <div className="text-sm text-red-600">{String(msg)}</div>;
        })()}

        {!isLoading && !isError && (hasStructuredQuestions || hasRawOutput) && (
          <div className="space-y-4">
            {questions.slice(0, 20).map((q, qi) => (
              <div key={qi} className="p-3 rounded border bg-white">
                <div className="font-semibold">
                  {qi + 1}. {q.question}
                </div>
                <ul className="mt-2 ml-4 list-disc text-sm">
                  {(q.choices || []).slice(0, 8).map((c, ci) => (
                    <li key={ci}>
                      {String.fromCharCode(65 + ci)}. {c}
                    </li>
                  ))}
                </ul>
                {q.explanation ? (
                  <div className="mt-2 text-sm text-slate-600">
                    Explanation: {q.explanation}
                  </div>
                ) : null}
                {q.answer ? (
                  <div className="mt-1 text-sm font-bold">
                    Answer: {q.answer}
                  </div>
                ) : null}
              </div>
            ))}

            {!hasStructuredQuestions && hasRawOutput ? (
              <pre className="rounded border p-3 text-sm whitespace-pre-wrap">
                {rawOutput}
              </pre>
            ) : null}

            {/* {lastResponseDebug ? (
              <details className="text-xs text-slate-600">
                <summary>Show raw response (debug)</summary>
                <pre className="max-h-48 overflow-auto whitespace-pre-wrap">
                  {JSON.stringify(lastResponseDebug, null, 2)}
                </pre>
              </details>
            ) : null} */}
          </div>
        )}
      </div>
    </AiModalShell>
  );
};

// no local ErrorBoundary - modal content rendered simply
