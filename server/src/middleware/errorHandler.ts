import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { sendError } from '../utils/apiResponse';
import { logger } from '../utils/logger';

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction) => {
  const requestId = req.requestId;

  if (err instanceof ZodError) {
    const errors = err.flatten().fieldErrors;
    logger.warn('Validation error', { errors }, requestId);
    return sendError(res, 'Validation error', 400, JSON.stringify(errors), requestId);
  }

  if (err.name === 'MongoError' || err.name === 'MongoServerError') {
    logger.error('Database error', { message: err.message }, requestId);
    return sendError(res, 'Database error', 500, err.message, requestId);
  }

  if (err.statusCode && err.message) {
    logger.warn('HTTP error', { statusCode: err.statusCode, message: err.message }, requestId);
    return sendError(res, err.message, err.statusCode, err.error, requestId);
  }

  logger.error('Unhandled error', { message: err.message, stack: err.stack }, requestId);
  return sendError(res, 'Internal server error', 500, err.message, requestId);
};
