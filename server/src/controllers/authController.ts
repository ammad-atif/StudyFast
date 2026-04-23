import { Request, Response } from "express";
import User from "../models/User";
import crypto from "crypto";
import jwt from "jsonwebtoken";
import { z } from "zod";
import {
  registerSchema,
  loginSchema,
  verifyEmailSchema,
  resendVerificationSchema,
  updateNameSchema,
  changePasswordSchema,
  jwt_payload_schema,
} from "../validations/authValidation";
import { AuthRequest } from "../middleware/authMiddleware";
import { sendEmail } from "../utils/sendEmail";
const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code: string,
  error?: z.ZodError,
) => {
  return res.status(statusCode).json({
    success: false,
    message: message,
    code: code,
    details: error ? z.flattenError(error).fieldErrors : {},
    //     {
    //   "formErrors": [],
    //   "fieldErrors": {
    //     "email": ["Invalid email"],
    //     "password": ["String must contain at least 8 character(s)"]
    //   }
    // }
  });
};

const sendSuccess = <T>(
  res: Response,
  statusCode: number,
  message: string,
  data?: T,
) => {
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

const buildVerificationUrl = (req: Request, rawToken: string) => {
  const configuredBaseUrl = process.env.PUBLIC_API_URL?.trim();
  const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get("host")}`;
  return `${baseUrl}/auth/verify-email/${rawToken}`;
};

const generateToken = (payload: z.infer<typeof jwt_payload_schema>) => {
  return jwt.sign(payload, getJwtSecret(), {
    expiresIn: "30d",
  });
};

// @desc    Register new user
// @route   POST /auth/register
export const registerUser = async (req: Request, res: Response) => {
  try {
    // Validate input using Zod
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid input data",
        "INVALID_INPUT",
        parsed.error,
      );
    }

    //Check if user already exists
    const { fullName, email, password } = parsed.data;

    const userExists = await User.findOne({ email });
    if (userExists)
      return sendError(res, 409, "User already exists", "USER_EXISTS");

    //creating token for email verification
    const rawToken = crypto.randomBytes(20).toString("hex");
    const hashedToken = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");
    const tokenExpiration = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Create user with verification token and expiry
    const user = await User.create({
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
      await sendEmail({
        email: user.email,
        subject: "StudyFAST - Verify your email",
        fullName: user.fullName,
        verificationUrl,
      });
    } catch (error) {
      // If email sending fails, clean up the user record (remove token and expiry)
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();
      return sendError(
        res,
        500,
        "Could not send verification email. Please try again.",
        "EMAIL_SEND_ERROR",
      );
    }

    // Respond with success message (without token, since email verification is required)
    sendSuccess(
      res,
      201,
      "Registration successful. Please check your email to verify your account.",
      {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
      },
    );
  } catch (error: any) {
    if (error?.code === 11000) {
      return sendError(res, 409, "User already exists", "USER_EXISTS");
    }
    sendError(
      res,
      500,
      "An error occurred during registration",
      "SERVER_ERROR",
    );
  }
};

// @desc    Login user
// @route   POST /auth/login
export const loginUser = async (req: Request, res: Response) => {
  try {
    // Validate input using Zod
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid input data",
        "INVALID_INPUT",
        parsed.error,
      );
    }

    // Check for user and validate password
    const { email, password } = parsed.data;

    const user = await User.findOne({ email }).select("+password");

    const isMatch = user ? await user.comparePassword(password) : false;

    // If valid credentials and user exists, check if email is verified before sending token
    if (isMatch && user) {
      // Check if email is verified
      if (!user.isVerified) {
        return sendError(
          res,
          403,
          "Email not verified. Please check your inbox.",
          "EMAIL_NOT_VERIFIED",
        );
      }
      // Generate JWT token and send user data
      sendSuccess(res, 200, "Login successful", {
        _id: user._id,
        fullName: user.fullName,
        email: user.email,
        isVerified: user.isVerified,
        token: generateToken({ id: user._id.toString() }),
      });
    } else {
      // Invalid credentials
      sendError(res, 401, "Invalid email or password", "INVALID_CREDENTIALS");
    }
  } catch (error: any) {
    sendError(res, 500, "An error occurred during login", "SERVER_ERROR");
  }
};

export const verifyEmail = async (req: Request, res: Response) => {
  try {
    // Validate token parameter using Zod
    const parsed = verifyEmailSchema.safeParse(req.params);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid verification token",
        "INVALID_TOKEN",
        parsed.error,
      );
    }

    // 1. Hash the raw token from the URL (params) to compare with stored hash
    const hashedToken = crypto
      .createHash("sha256")
      .update(parsed.data.token)
      .digest("hex");

    // 2. Find user with matching token and valid expiry
    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: Date.now() },
    });

    // If no user found, token is invalid or expired
    if (!user) {
      return sendError(
        res,
        400,
        "Invalid or expired verification token",
        "INVALID_OR_EXPIRED_TOKEN",
      );
    }

    // 3. Update User Status
    user.isVerified = true;
    user.verificationToken = undefined; // Clear the token
    user.verificationTokenExpires = undefined; // Clear the expiry

    await user.save();

    sendSuccess(
      res,
      200,
      "Email verified successfully! You can now log in.",
      null,
    );
  } catch (error: any) {
    sendError(
      res,
      500,
      "An error occurred while verifying email",
      "SERVER_ERROR",
    );
  }
};

// @desc    Resend verification magic link
// @route   POST /auth/resend-verification
export const resendVerification = async (req: Request, res: Response) => {
  try {
    // Validate input using Zod
    const parsed = resendVerificationSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid input data",
        "INVALID_INPUT",
        parsed.error,
      );
    }
    const { email } = parsed.data;

    // 1. Find user
    const user = await User.findOne({ email });

    if (!user) {
      return sendSuccess(
        res,
        200,
        "If the account exists and is unverified, a new verification link will be sent.",
        null,
      );
    }

    // 2. Check if already verified
    if (user.isVerified) {
      return sendSuccess(
        res,
        200,
        "If the account exists and is unverified, a new verification link will be sent.",
        null,
      );
    }

    // 3. Generate new raw token
    const rawToken = crypto.randomBytes(20).toString("hex");
    const hashedToken = crypto
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
      await sendEmail({
        email: user.email,
        subject: "StudyFAST - New Verification Link",
        fullName: user.fullName,
        verificationUrl,
      });

      sendSuccess(res, 200, "New verification link sent!", null);
    } catch (error) {
      // If email sending fails, clean up the token and expiry to prevent confusion
      user.verificationToken = undefined;
      user.verificationTokenExpires = undefined;
      await user.save();

      return sendError(
        res,
        500,
        "Email could not be sent. Try again later.",
        "EMAIL_SEND_ERROR",
      );
    }
  } catch (error: any) {
    sendError(
      res,
      500,
      "An error occurred while resending verification link",
      "SERVER_ERROR",
    );
  }
};

// @desc    Update full name with current password confirmation
// @route   PATCH /auth/change-name
// @access  Private
export const changeName = async (req: AuthRequest, res: Response) => {
  try {
    // Validate input using Zod
    const parsed = updateNameSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid input data",
        "INVALID_INPUT",
        parsed.error,
      );
    }

    // Ensure token is correct and user is authenticated (auth middleware sets req.user)
    if (!req.user) {
      return sendError(res, 401, "Not authorized", "NOT_AUTHORIZED");
    }

    const { fullName, currentPassword } = parsed.data;
    const user = req.user;

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return sendError(
        res,
        403,
        "Incorrect current password",
        "INVALID_CREDENTIALS",
      );
    }

    user.fullName = fullName;
    await user.save();

    sendSuccess(res, 200, "Name updated successfully", {
      _id: user._id,
      fullName: user.fullName,
      email: user.email,
    });
  } catch (error: any) {
    return sendError(res, 500, "An error occurred", "INTERNAL_SERVER_ERROR");
  }
};

// @desc    Change password with current password confirmation
// @route   PATCH /auth/change-password
// @access  Private
export const changePassword = async (req: AuthRequest, res: Response) => {
  try {
    // Validate input using Zod
    const parsed = changePasswordSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendError(
        res,
        400,
        "Invalid input data",
        "INVALID_INPUT",
        parsed.error,
      );
    }

    // Ensure token is correct and user is authenticated (auth middleware sets req.user)
    if (!req.user) {
      return sendError(res, 401, "Not authorized", "NOT_AUTHORIZED");
    }

    const { currentPassword, newPassword } = parsed.data;
    const user = req.user;

    const isCurrentPasswordValid = await user.comparePassword(currentPassword);
    if (!isCurrentPasswordValid) {
      return sendError(
        res,
        403,
        "Incorrect current password",
        "INVALID_CREDENTIALS",
      );
    }

    // Ensure new password is different from current password
    const isSameAsOld = await user.comparePassword(newPassword);
    if (isSameAsOld) {
      return sendError(
        res,
        400,
        "New password must be different from current password",
        "PASSWORD_NOT_DIFFERENT",
      );
    }

    user.password = newPassword;
    await user.save();

    sendSuccess(res, 200, "Password changed successfully", null);
  } catch (error: any) {
    return sendError(res, 500, "An error occurred", "INTERNAL_SERVER_ERROR");
  }
};
