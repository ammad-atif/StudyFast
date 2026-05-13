"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requireVerified = exports.optionalProtect = exports.protect = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const User_1 = __importDefault(require("../models/User"));
const authValidation_1 = require("../validations/authValidation");
const sendError = (res, statusCode, message, code) => {
    return res.status(statusCode).json({
        success: false,
        message,
        code,
        details: {},
    });
};
// Middleware to attach user to request (user is now part of Express Request via module augmentation)
const protect = async (req, res, next) => {
    let token;
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return sendError(res, 500, "Server configuration error", "SERVER_MISCONFIGURED");
    }
    if (req.headers.authorization?.startsWith("Bearer")) {
        try {
            token = req.headers.authorization.split(" ")[1];
            const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
            const result = authValidation_1.jwt_payload_schema.safeParse(decoded);
            if (!result.success) {
                return sendError(res, 401, "Not authorized", "TOKEN_INVALID");
            }
            const payload = result.data;
            // Attach user to request with password so protected handlers can validate current password.
            req.user = await User_1.default.findById(payload.id).select("+password");
            if (!req.user) {
                return sendError(res, 401, "Not authorized", "USER_NOT_FOUND");
            }
            return next();
        }
        catch (error) {
            return sendError(res, 401, "Not authorized", "TOKEN_FAILED");
        }
    }
    if (!token) {
        return sendError(res, 401, "Not authorized", "TOKEN_MISSING");
    }
};
exports.protect = protect;
const optionalProtect = async (req, res, next) => {
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
        return sendError(res, 500, "Server configuration error", "SERVER_MISCONFIGURED");
    }
    if (!req.headers.authorization?.startsWith("Bearer")) {
        return next();
    }
    try {
        const token = req.headers.authorization.split(" ")[1];
        const decoded = jsonwebtoken_1.default.verify(token, jwtSecret);
        const result = authValidation_1.jwt_payload_schema.safeParse(decoded);
        if (!result.success) {
            return sendError(res, 401, "Not authorized", "TOKEN_INVALID");
        }
        const payload = result.data;
        req.user = await User_1.default.findById(payload.id);
        if (!req.user) {
            return sendError(res, 401, "Not authorized", "USER_NOT_FOUND");
        }
        return next();
    }
    catch (error) {
        return sendError(res, 401, "Not authorized", "TOKEN_FAILED");
    }
};
exports.optionalProtect = optionalProtect;
const requireVerified = (req, res, next) => {
    if (!req.user) {
        return sendError(res, 401, "Not authorized", "NOT_AUTHORIZED");
    }
    if (!req.user.isVerified) {
        return sendError(res, 403, "Only verified users can perform this action", "EMAIL_NOT_VERIFIED");
    }
    return next();
};
exports.requireVerified = requireVerified;
