import { Response } from 'express';

export interface ApiSuccessResponse<T = any> {
  success: true;
  message: string;
  data?: T;
  requestId?: string;
}

export interface ApiErrorResponse {
  success: false;
  message: string;
  error?: string;
  statusCode: number;
  requestId?: string;
}

export const sendSuccess = <T = any>(
  res: Response,
  message: string,
  data?: T,
  statusCode: number = 200,
  requestId?: string
): Response => {
  const response: ApiSuccessResponse<T> = {
    success: true,
    message,
    ...(data && { data }),
    ...(requestId && { requestId }),
  };
  return res.status(statusCode).json(response);
};

export const sendError = (
  res: Response,
  message: string,
  statusCode: number = 500,
  error?: string,
  requestId?: string
): Response => {
  const response: ApiErrorResponse = {
    success: false,
    message,
    statusCode,
    ...(error && { error }),
    ...(requestId && { requestId }),
  };
  return res.status(statusCode).json(response);
};
