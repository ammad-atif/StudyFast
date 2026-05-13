"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.actionMessageSuccessResponseSchema = exports.postCommentCreatedSuccessResponseSchema = exports.postCommentListSuccessResponseSchema = exports.postDetailsSuccessResponseSchema = exports.postListSuccessResponseSchema = exports.postCommentEntityResponseSchema = exports.postEntityResponseSchema = exports.postViewerRelationResponseSchema = exports.postVoteStatsResponseSchema = exports.postAuthorResponseSchema = exports.listCommentsQueryRequestSchema = exports.listPostsQueryRequestSchema = exports.createCommentRequestSchema = exports.commentIdParamsSchema = exports.postIdParamsSchema = exports.updatePostRequestSchema = exports.createPostRequestSchema = exports.apiErrorSchema = void 0;
const zod_1 = require("zod");
const authValidation_1 = require("./authValidation");
Object.defineProperty(exports, "apiErrorSchema", { enumerable: true, get: function () { return authValidation_1.apiErrorSchema; } });
// -----------------------------------------------------------------------------
// Request Schemas
// -----------------------------------------------------------------------------
const createPostRequestSchema = zod_1.z
    .object({
    title: zod_1.z
        .string()
        .trim()
        .min(5, "Title must be at least 5 characters")
        .max(150, "Title cannot exceed 150 characters"),
    description: zod_1.z
        .string()
        .trim()
        .min(20, "Description must be at least 20 characters")
        .max(5000, "Description cannot exceed 5000 characters"),
    subject: zod_1.z
        .string()
        .trim()
        .min(2, "Subject must be at least 2 characters")
        .max(100, "Subject cannot exceed 100 characters")
        .optional(),
    tags: zod_1.z.array(zod_1.z.string().trim().min(2).max(20)).max(10).optional(),
    llmName: zod_1.z
        .enum(["OpenAI", "Claude", "Gemini", "Llama", "Mistral", "Cohere"])
        .meta({ example: "OpenAI" }),
    chatLink: zod_1.z.url("Please enter a valid AI chat URL"),
})
    .strict();
exports.createPostRequestSchema = createPostRequestSchema;
const updatePostRequestSchema = zod_1.z
    .object({
    title: zod_1.z
        .string()
        .trim()
        .min(5, "Title must be at least 5 characters")
        .max(150, "Title cannot exceed 150 characters")
        .optional(),
    description: zod_1.z
        .string()
        .trim()
        .min(20, "Description must be at least 20 characters")
        .max(5000, "Description cannot exceed 5000 characters")
        .optional(),
    subject: zod_1.z
        .string()
        .trim()
        .min(2, "Subject must be at least 2 characters")
        .max(100, "Subject cannot exceed 100 characters")
        .optional(),
    tags: zod_1.z.array(zod_1.z.string().trim().min(2).max(20)).max(10).optional(),
    llmName: zod_1.z
        .enum(["OpenAI", "Claude", "Gemini", "Llama", "Mistral", "Cohere"])
        .optional(),
    chatLink: zod_1.z.url("Please enter a valid AI chat URL").optional(),
})
    .strict()
    .refine((value) => value.title !== undefined ||
    value.description !== undefined ||
    value.subject !== undefined ||
    value.tags !== undefined ||
    value.llmName !== undefined ||
    value.chatLink !== undefined, {
    message: "At least one field must be provided",
    path: ["title"],
});
exports.updatePostRequestSchema = updatePostRequestSchema;
const postIdParamsSchema = zod_1.z
    .object({
    postId: zod_1.z.string().regex(/^[a-f\d]{24}$/i, "Invalid post ID format"),
})
    .strict();
exports.postIdParamsSchema = postIdParamsSchema;
const commentIdParamsSchema = zod_1.z
    .object({
    postId: zod_1.z.string().regex(/^[a-f\d]{24}$/i, "Invalid post ID format"),
})
    .strict();
exports.commentIdParamsSchema = commentIdParamsSchema;
const createCommentRequestSchema = zod_1.z
    .object({
    content: zod_1.z
        .string()
        .trim()
        .min(1, "Comment cannot be empty")
        .max(2000, "Comment cannot exceed 2000 characters"),
})
    .strict();
exports.createCommentRequestSchema = createCommentRequestSchema;
const listPostsQueryRequestSchema = zod_1.z
    .object({
    q: zod_1.z.string().trim().optional(),
    sortBy: zod_1.z.enum(["newest", "most-upvoted"]).default("newest"),
    page: zod_1.z.coerce.number().int().min(1).default(1),
    subject: zod_1.z.string().trim().optional(),
    tags: zod_1.z.string().trim().optional(),
})
    .strict();
exports.listPostsQueryRequestSchema = listPostsQueryRequestSchema;
const listCommentsQueryRequestSchema = zod_1.z
    .object({
    order: zod_1.z.enum(["oldest", "newest"]).default("oldest"),
    page: zod_1.z.coerce.number().int().min(1).default(1),
})
    .strict();
exports.listCommentsQueryRequestSchema = listCommentsQueryRequestSchema;
// -----------------------------------------------------------------------------
// Response Schemas
// -----------------------------------------------------------------------------
const postAuthorResponseSchema = zod_1.z.object({
    _id: zod_1.z.string().regex(/^[a-f\d]{24}$/i, "Invalid user ID format"),
    fullName: zod_1.z.string(),
    email: zod_1.z.email(),
});
exports.postAuthorResponseSchema = postAuthorResponseSchema;
const postVoteStatsResponseSchema = zod_1.z.object({
    upvotesCount: zod_1.z.number(),
    downvotesCount: zod_1.z.number(),
});
exports.postVoteStatsResponseSchema = postVoteStatsResponseSchema;
const postViewerRelationResponseSchema = zod_1.z.object({
    isSaved: zod_1.z.boolean(),
    userVote: zod_1.z.enum(["upvote", "downvote"]).nullable(),
    isCreatedByViewer: zod_1.z.boolean(),
});
exports.postViewerRelationResponseSchema = postViewerRelationResponseSchema;
const postEntityResponseSchema = zod_1.z.object({
    _id: zod_1.z.string().regex(/^[a-f\d]{24}$/i, "Invalid post ID format"),
    title: zod_1.z.string(),
    description: zod_1.z.string(),
    subject: zod_1.z.string(),
    tags: zod_1.z.array(zod_1.z.string()),
    llmName: zod_1.z
        .enum(["OpenAI", "Claude", "Gemini", "Llama", "Mistral", "Cohere"])
        .meta({ example: "OpenAI" }),
    chatLink: zod_1.z.string(),
    createdBy: postAuthorResponseSchema,
    ...postVoteStatsResponseSchema.shape,
    commentsCount: zod_1.z.number(),
    // Present on list responses when Authorization header is provided.
    viewer: postViewerRelationResponseSchema.optional(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.postEntityResponseSchema = postEntityResponseSchema;
const postCommentEntityResponseSchema = zod_1.z.object({
    _id: zod_1.z.string().regex(/^[a-f\d]{24}$/i, "Invalid comment ID format"),
    post: zod_1.z.string().regex(/^[a-f\d]{24}$/i, "Invalid post ID format"),
    user: postAuthorResponseSchema,
    content: zod_1.z.string(),
    createdAt: zod_1.z.string(),
    updatedAt: zod_1.z.string(),
});
exports.postCommentEntityResponseSchema = postCommentEntityResponseSchema;
const postListSuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        items: zod_1.z.array(postEntityResponseSchema),
        pagination: zod_1.z.object({
            page: zod_1.z.number(),
            limit: zod_1.z.number(),
            totalItems: zod_1.z.number(),
            totalPages: zod_1.z.number(),
        }),
    }),
});
exports.postListSuccessResponseSchema = postListSuccessResponseSchema;
const postDetailsSuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: postEntityResponseSchema,
});
exports.postDetailsSuccessResponseSchema = postDetailsSuccessResponseSchema;
const postCommentListSuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        items: zod_1.z.array(postCommentEntityResponseSchema),
        pagination: zod_1.z.object({
            page: zod_1.z.number(),
            limit: zod_1.z.number(),
            totalItems: zod_1.z.number(),
            totalPages: zod_1.z.number(),
        }),
    }),
});
exports.postCommentListSuccessResponseSchema = postCommentListSuccessResponseSchema;
const postCommentCreatedSuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: postCommentEntityResponseSchema,
});
exports.postCommentCreatedSuccessResponseSchema = postCommentCreatedSuccessResponseSchema;
const actionMessageSuccessResponseSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: zod_1.z.null(),
});
exports.actionMessageSuccessResponseSchema = actionMessageSuccessResponseSchema;
