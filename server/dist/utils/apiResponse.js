"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendSuccess = void 0;
const sendSuccess = (res, message, data, statusCode = 200, requestId) => {
    const response = {
        success: true,
        message,
        ...(data && { data }),
        ...(requestId && { requestId }),
    };
    return res.status(statusCode).json(response);
};
exports.sendSuccess = sendSuccess;
const sendError = (res, message, statusCode = 500, error, requestId) => {
    const response = {
        success: false,
        message,
        statusCode,
        ...(error && { error }),
        ...(requestId && { requestId }),
    };
    return res.status(statusCode).json(response);
};
exports.sendError = sendError;
