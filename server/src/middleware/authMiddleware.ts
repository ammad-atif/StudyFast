import { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";
import User from "../models/User";
import { jwt_payload_schema } from "../validations/authValidation";

const sendError = (
  res: Response,
  statusCode: number,
  message: string,
  code: string,
) => {
  return res.status(statusCode).json({
    success: false,
    message,
    code,
    details: {},
  });
};

// Middleware to attach user to request (user is now part of Express Request via module augmentation)
export const protect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  let token;
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return sendError(
      res,
      500,
      "Server configuration error",
      "SERVER_MISCONFIGURED",
    );
  }

  if (req.headers.authorization?.startsWith("Bearer")) {
    try {
      token = req.headers.authorization.split(" ")[1];
      const decoded = jwt.verify(token, jwtSecret);

      const result = jwt_payload_schema.safeParse(decoded);
      if (!result.success) {
        return sendError(res, 401, "Not authorized", "TOKEN_INVALID");
      }
      const payload = result.data;

      // Attach user to request with password so protected handlers can validate current password.
      req.user = await User.findById(payload.id).select("+password");

      if (!req.user) {
        return sendError(res, 401, "Not authorized", "USER_NOT_FOUND");
      }

      return next();
    } catch (error) {
      return sendError(res, 401, "Not authorized", "TOKEN_FAILED");
    }
  }

  if (!token) {
    return sendError(res, 401, "Not authorized", "TOKEN_MISSING");
  }
};

export const optionalProtect = async (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  const jwtSecret = process.env.JWT_SECRET;

  if (!jwtSecret) {
    return sendError(
      res,
      500,
      "Server configuration error",
      "SERVER_MISCONFIGURED",
    );
  }

  if (!req.headers.authorization?.startsWith("Bearer")) {
    return next();
  }

  try {
    const token = req.headers.authorization.split(" ")[1];
    const decoded = jwt.verify(token, jwtSecret);

    const result = jwt_payload_schema.safeParse(decoded);
    if (!result.success) {
      return sendError(res, 401, "Not authorized", "TOKEN_INVALID");
    }

    const payload = result.data;
    req.user = await User.findById(payload.id);

    if (!req.user) {
      return sendError(res, 401, "Not authorized", "USER_NOT_FOUND");
    }

    return next();
  } catch (error) {
    return sendError(res, 401, "Not authorized", "TOKEN_FAILED");
  }
};

export const requireVerified = (
  req: Request,
  res: Response,
  next: NextFunction,
) => {
  if (!req.user) {
    return sendError(res, 401, "Not authorized", "NOT_AUTHORIZED");
  }

  if (!req.user.isVerified) {
    return sendError(
      res,
      403,
      "Only verified users can perform this action",
      "EMAIL_NOT_VERIFIED",
    );
  }

  return next();
};
