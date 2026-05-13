"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.changePassword = exports.changeName = exports.resetPassword = exports.forgotPassword = exports.resendVerification = exports.verifyEmail = exports.loginUser = exports.registerUser = void 0;
const User_1 = __importDefault(require("../models/User"));
const crypto_1 = __importDefault(require("crypto"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const zod_1 = require("zod");
const authValidation_1 = require("../validations/authValidation");
const sendEmail_1 = require("../utils/sendEmail");
const sendError = (res, statusCode, message, code, error) => {
    return res.status(statusCode).json({
        success: false,
        message: message,
        code: code,
        details: error ? zod_1.z.flattenError(error).fieldErrors : {},
        //     {
        //   "formErrors": [],
        //   "fieldErrors": {
        //     "email": ["Invalid email"],
        //     "password": ["String must contain at least 8 character(s)"]
        //   }
        // }
    });
};
const sendSuccess = (res, statusCode, message, data) => {
    return res.status(statusCode).json({
        success: true,
        message,
        data,
    });
};
const getJwtSecret = () => {
    const secret = process.env.JWT_SECRET;
    if (!secret) {
        throw new Error("JWT_SECRET is not configured");
    }
    return secret;
};
const buildClientUrl = (req) => {
    const configuredClientUrl = process.env.PUBLIC_CLIENT_URL?.trim() ||
        process.env.PUBLIC_FRONTEND_URL?.trim() ||
        process.env.CLIENT_URL?.trim();
    return configuredClientUrl || `${req.protocol}://${req.get("origin")}`;
};
const buildVerificationUrl = (req, rawToken) => {
    const baseUrl = buildClientUrl(req);
    return `${baseUrl}/verify-email/${rawToken}`;
};
const buildResetPasswordUrl = (req, rawToken) => {
    const baseUrl = buildClientUrl(req);
    return `${baseUrl}/reset-password/${rawToken}`;
};
const generateToken = (payload) => {
    return jsonwebtoken_1.default.sign(payload, getJwtSecret(), {
        expiresIn: "30d",
    });
};
// @desc    Register new user
// @route   POST /auth/register
const registerUser = async (req, res) => {
    try {
        // Validate input using Zod
        const parsed = authValidation_1.registerSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, "Invalid input data", "INVALID_INPUT", parsed.error);
        }
        //Check if user already exists
        const { fullName, email, password } = parsed.data;
        const userExists = await User_1.default.findOne({ email });
        if (userExists)
            return sendError(res, 409, "User already exists", "USER_EXISTS");
        //creating token for email verification
        const rawToken = crypto_1.default.randomBytes(20).toString("hex");
        const hashedToken = crypto_1.default
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");
        const tokenExpiration = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        // Create user with verification token and expiry
        const user = await User_1.default.create({
            fullName,
            email,
            password,
            verificationToken: hashedToken,
            verificationTokenExpires: new Date(tokenExpiration),
        });
        // Build verification URL
        const verificationUrl = buildVerificationUrl(req, rawToken);
        // Send verification email
        try {
            await (0, sendEmail_1.sendEmail)({
                email: user.email,
                subject: "StudyFAST - Verify your email",
                fullName: user.fullName,
                verificationUrl,
            });
        }
        catch (error) {
            // If email sending fails, clean up the user record (remove token and expiry)
            user.verificationToken = undefined;
            user.verificationTokenExpires = undefined;
            await user.save();
            return sendError(res, 500, "Could not send verification email. Please try again.", "EMAIL_SEND_ERROR");
        }
        // Respond with success message (without token, since email verification is required)
        sendSuccess(res, 201, "Registration successful. Please check your email to verify your account.", {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
        });
    }
    catch (error) {
        if (error?.code === 11000) {
            return sendError(res, 409, "User already exists", "USER_EXISTS");
        }
        sendError(res, 500, "An error occurred during registration", "SERVER_ERROR");
    }
};
exports.registerUser = registerUser;
// @desc    Login user
// @route   POST /auth/login
const loginUser = async (req, res) => {
    try {
        // Validate input using Zod
        const parsed = authValidation_1.loginSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, "Invalid input data", "INVALID_INPUT", parsed.error);
        }
        // Check for user and validate password
        const { email, password } = parsed.data;
        const user = await User_1.default.findOne({ email }).select("+password");
        const isMatch = user ? await user.comparePassword(password) : false;
        // If valid credentials and user exists, check if email is verified before sending token
        if (isMatch && user) {
            // Generate JWT token and send user data
            sendSuccess(res, 200, "Login successful", {
                _id: user._id,
                fullName: user.fullName,
                email: user.email,
                isVerified: user.isVerified,
                token: generateToken({ id: user._id.toString() }),
            });
        }
        else {
            // Invalid credentials
            sendError(res, 401, "Invalid email or password", "INVALID_CREDENTIALS");
        }
    }
    catch (error) {
        sendError(res, 500, "An error occurred during login", "SERVER_ERROR");
    }
};
exports.loginUser = loginUser;
const verifyEmail = async (req, res) => {
    try {
        // Validate token parameter using Zod
        const parsed = authValidation_1.verifyEmailSchema.safeParse(req.params);
        if (!parsed.success) {
            return sendError(res, 400, "Invalid verification token", "INVALID_TOKEN", parsed.error);
        }
        // 1. Hash the raw token from the URL (params) to compare with stored hash
        const hashedToken = crypto_1.default
            .createHash("sha256")
            .update(parsed.data.token)
            .digest("hex");
        // 2. Find user with matching token and valid expiry
        const user = await User_1.default.findOne({
            verificationToken: hashedToken,
            verificationTokenExpires: { $gt: Date.now() },
        });
        // If no user found, token is invalid or expired
        if (!user) {
            return sendError(res, 400, "Invalid or expired verification token", "INVALID_OR_EXPIRED_TOKEN");
        }
        // 3. Update User Status
        user.isVerified = true;
        user.verificationToken = undefined; // Clear the token
        user.verificationTokenExpires = undefined; // Clear the expiry
        await user.save();
        sendSuccess(res, 200, "Email verified successfully! You can now log in.", null);
    }
    catch (error) {
        sendError(res, 500, "An error occurred while verifying email", "SERVER_ERROR");
    }
};
exports.verifyEmail = verifyEmail;
// @desc    Resend verification magic link
// @route   POST /auth/resend-verification
const resendVerification = async (req, res) => {
    try {
        // Validate input using Zod
        const parsed = authValidation_1.resendVerificationSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, "Invalid input data", "INVALID_INPUT", parsed.error);
        }
        const { email } = parsed.data;
        // 1. Find user
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return sendSuccess(res, 200, "If the account exists and is unverified, a new verification link will be sent.", null);
        }
        // 2. Check if already verified
        if (user.isVerified) {
            return sendSuccess(res, 200, "If the account exists and is unverified, a new verification link will be sent.", null);
        }
        // 3. Generate new raw token
        const rawToken = crypto_1.default.randomBytes(20).toString("hex");
        const hashedToken = crypto_1.default
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");
        // 4. Update user with new token and 24h expiry
        user.verificationToken = hashedToken;
        user.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);
        await user.save();
        // 5. Send Email
        const verificationUrl = buildVerificationUrl(req, rawToken);
        try {
            await (0, sendEmail_1.sendEmail)({
                email: user.email,
                subject: "StudyFAST - New Verification Link",
                fullName: user.fullName,
                verificationUrl,
            });
            sendSuccess(res, 200, "New verification link sent!", null);
        }
        catch (error) {
            // If email sending fails, clean up the token and expiry to prevent confusion
            user.verificationToken = undefined;
            user.verificationTokenExpires = undefined;
            await user.save();
            return sendError(res, 500, "Email could not be sent. Try again later.", "EMAIL_SEND_ERROR");
        }
    }
    catch (error) {
        sendError(res, 500, "An error occurred while resending verification link", "SERVER_ERROR");
    }
};
exports.resendVerification = resendVerification;
// @desc    Request password reset link
// @route   POST /auth/forgot-password
const forgotPassword = async (req, res) => {
    try {
        const parsed = authValidation_1.forgotPasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, "Invalid input data", "INVALID_INPUT", parsed.error);
        }
        const { email } = parsed.data;
        const user = await User_1.default.findOne({ email });
        if (!user) {
            return sendSuccess(res, 200, "If the account exists, a password reset link will be sent shortly.", null);
        }
        const rawToken = crypto_1.default.randomBytes(20).toString("hex");
        const hashedToken = crypto_1.default
            .createHash("sha256")
            .update(rawToken)
            .digest("hex");
        user.resetPasswordToken = hashedToken;
        user.resetPasswordTokenExpires = new Date(Date.now() + 15 * 60 * 1000);
        await user.save();
        const resetPasswordUrl = buildResetPasswordUrl(req, rawToken);
        try {
            await (0, sendEmail_1.sendEmail)({
                email: user.email,
                subject: "StudyFAST - Reset your password",
                fullName: user.fullName,
                resetPasswordUrl,
            });
            return sendSuccess(res, 200, "If the account exists, a password reset link will be sent shortly.", null);
        }
        catch (error) {
            user.resetPasswordToken = undefined;
            user.resetPasswordTokenExpires = undefined;
            await user.save();
            return sendError(res, 500, "Could not send password reset email. Please try again.", "EMAIL_SEND_ERROR");
        }
    }
    catch (error) {
        return sendError(res, 500, "An error occurred while processing the password reset request", "SERVER_ERROR");
    }
};
exports.forgotPassword = forgotPassword;
// @desc    Reset password using token
// @route   POST /auth/reset-password/:token
const resetPassword = async (req, res) => {
    try {
        const paramsResult = authValidation_1.resetPasswordParamsSchema.safeParse(req.params);
        if (!paramsResult.success) {
            return sendError(res, 400, "Invalid reset token", "INVALID_TOKEN", paramsResult.error);
        }
        const bodyResult = authValidation_1.resetPasswordSchema.safeParse(req.body);
        if (!bodyResult.success) {
            return sendError(res, 400, "Invalid input data", "INVALID_INPUT", bodyResult.error);
        }
        const hashedToken = crypto_1.default
            .createHash("sha256")
            .update(paramsResult.data.token)
            .digest("hex");
        const user = await User_1.default.findOne({
            resetPasswordToken: hashedToken,
            resetPasswordTokenExpires: { $gt: Date.now() },
        }).select("+password");
        if (!user) {
            return sendError(res, 400, "Invalid or expired reset token", "INVALID_OR_EXPIRED_TOKEN");
        }
        user.password = bodyResult.data.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordTokenExpires = undefined;
        await user.save();
        return sendSuccess(res, 200, "Password reset successful. You can now log in.", null);
    }
    catch (error) {
        return sendError(res, 500, "An error occurred while resetting the password", "SERVER_ERROR");
    }
};
exports.resetPassword = resetPassword;
// @desc    Update full name with current password confirmation
// @route   PATCH /auth/change-name
// @access  Private
const changeName = async (req, res) => {
    try {
        // Validate input using Zod
        const parsed = authValidation_1.updateNameSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, "Invalid input data", "INVALID_INPUT", parsed.error);
        }
        // Ensure token is correct and user is authenticated (auth middleware sets req.user)
        if (!req.user) {
            return sendError(res, 401, "Not authorized", "NOT_AUTHORIZED");
        }
        const { fullName, currentPassword } = parsed.data;
        const user = req.user;
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return sendError(res, 403, "Incorrect current password", "INVALID_CREDENTIALS");
        }
        user.fullName = fullName;
        await user.save();
        sendSuccess(res, 200, "Name updated successfully", {
            _id: user._id,
            fullName: user.fullName,
            email: user.email,
        });
    }
    catch (error) {
        return sendError(res, 500, "An error occurred", "INTERNAL_SERVER_ERROR");
    }
};
exports.changeName = changeName;
// @desc    Change password with current password confirmation
// @route   PATCH /auth/change-password
// @access  Private
const changePassword = async (req, res) => {
    try {
        // Validate input using Zod
        const parsed = authValidation_1.changePasswordSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendError(res, 400, "Invalid input data", "INVALID_INPUT", parsed.error);
        }
        // Ensure token is correct and user is authenticated (auth middleware sets req.user)
        if (!req.user) {
            return sendError(res, 401, "Not authorized", "NOT_AUTHORIZED");
        }
        const { currentPassword, newPassword } = parsed.data;
        const user = req.user;
        const isCurrentPasswordValid = await user.comparePassword(currentPassword);
        if (!isCurrentPasswordValid) {
            return sendError(res, 403, "Incorrect current password", "INVALID_CREDENTIALS");
        }
        // Ensure new password is different from current password
        const isSameAsOld = await user.comparePassword(newPassword);
        if (isSameAsOld) {
            return sendError(res, 400, "New password must be different from current password", "PASSWORD_NOT_DIFFERENT");
        }
        user.password = newPassword;
        await user.save();
        sendSuccess(res, 200, "Password changed successfully", null);
    }
    catch (error) {
        return sendError(res, 500, "An error occurred", "INTERNAL_SERVER_ERROR");
    }
};
exports.changePassword = changePassword;
