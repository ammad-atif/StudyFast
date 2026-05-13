"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.jwt_payload_schema = exports.changeNameSuccessSchema = exports.messageOnlySuccessSchema = exports.loginSuccessSchema = exports.registerSuccessSchema = exports.resetPasswordSchema = exports.resetPasswordParamsSchema = exports.forgotPasswordSchema = exports.changePasswordSchema = exports.updateNameSchema = exports.resendVerificationSchema = exports.verifyEmailSchema = exports.loginSchema = exports.registerSchema = exports.apiErrorSchema = exports.emailSchema = void 0;
const zod_1 = require("zod");
const emailSchema = zod_1.z
    .string()
    .email("Please provide a valid email address")
    .meta({
    example: "user@example.com",
    description: "A valid email address.",
});
exports.emailSchema = emailSchema;
// Shared API response envelopes for auth endpoints.
// Keeping these alongside request validation schemas avoids duplicating
// the same success/error shapes across controllers and OpenAPI docs.
const apiErrorSchema = zod_1.z.object({
    success: zod_1.z.literal(false),
    message: zod_1.z.string(),
    code: zod_1.z.string(),
    details: zod_1.z.record(zod_1.z.string(), zod_1.z.array(zod_1.z.string())).optional(),
});
exports.apiErrorSchema = apiErrorSchema;
const registerSuccessSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        _id: zod_1.z.string(),
        fullName: zod_1.z.string(),
        email: emailSchema,
    }),
});
exports.registerSuccessSchema = registerSuccessSchema;
const loginSuccessSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        _id: zod_1.z.string(),
        fullName: zod_1.z.string(),
        email: emailSchema,
        isVerified: zod_1.z.boolean(),
        token: zod_1.z.string(),
    }),
});
exports.loginSuccessSchema = loginSuccessSchema;
const messageOnlySuccessSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: zod_1.z.null(),
});
exports.messageOnlySuccessSchema = messageOnlySuccessSchema;
const changeNameSuccessSchema = zod_1.z.object({
    success: zod_1.z.literal(true),
    message: zod_1.z.string(),
    data: zod_1.z.object({
        _id: zod_1.z.string(),
        fullName: zod_1.z.string(),
        email: emailSchema,
    }),
});
exports.changeNameSuccessSchema = changeNameSuccessSchema;
const registerSchema = zod_1.z
    .object({
    fullName: zod_1.z
        .string()
        .trim()
        .min(2, "Full name must be at least 2 characters")
        .max(50, "Full name cannot exceed 50 characters"),
    email: emailSchema.transform((value) => value.trim().toLowerCase()),
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password is too long"),
})
    .strict();
exports.registerSchema = registerSchema;
const loginSchema = zod_1.z
    .object({
    email: emailSchema.transform((value) => value.trim().toLowerCase()),
    password: zod_1.z.string().min(1, "Password is required"),
})
    .strict();
exports.loginSchema = loginSchema;
const verifyEmailSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(1, "Verification token is required"),
})
    .strict();
exports.verifyEmailSchema = verifyEmailSchema;
const resendVerificationSchema = zod_1.z
    .object({
    email: emailSchema.transform((value) => value.trim().toLowerCase()),
})
    .strict();
exports.resendVerificationSchema = resendVerificationSchema;
const forgotPasswordSchema = zod_1.z
    .object({
    email: emailSchema.transform((value) => value.trim().toLowerCase()),
})
    .strict();
exports.forgotPasswordSchema = forgotPasswordSchema;
const resetPasswordParamsSchema = zod_1.z
    .object({
    token: zod_1.z.string().min(1, "Reset token is required"),
})
    .strict();
exports.resetPasswordParamsSchema = resetPasswordParamsSchema;
const resetPasswordSchema = zod_1.z
    .object({
    password: zod_1.z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(72, "Password is too long"),
})
    .strict();
exports.resetPasswordSchema = resetPasswordSchema;
const updateNameSchema = zod_1.z
    .object({
    fullName: zod_1.z
        .string()
        .trim()
        .min(2, "Full name must be at least 2 characters")
        .max(50, "Full name cannot exceed 50 characters"),
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
})
    .strict();
exports.updateNameSchema = updateNameSchema;
const changePasswordSchema = zod_1.z
    .object({
    currentPassword: zod_1.z.string().min(1, "Current password is required"),
    newPassword: zod_1.z
        .string()
        .min(8, "New password must be at least 8 characters")
        .max(72, "New password is too long"),
})
    .strict();
exports.changePasswordSchema = changePasswordSchema;
const jwt_payload_schema = zod_1.z.object({
    id: zod_1.z.string(),
});
exports.jwt_payload_schema = jwt_payload_schema;
