"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.errorHandler = void 0;
const zod_1 = require("zod");
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = require("../utils/logger");
const errorHandler = (err, req, res, next) => {
    const requestId = req.requestId;
    if (err instanceof zod_1.ZodError) {
        const errors = err.flatten().fieldErrors;
        logger_1.logger.warn('Validation error', { errors }, requestId);
        return (0, apiResponse_1.sendError)(res, 'Validation error', 400, JSON.stringify(errors), requestId);
    }
    if (err.name === 'MongoError' || err.name === 'MongoServerError') {
        logger_1.logger.error('Database error', { message: err.message }, requestId);
        return (0, apiResponse_1.sendError)(res, 'Database error', 500, err.message, requestId);
    }
    if (err.statusCode && err.message) {
        logger_1.logger.warn('HTTP error', { statusCode: err.statusCode, message: err.message }, requestId);
        return (0, apiResponse_1.sendError)(res, err.message, err.statusCode, err.error, requestId);
    }
    logger_1.logger.error('Unhandled error', { message: err.message, stack: err.stack }, requestId);
    return (0, apiResponse_1.sendError)(res, 'Internal server error', 500, err.message, requestId);
};
exports.errorHandler = errorHandler;
