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

export const openApiDocument = createDocument({
  openapi: "3.1.0",
  info: {
    title: "StudyFAST API",
    version: "1.0.0",
    description:
      "Authentication and user account API documentation generated from backend Zod schemas.",
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
          "403": {
            description: "Email not verified",
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
  },
});
