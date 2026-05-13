"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fastApiClient = void 0;
const axios_1 = __importDefault(require("axios"));
const FASTAPI_BASE_URL = process.env.FASTAPI_URL || 'http://localhost:8000';
const FASTAPI_TIMEOUT = parseInt(process.env.FASTAPI_TIMEOUT || '15000');
exports.fastApiClient = axios_1.default.create({
    baseURL: FASTAPI_BASE_URL,
    timeout: FASTAPI_TIMEOUT,
    headers: {
        'Content-Type': 'application/json',
    },
});
exports.fastApiClient.interceptors.response.use((response) => response, (error) => {
    if (error.code === 'ECONNABORTED') {
        const timeoutError = new Error('FastAPI request timeout');
        timeoutError.code = 'FASTAPI_TIMEOUT';
        throw timeoutError;
    }
    throw error;
});
exports.default = exports.fastApiClient;
