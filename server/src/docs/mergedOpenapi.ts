import { z } from "zod";
import { createDocument } from "zod-openapi";
import {
  apiErrorSchema,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  updateNameSchema,
  changePasswordSchema,
  forgotPasswordSchema,
  resetPasswordParamsSchema,
  resetPasswordSchema,
  registerSuccessSchema,
  loginSuccessSchema,
  messageOnlySuccessSchema,
  changeNameSuccessSchema,
} from "../validations/authValidation";
import {
  actionMessageSuccessResponseSchema,
  createCommentRequestSchema,
  createPostRequestSchema,
  listCommentsQueryRequestSchema,
  listPostsQueryRequestSchema,
  postCommentCreatedSuccessResponseSchema,
  postCommentListSuccessResponseSchema,
  postDetailsSuccessResponseSchema,
  postIdParamsSchema,
  postListSuccessResponseSchema,
  updatePostRequestSchema,
} from "../validations/postValidation";
import {
  enqueueEmbeddingSchema,
  ragQuerySchema,
  statusCheckSchema,
} from "../validations/aiValidation";

export const mergedOpenApiDocument = createDocument({
  openapi: "3.1.0",
  info: {
    title: "StudyFAST API",
    version: "1.0.0",
    description:
      "Complete StudyFAST API including authentication, posts management, voting, and comments. All endpoints generated from backend Zod schemas.",
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
                schema: z.object({
                  status: z.literal("UP"),
                  message: z.string(),
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
              schema: registerSchema,
            },
          },
        },
        responses: {
          "201": {
            description: "Registration successful",
            content: {
              "application/json": {
                schema: registerSuccessSchema,
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "409": {
            description: "Email already registered",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
              schema: loginSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Login successful",
            content: {
              "application/json": {
                schema: loginSuccessSchema,
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "401": {
            description: "Invalid credentials",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
          path: verifyEmailSchema,
        },
        responses: {
          "200": {
            description: "Email verified",
            content: {
              "application/json": {
                schema: messageOnlySuccessSchema,
              },
            },
          },
          "400": {
            description: "Token is invalid or expired",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
              schema: resendVerificationSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Request accepted",
            content: {
              "application/json": {
                schema: messageOnlySuccessSchema,
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
              schema: forgotPasswordSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Reset link request accepted",
            content: {
              "application/json": {
                schema: messageOnlySuccessSchema,
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
          path: resetPasswordParamsSchema,
        },
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: resetPasswordSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Password reset",
            content: {
              "application/json": {
                schema: messageOnlySuccessSchema,
              },
            },
          },
          "400": {
            description: "Invalid token or input",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
              schema: updateNameSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Name updated",
            content: {
              "application/json": {
                schema: changeNameSuccessSchema,
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "403": {
            description: "Current password mismatch",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
              schema: changePasswordSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Password changed",
            content: {
              "application/json": {
                schema: messageOnlySuccessSchema,
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "403": {
            description: "Current password mismatch",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "500": {
            description: "Server error",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
        },
      },
    },
    "/posts": {
      get: {
        tags: ["Posts"],
        summary:
          "Get posts feed with search, filter, sort, pagination, and optional viewer relations",
        description:
          "Public endpoint. When Authorization: Bearer <token> is sent, each post item includes viewer.isSaved and viewer.userVote.",
        security: [{ BearerAuth: [] }, {}],
        requestParams: {
          query: listPostsQueryRequestSchema,
        },
        responses: {
          "200": {
            description: "Posts fetched",
            content: {
              "application/json": {
                schema: postListSuccessResponseSchema,
              },
            },
          },
          "400": {
            description: "Invalid query",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
              schema: createPostRequestSchema,
            },
          },
        },
        responses: {
          "201": {
            description: "Post created",
            content: {
              "application/json": {
                schema: postDetailsSuccessResponseSchema,
              },
            },
          },
          "400": {
            description: "Invalid input",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "401": {
            description: "Unauthorized",
            content: {
              "application/json": {
                schema: apiErrorSchema,
              },
            },
          },
          "403": {
            description: "Unverified user",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
        description:
          "Public endpoint. When Authorization: Bearer <token> is sent, response includes viewer relation data.",
        security: [{ BearerAuth: [] }, {}],
        requestParams: {
          path: postIdParamsSchema,
        },
        responses: {
          "200": {
            description: "Post fetched",
            content: {
              "application/json": {
                schema: postDetailsSuccessResponseSchema,
              },
            },
          },
          "404": {
            description: "Post not found",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
          path: postIdParamsSchema,
        },
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: updatePostRequestSchema,
            },
          },
        },
        responses: {
          "200": {
            description: "Post updated",
            content: {
              "application/json": {
                schema: postDetailsSuccessResponseSchema,
              },
            },
          },
          "403": {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
          path: postIdParamsSchema,
        },
        responses: {
          "200": {
            description: "Post deleted",
            content: {
              "application/json": {
                schema: actionMessageSuccessResponseSchema,
              },
            },
          },
          "403": {
            description: "Forbidden",
            content: {
              "application/json": {
                schema: apiErrorSchema,
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
          path: postIdParamsSchema,
        },
        responses: {
          "200": {
            description: "Upvoted",
            content: {
              "application/json": {
                schema: actionMessageSuccessResponseSchema,
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
          path: postIdParamsSchema,
        },
        responses: {
          "200": {
            description: "Downvoted",
            content: {
              "application/json": {
                schema: actionMessageSuccessResponseSchema,
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
          path: postIdParamsSchema,
        },
        responses: {
          "200": {
            description: "Vote removed",
            content: {
              "application/json": {
                schema: actionMessageSuccessResponseSchema,
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
          path: postIdParamsSchema,
        },
        responses: {
          "200": {
            description: "Post saved",
            content: {
              "application/json": {
                schema: actionMessageSuccessResponseSchema,
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
          path: postIdParamsSchema,
        },
        responses: {
          "200": {
            description: "Post unsaved",
            content: {
              "application/json": {
                schema: actionMessageSuccessResponseSchema,
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
          path: postIdParamsSchema,
          query: listCommentsQueryRequestSchema,
        },
        responses: {
          "200": {
            description: "Comments fetched",
            content: {
              "application/json": {
                schema: postCommentListSuccessResponseSchema,
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
          path: postIdParamsSchema,
        },
        requestBody: {
          required: true,
          content: {
            "application/json": {
              schema: createCommentRequestSchema,
            },
          },
        },
        responses: {
          "201": {
            description: "Comment created",
            content: {
              "application/json": {
                schema: postCommentCreatedSuccessResponseSchema,
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
              schema: enqueueEmbeddingSchema,
            },
          },
        },
        responses: {
          "202": {
            description: "Job accepted",
            content: {
              "application/json": {
                schema: z.object({
                  success: z.literal(true),
                  message: z.string(),
                  data: z.object({ jobId: z.string() }).optional(),
                  requestId: z.string().optional(),
                }),
              },
            },
          },
          "400": { description: "Invalid input", content: { "application/json": { schema: apiErrorSchema } } },
          "401": { description: "Unauthorized", content: { "application/json": { schema: apiErrorSchema } } },
        },
      },
    },
    "/ai/embeddings/{postId}/status": {
      get: {
        tags: ["AI"],
        summary: "Check embedding existence/status for a post",
        requestParams: { path: statusCheckSchema },
        responses: {
          "200": {
            description: "Status retrieved",
            content: {
              "application/json": {
                schema: z.object({
                  success: z.literal(true),
                  post_id: z.string(),
                  index: z.string(),
                  exists: z.boolean(),
                  message: z.string(),
                  request_id: z.string().optional(),
                }),
              },
            },
          },
          "500": { description: "Server error", content: { "application/json": { schema: apiErrorSchema } } },
        },
      },
    },
    "/ai/answer": {
      post: {
        tags: ["AI"],
        summary: "Answer a question for a specific post (RAG proxy)",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: ragQuerySchema } } },
        responses: {
          "200": { description: "Answer generated", content: { "application/json": { schema: z.object({ success: z.literal(true), message: z.string(), answer: z.string(), request_id: z.string().optional() }) } } },
          "400": { description: "Invalid input", content: { "application/json": { schema: apiErrorSchema } } },
          "504": { description: "Upstream timeout", content: { "application/json": { schema: apiErrorSchema } } },
        },
      },
    },
    "/ai/summary": {
      post: {
        tags: ["AI"],
        summary: "Generate a summary for a post (RAG proxy)",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: statusCheckSchema } } },
        responses: {
          "200": { description: "Summary generated", content: { "application/json": { schema: z.object({ success: z.literal(true), message: z.string(), summary: z.string(), request_id: z.string().optional() }) } } },
          "400": { description: "Invalid input", content: { "application/json": { schema: apiErrorSchema } } },
          "504": { description: "Upstream timeout", content: { "application/json": { schema: apiErrorSchema } } },
        },
      },
    },
    "/ai/quiz": {
      post: {
        tags: ["AI"],
        summary: "Generate quiz questions from a post (RAG proxy)",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: statusCheckSchema } } },
        responses: {
          "200": { description: "Quiz generated", content: { "application/json": { schema: z.object({ success: z.literal(true), message: z.string(), quiz: z.array(z.any()), request_id: z.string().optional() }) } } },
          "400": { description: "Invalid input", content: { "application/json": { schema: apiErrorSchema } } },
          "504": { description: "Upstream timeout", content: { "application/json": { schema: apiErrorSchema } } },
        },
      },
    },
    "/ai/search": {
      post: {
        tags: ["AI"],
        summary: "Search within post embeddings (RAG proxy)",
        security: [{ BearerAuth: [] }],
        requestBody: { required: true, content: { "application/json": { schema: ragQuerySchema } } },
        responses: {
          "200": {
            description: "Search results",
            content: {
              "application/json": {
                schema: z.object({
                  success: z.literal(true),
                  message: z.string(),
                  results: z.array(z.object({ post_id: z.string(), weighted_score: z.number() })),
                  request_id: z.string().optional(),
                }),
              },
            },
          },
          "400": { description: "Invalid input", content: { "application/json": { schema: apiErrorSchema } } },
          "504": { description: "Upstream timeout", content: { "application/json": { schema: apiErrorSchema } } },
        },
      },
    },
  },
});
