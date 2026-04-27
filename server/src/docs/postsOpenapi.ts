import { createDocument } from "zod-openapi";
import {
  actionMessageSuccessResponseSchema,
  apiErrorSchema,
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

export const postsOpenApiDocument = createDocument({
  openapi: "3.1.0",
  info: {
    title: "StudyFAST Posts API",
    version: "1.0.0",
    description: "Posts, voting, saving, and comment timeline endpoints.",
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
  },
});
