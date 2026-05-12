import { z } from 'zod';

export const enqueueEmbeddingSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  chatLink: z.string().url('Invalid chat link URL'),
});

export const ragQuerySchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
  query: z.string().min(1, 'Query is required'),
});

export const statusCheckSchema = z.object({
  postId: z.string().min(1, 'Post ID is required'),
});

export type EnqueueEmbeddingPayload = z.infer<typeof enqueueEmbeddingSchema>;
export type RAGQueryPayload = z.infer<typeof ragQuerySchema>;
export type StatusCheckPayload = z.infer<typeof statusCheckSchema>;
