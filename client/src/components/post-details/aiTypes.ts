export type ApiEnvelope<T> = {
  success?: boolean;
  message?: string;
  data?: T;
  requestId?: string;
  statusCode?: number;
};

export type SummaryResponseData = {
  success: boolean;
  message: string;
  summary: string;
  request_id?: string;
};

export type QuizChoice = string;

export type QuizQuestion = {
  question: string;
  choices: QuizChoice[];
  answer?: string;
  explanation?: string;
};

export type QuizResponseData = {
  success: boolean;
  message: string;
  quiz: Array<{
    title?: string;
    questions?: QuizQuestion[];
    raw_output?: string;
  }>;
  request_id?: string;
};

export type RagResponseData = {
  post_id: string;
  question: string;
  answer: string;
  chunks_used?: number;
  chunks?: Array<{
    score?: number | null;
    chunk_index?: number;
    text?: string;
  }>;
};

export type EmbeddingStatusData = {
  success?: boolean;
  postId?: string;
  status?: string;
  jobId?: string;
  error?: string;
  updatedAt?: string;
};

export const unwrapEnvelope = <T,>(response: unknown): T | null => {
  if (!response || typeof response !== "object") {
    return null;
  }

  const payload = response as { data?: unknown };
  if (payload.data !== undefined) {
    return payload.data as T;
  }

  return response as T;
};

export const splitIntoParagraphs = (text: string): string[] => {
  return text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);
};

export const splitIntoSentences = (text: string): string[] => {
  return text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter(Boolean);
};