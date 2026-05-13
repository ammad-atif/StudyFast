"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.logWithRequest = exports.logger = void 0;
function getTimestamp() {
    return new Date().toISOString();
}
const log = (level, message, data, requestId) => {
    const entry = {
        timestamp: getTimestamp(),
        level,
        message,
        ...(requestId && { requestId }),
        ...(data && { ...data }),
    };
    console.log(JSON.stringify(entry));
};
exports.logger = {
    info: (message, data, requestId) => log('info', message, data, requestId),
    error: (message, data, requestId) => log('error', message, data, requestId),
    warn: (message, data, requestId) => log('warn', message, data, requestId),
    debug: (message, data, requestId) => log('debug', message, data, requestId),
};
const logWithRequest = (req, level, message, data) => {
    log(level, message, data, req.requestId);
};
exports.logWithRequest = logWithRequest;
