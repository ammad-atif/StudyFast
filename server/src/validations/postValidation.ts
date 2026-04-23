import { z } from "zod";
import { apiErrorSchema } from "./authValidation";

// -----------------------------------------------------------------------------
// Request Schemas
// -----------------------------------------------------------------------------

const createPostRequestSchema = z
  .object({
    title: z
      .string()
      .trim()
      .min(5, "Title must be at least 5 characters")
      .max(150, "Title cannot exceed 150 characters"),
    description: z
      .string()
      .trim()
      .min(20, "Description must be at least 20 characters")
      .max(5000, "Description cannot exceed 5000 characters"),
    llmName: z
      .enum(["OpenAI", "Claude", "Gemini", "Llama", "Mistral", "Cohere"])
      .meta({ example: "OpenAI" }),
  })
  .strict();

const postIdParamsSchema = z
  .object({
    postId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid post ID format"),
  })
  .strict();

const commentIdParamsSchema = z
  .object({
    postId: z.string().regex(/^[a-f\d]{24}$/i, "Invalid post ID format"),
  })
  .strict();

const createCommentRequestSchema = z
  .object({
    content: z
      .string()
      .trim()
      .min(1, "Comment cannot be empty")
      .max(2000, "Comment cannot exceed 2000 characters"),
  })
  .strict();

const listPostsQueryRequestSchema = z
  .object({
    q: z.string().trim().optional(),
    sortBy: z.enum(["newest", "most-upvoted"]).default("newest"),
    page: z.coerce.number().int().min(1).default(1),
  })
  .strict();

const listCommentsQueryRequestSchema = z
  .object({
    order: z.enum(["oldest", "newest"]).default("oldest"),
    page: z.coerce.number().int().min(1).default(1),
  })
  .strict();

// -----------------------------------------------------------------------------
// Response Schemas
// -----------------------------------------------------------------------------

const postAuthorResponseSchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID format"),
  fullName: z.string(),
  avatar: z.string(),
});

const postVoteStatsResponseSchema = z.object({
  upvotesCount: z.number(),
  downvotesCount: z.number(),
});

const postEntityResponseSchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid post ID format"),
  title: z.string(),
  description: z.string(),
  llmName: z
    .enum(["OpenAI", "Claude", "Gemini", "Llama", "Mistral", "Cohere"])
    .meta({ example: "OpenAI" }),
  createdBy: postAuthorResponseSchema,
  ...postVoteStatsResponseSchema.shape,
  commentsCount: z.number(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const postCommentEntityResponseSchema = z.object({
  _id: z.string().regex(/^[a-f\d]{24}$/i, "Invalid comment ID format"),
  post: z.string().regex(/^[a-f\d]{24}$/i, "Invalid post ID format"),
  user: postAuthorResponseSchema,
  content: z.string(),
  createdAt: z.string(),
  updatedAt: z.string(),
});

const postListSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    items: z.array(postEntityResponseSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      totalItems: z.number(),
      totalPages: z.number(),
    }),
  }),
});

const postDetailsSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: postEntityResponseSchema,
});

const postCommentListSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    items: z.array(postCommentEntityResponseSchema),
    pagination: z.object({
      page: z.number(),
      limit: z.number(),
      totalItems: z.number(),
      totalPages: z.number(),
    }),
  }),
});

const postCommentCreatedSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: postCommentEntityResponseSchema,
});

const actionMessageSuccessResponseSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.null(),
});

export {
  // Shared error response shape
  apiErrorSchema,
  // Request schemas
  createPostRequestSchema,
  postIdParamsSchema,
  commentIdParamsSchema,
  createCommentRequestSchema,
  listPostsQueryRequestSchema,
  listCommentsQueryRequestSchema,
  // Response schemas
  postAuthorResponseSchema,
  postVoteStatsResponseSchema,
  postEntityResponseSchema,
  postCommentEntityResponseSchema,
  postListSuccessResponseSchema,
  postDetailsSuccessResponseSchema,
  postCommentListSuccessResponseSchema,
  postCommentCreatedSuccessResponseSchema,
  actionMessageSuccessResponseSchema,
};
