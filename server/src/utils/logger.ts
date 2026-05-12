import { Request } from 'express';

interface LogEntry {
  timestamp: string;
  level: 'info' | 'error' | 'warn' | 'debug';
  message: string;
  requestId?: string;
  [key: string]: any;
}

function getTimestamp(): string {
  return new Date().toISOString();
}

const log = (level: 'info' | 'error' | 'warn' | 'debug', message: string, data?: any, requestId?: string) => {
  const entry: LogEntry = {
    timestamp: getTimestamp(),
    level,
    message,
    ...(requestId && { requestId }),
    ...(data && { ...data }),
  };
  console.log(JSON.stringify(entry));
};

export const logger = {
  info: (message: string, data?: any, requestId?: string) => log('info', message, data, requestId),
  error: (message: string, data?: any, requestId?: string) => log('error', message, data, requestId),
  warn: (message: string, data?: any, requestId?: string) => log('warn', message, data, requestId),
  debug: (message: string, data?: any, requestId?: string) => log('debug', message, data, requestId),
};

export const logWithRequest = (req: Request, level: 'info' | 'error' | 'warn' | 'debug', message: string, data?: any) => {
  log(level, message, data, req.requestId);
};
