"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.mergedOpenApiDocument = void 0;
const zod_1 = require("zod");
const zod_openapi_1 = require("zod-openapi");
const authValidation_1 = require("../validations/authValidation");
const postValidation_1 = require("../validations/postValidation");
const aiValidation_1 = require("../validations/aiValidation");
exports.mergedOpenApiDocument = (0, zod_openapi_1.createDocument)({
    openapi: "3.1.0",
    info: {
        title: "StudyFAST API",
        version: "1.0.0",
        description: "Complete StudyFAST API including authentication, posts management, voting, and comments. All endpoints generated from backend Zod schemas.",
    },
    servers: [{ url: "http://localhost:5000" }],
    components: {
        securitySchemes: {
            BearerAuth: {
                type: "http",
                scheme: "bearer",
                bearerFormat: "JWT",
            },
        },
    },
    paths: {
        "/health": {
            post: {
                tags: ["Health"],
                summary: "Check service health",
                responses: {
                    "200": {
                        description: "Server is healthy",
                        content: {
                            "application/json": {
                                schema: zod_1.z.object({
                                    status: zod_1.z.literal("UP"),
                                    message: zod_1.z.string(),
                                }),
                            },
                        },
                    },
                },
            },
        },
        "/auth/register": {
            post: {
                tags: ["Auth"],
                summary: "Register a new account",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: authValidation_1.registerSchema,
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Registration successful",
                        content: {
                            "application/json": {
                                schema: authValidation_1.registerSuccessSchema,
                            },
                        },
                    },
                    "400": {
                        description: "Invalid input",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "409": {
                        description: "Email already registered",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "500": {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
        },
        "/auth/login": {
            post: {
                tags: ["Auth"],
                summary: "Log in with email and password",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: authValidation_1.loginSchema,
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Login successful",
                        content: {
                            "application/json": {
                                schema: authValidation_1.loginSuccessSchema,
                            },
                        },
                    },
                    "400": {
                        description: "Invalid input",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "401": {
                        description: "Invalid credentials",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "500": {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
        },
        "/auth/verify-email/{token}": {
            get: {
                tags: ["Auth"],
                summary: "Verify account email using one-time token",
                requestParams: {
                    path: authValidation_1.verifyEmailSchema,
                },
                responses: {
                    "200": {
                        description: "Email verified",
                        content: {
                            "application/json": {
                                schema: authValidation_1.messageOnlySuccessSchema,
                            },
                        },
                    },
                    "400": {
                        description: "Token is invalid or expired",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "500": {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
        },
        "/auth/resend-verification": {
            post: {
                tags: ["Auth"],
                summary: "Resend verification link",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: authValidation_1.resendVerificationSchema,
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Request accepted",
                        content: {
                            "application/json": {
                                schema: authValidation_1.messageOnlySuccessSchema,
                            },
                        },
                    },
                    "400": {
                        description: "Invalid input",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "500": {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
        },
        "/auth/forgot-password": {
            post: {
                tags: ["Auth"],
                summary: "Request a password reset link",
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: authValidation_1.forgotPasswordSchema,
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Reset link request accepted",
                        content: {
                            "application/json": {
                                schema: authValidation_1.messageOnlySuccessSchema,
                            },
                        },
                    },
                    "400": {
                        description: "Invalid input",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "500": {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
        },
        "/auth/reset-password/{token}": {
            post: {
                tags: ["Auth"],
                summary: "Reset password with token",
                requestParams: {
                    path: authValidation_1.resetPasswordParamsSchema,
                },
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: authValidation_1.resetPasswordSchema,
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Password reset",
                        content: {
                            "application/json": {
                                schema: authValidation_1.messageOnlySuccessSchema,
                            },
                        },
                    },
                    "400": {
                        description: "Invalid token or input",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "500": {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
        },
        "/auth/change-name": {
            patch: {
                tags: ["Auth"],
                summary: "Change full name",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: authValidation_1.updateNameSchema,
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Name updated",
                        content: {
                            "application/json": {
                                schema: authValidation_1.changeNameSuccessSchema,
                            },
                        },
                    },
                    "400": {
                        description: "Invalid input",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "403": {
                        description: "Current password mismatch",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "500": {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
        },
        "/auth/change-password": {
            patch: {
                tags: ["Auth"],
                summary: "Change account password",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: authValidation_1.changePasswordSchema,
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Password changed",
                        content: {
                            "application/json": {
                                schema: authValidation_1.messageOnlySuccessSchema,
                            },
                        },
                    },
                    "400": {
                        description: "Invalid input",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "403": {
                        description: "Current password mismatch",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "500": {
                        description: "Server error",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
        },
        "/posts": {
            get: {
                tags: ["Posts"],
                summary: "Get posts feed with search, filter, sort, pagination, and optional viewer relations",
                description: "Public endpoint. When Authorization: Bearer <token> is sent, each post item includes viewer.isSaved and viewer.userVote.",
                security: [{ BearerAuth: [] }, {}],
                requestParams: {
                    query: postValidation_1.listPostsQueryRequestSchema,
                },
                responses: {
                    "200": {
                        description: "Posts fetched",
                        content: {
                            "application/json": {
                                schema: postValidation_1.postListSuccessResponseSchema,
                            },
                        },
                    },
                    "400": {
                        description: "Invalid query",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
            post: {
                tags: ["Posts"],
                summary: "Create a post (verified users only)",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: postValidation_1.createPostRequestSchema,
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Post created",
                        content: {
                            "application/json": {
                                schema: postValidation_1.postDetailsSuccessResponseSchema,
                            },
                        },
                    },
                    "400": {
                        description: "Invalid input",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "401": {
                        description: "Unauthorized",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                    "403": {
                        description: "Unverified user",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
        },
        "/posts/{postId}": {
            get: {
                tags: ["Posts"],
                summary: "Get post details with optional viewer relations",
                description: "Public endpoint. When Authorization: Bearer <token> is sent, response includes viewer relation data.",
                security: [{ BearerAuth: [] }, {}],
                requestParams: {
                    path: postValidation_1.postIdParamsSchema,
                },
                responses: {
                    "200": {
                        description: "Post fetched",
                        content: {
                            "application/json": {
                                schema: postValidation_1.postDetailsSuccessResponseSchema,
                            },
                        },
                    },
                    "404": {
                        description: "Post not found",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
            patch: {
                tags: ["Posts"],
                summary: "Edit own post (verified users only)",
                security: [{ BearerAuth: [] }],
                requestParams: {
                    path: postValidation_1.postIdParamsSchema,
                },
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: postValidation_1.updatePostRequestSchema,
                        },
                    },
                },
                responses: {
                    "200": {
                        description: "Post updated",
                        content: {
                            "application/json": {
                                schema: postValidation_1.postDetailsSuccessResponseSchema,
                            },
                        },
                    },
                    "403": {
                        description: "Forbidden",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ["Posts"],
                summary: "Delete own post (verified users only)",
                security: [{ BearerAuth: [] }],
                requestParams: {
                    path: postValidation_1.postIdParamsSchema,
                },
                responses: {
                    "200": {
                        description: "Post deleted",
                        content: {
                            "application/json": {
                                schema: postValidation_1.actionMessageSuccessResponseSchema,
                            },
                        },
                    },
                    "403": {
                        description: "Forbidden",
                        content: {
                            "application/json": {
                                schema: authValidation_1.apiErrorSchema,
                            },
                        },
                    },
                },
            },
        },
        "/posts/{postId}/upvote": {
            post: {
                tags: ["Posts"],
                summary: "Upvote a post (switches from downvote)",
                security: [{ BearerAuth: [] }],
                requestParams: {
                    path: postValidation_1.postIdParamsSchema,
                },
                responses: {
                    "200": {
                        description: "Upvoted",
                        content: {
                            "application/json": {
                                schema: postValidation_1.actionMessageSuccessResponseSchema,
                            },
                        },
                    },
                },
            },
        },
        "/posts/{postId}/downvote": {
            post: {
                tags: ["Posts"],
                summary: "Downvote a post (switches from upvote)",
                security: [{ BearerAuth: [] }],
                requestParams: {
                    path: postValidation_1.postIdParamsSchema,
                },
                responses: {
                    "200": {
                        description: "Downvoted",
                        content: {
                            "application/json": {
                                schema: postValidation_1.actionMessageSuccessResponseSchema,
                            },
                        },
                    },
                },
            },
        },
        "/posts/{postId}/vote": {
            delete: {
                tags: ["Posts"],
                summary: "Remove your vote from a post",
                security: [{ BearerAuth: [] }],
                requestParams: {
                    path: postValidation_1.postIdParamsSchema,
                },
                responses: {
                    "200": {
                        description: "Vote removed",
                        content: {
                            "application/json": {
                                schema: postValidation_1.actionMessageSuccessResponseSchema,
                            },
                        },
                    },
                },
            },
        },
        "/posts/{postId}/save": {
            post: {
                tags: ["Posts"],
                summary: "Save post",
                security: [{ BearerAuth: [] }],
                requestParams: {
                    path: postValidation_1.postIdParamsSchema,
                },
                responses: {
                    "200": {
                        description: "Post saved",
                        content: {
                            "application/json": {
                                schema: postValidation_1.actionMessageSuccessResponseSchema,
                            },
                        },
                    },
                },
            },
            delete: {
                tags: ["Posts"],
                summary: "Unsave post",
                security: [{ BearerAuth: [] }],
                requestParams: {
                    path: postValidation_1.postIdParamsSchema,
                },
                responses: {
                    "200": {
                        description: "Post unsaved",
                        content: {
                            "application/json": {
                                schema: postValidation_1.actionMessageSuccessResponseSchema,
                            },
                        },
                    },
                },
            },
        },
        "/posts/{postId}/comments": {
            get: {
                tags: ["Post Comments"],
                summary: "Get comments timeline for a post",
                requestParams: {
                    path: postValidation_1.postIdParamsSchema,
                    query: postValidation_1.listCommentsQueryRequestSchema,
                },
                responses: {
                    "200": {
                        description: "Comments fetched",
                        content: {
                            "application/json": {
                                schema: postValidation_1.postCommentListSuccessResponseSchema,
                            },
                        },
                    },
                },
            },
            post: {
                tags: ["Post Comments"],
                summary: "Add a comment (verified users only)",
                security: [{ BearerAuth: [] }],
                requestParams: {
                    path: postValidation_1.postIdParamsSchema,
                },
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: postValidation_1.createCommentRequestSchema,
                        },
                    },
                },
                responses: {
                    "201": {
                        description: "Comment created",
                        content: {
                            "application/json": {
                                schema: postValidation_1.postCommentCreatedSuccessResponseSchema,
                            },
                        },
                    },
                },
            },
        },
        "/ai/embeddings/enqueue": {
            post: {
                tags: ["AI"],
                summary: "Enqueue embedding creation for a post",
                security: [{ BearerAuth: [] }],
                requestBody: {
                    required: true,
                    content: {
                        "application/json": {
                            schema: aiValidation_1.enqueueEmbeddingSchema,
                        },
                    },
                },
                responses: {
                    "202": {
                        description: "Job accepted",
                        content: {
                            "application/json": {
                                schema: zod_1.z.object({
                                    success: zod_1.z.literal(true),
                                    message: zod_1.z.string(),
                                    data: zod_1.z.object({ jobId: zod_1.z.string() }).optional(),
                                    requestId: zod_1.z.string().optional(),
                                }),
                            },
                        },
                    },
                    "400": { description: "Invalid input", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                    "401": { description: "Unauthorized", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                },
            },
        },
        "/ai/embeddings/{postId}/status": {
            get: {
                tags: ["AI"],
                summary: "Check embedding existence/status for a post",
                requestParams: { path: aiValidation_1.statusCheckSchema },
                responses: {
                    "200": {
                        description: "Status retrieved",
                        content: {
                            "application/json": {
                                schema: zod_1.z.object({
                                    success: zod_1.z.literal(true),
                                    post_id: zod_1.z.string(),
                                    index: zod_1.z.string(),
                                    exists: zod_1.z.boolean(),
                                    message: zod_1.z.string(),
                                    request_id: zod_1.z.string().optional(),
                                }),
                            },
                        },
                    },
                    "500": { description: "Server error", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                },
            },
        },
        "/ai/answer": {
            post: {
                tags: ["AI"],
                summary: "Answer a question for a specific post (RAG proxy)",
                security: [{ BearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: aiValidation_1.ragQuerySchema } } },
                responses: {
                    "200": { description: "Answer generated", content: { "application/json": { schema: zod_1.z.object({ success: zod_1.z.literal(true), message: zod_1.z.string(), answer: zod_1.z.string(), request_id: zod_1.z.string().optional() }) } } },
                    "400": { description: "Invalid input", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                    "504": { description: "Upstream timeout", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                },
            },
        },
        "/ai/summary": {
            post: {
                tags: ["AI"],
                summary: "Generate a summary for a post (RAG proxy)",
                security: [{ BearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: aiValidation_1.statusCheckSchema } } },
                responses: {
                    "200": { description: "Summary generated", content: { "application/json": { schema: zod_1.z.object({ success: zod_1.z.literal(true), message: zod_1.z.string(), summary: zod_1.z.string(), request_id: zod_1.z.string().optional() }) } } },
                    "400": { description: "Invalid input", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                    "504": { description: "Upstream timeout", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                },
            },
        },
        "/ai/quiz": {
            post: {
                tags: ["AI"],
                summary: "Generate quiz questions from a post (RAG proxy)",
                security: [{ BearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: aiValidation_1.statusCheckSchema } } },
                responses: {
                    "200": { description: "Quiz generated", content: { "application/json": { schema: zod_1.z.object({ success: zod_1.z.literal(true), message: zod_1.z.string(), quiz: zod_1.z.array(zod_1.z.any()), request_id: zod_1.z.string().optional() }) } } },
                    "400": { description: "Invalid input", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                    "504": { description: "Upstream timeout", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                },
            },
        },
        "/ai/search": {
            post: {
                tags: ["AI"],
                summary: "Search within post embeddings (RAG proxy)",
                security: [{ BearerAuth: [] }],
                requestBody: { required: true, content: { "application/json": { schema: aiValidation_1.ragQuerySchema } } },
                responses: {
                    "200": {
                        description: "Search results",
                        content: {
                            "application/json": {
                                schema: zod_1.z.object({
                                    success: zod_1.z.literal(true),
                                    message: zod_1.z.string(),
                                    results: zod_1.z.array(zod_1.z.object({ post_id: zod_1.z.string(), weighted_score: zod_1.z.number() })),
                                    request_id: zod_1.z.string().optional(),
                                }),
                            },
                        },
                    },
                    "400": { description: "Invalid input", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                    "504": { description: "Upstream timeout", content: { "application/json": { schema: authValidation_1.apiErrorSchema } } },
                },
            },
        },
    },
});
