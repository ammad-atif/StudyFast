import { z } from "zod";

const emailSchema = z
  .string()
  .email("Please provide a valid email address")
  .meta({
    example: "user@example.com",
    description: "A valid email address.",
  });

// Shared API response envelopes for auth endpoints.
// Keeping these alongside request validation schemas avoids duplicating
// the same success/error shapes across controllers and OpenAPI docs.
const apiErrorSchema = z.object({
  success: z.literal(false),
  message: z.string(),
  code: z.string(),
  details: z.record(z.string(), z.array(z.string())).optional(),
});

const registerSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    _id: z.string(),
    fullName: z.string(),
    email: emailSchema,
  }),
});

const loginSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    _id: z.string(),
    fullName: z.string(),
    email: emailSchema,
    isVerified: z.boolean(),
    token: z.string(),
  }),
});

const messageOnlySuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.null(),
});

const changeNameSuccessSchema = z.object({
  success: z.literal(true),
  message: z.string(),
  data: z.object({
    _id: z.string(),
    fullName: z.string(),
    email: emailSchema,
  }),
});

const registerSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(50, "Full name cannot exceed 50 characters"),
    email: emailSchema.transform((value) => value.trim().toLowerCase()),
    password: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(72, "Password is too long"),
  })
  .strict();

const loginSchema = z
  .object({
    email: emailSchema.transform((value) => value.trim().toLowerCase()),
    password: z.string().min(1, "Password is required"),
  })
  .strict();

const verifyEmailSchema = z
  .object({
    token: z.string().min(1, "Verification token is required"),
  })
  .strict();

const resendVerificationSchema = z
  .object({
    email: emailSchema.transform((value) => value.trim().toLowerCase()),
  })
  .strict();

const updateNameSchema = z
  .object({
    fullName: z
      .string()
      .trim()
      .min(2, "Full name must be at least 2 characters")
      .max(50, "Full name cannot exceed 50 characters"),
    currentPassword: z.string().min(1, "Current password is required"),
  })
  .strict();

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Current password is required"),
    newPassword: z
      .string()
      .min(8, "New password must be at least 8 characters")
      .max(72, "New password is too long"),
  })
  .strict();

const jwt_payload_schema = z.object({
  id: z.string(),
});

export {
  emailSchema,
  apiErrorSchema,
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  updateNameSchema,
  changePasswordSchema,
  registerSuccessSchema,
  loginSuccessSchema,
  messageOnlySuccessSchema,
  changeNameSuccessSchema,
  jwt_payload_schema,
};
