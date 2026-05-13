"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiProxyService = exports.UpstreamServiceError = exports.UpstreamTimeoutError = void 0;
const fastApiClient_1 = __importDefault(require("./fastApiClient"));
// When set to 0, Axios waits indefinitely for the embeddings call to complete.
const EMBEDDINGS_TIMEOUT_MS = parseInt(process.env.FASTAPI_EMBEDDINGS_TIMEOUT || '0', 10);
class UpstreamTimeoutError extends Error {
    constructor(message = 'Upstream service timeout') {
        super(message);
        this.name = 'UpstreamTimeoutError';
    }
}
exports.UpstreamTimeoutError = UpstreamTimeoutError;
class UpstreamServiceError extends Error {
    constructor(message = 'Upstream service error', statusCode = 500) {
        super(message);
        this.statusCode = statusCode;
        this.name = 'UpstreamServiceError';
    }
}
exports.UpstreamServiceError = UpstreamServiceError;
exports.aiProxyService = {
    async createEmbeddings(postId, chatLink, requestId) {
        try {
            const response = await fastApiClient_1.default.post('/api/embeddings', { post_id: postId, chat_link: chatLink }, {
                headers: { 'x-request-id': requestId },
                // Embedding generation can be long-running; when EMBEDDINGS_TIMEOUT_MS=0
                // Axios will wait indefinitely for the response (no timeout).
                timeout: EMBEDDINGS_TIMEOUT_MS,
            });
            return response.data;
        }
        catch (error) {
            if (error.code === 'FASTAPI_TIMEOUT' || error.message?.includes('timeout')) {
                throw new UpstreamTimeoutError('Embeddings creation timed out');
            }
            if (error.response?.status) {
                throw new UpstreamServiceError(error.response.data?.message || error.message, error.response.status);
            }
            throw new UpstreamServiceError(error.message);
        }
    },
    async answerQuery(postId, question, requestId) {
        try {
            const response = await fastApiClient_1.default.post('/api/answer', { post_id: postId, query: question }, {
                headers: { 'x-request-id': requestId },
            });
            return response.data;
        }
        catch (error) {
            if (error.code === 'FASTAPI_TIMEOUT') {
                throw new UpstreamTimeoutError();
            }
            throw new UpstreamServiceError(error.message, error.response?.status);
        }
    },
    async generateSummary(postId, requestId) {
        try {
            const response = await fastApiClient_1.default.post('/api/summary', { post_id: postId }, {
                headers: { 'x-request-id': requestId },
            });
            return response.data;
        }
        catch (error) {
            if (error.code === 'FASTAPI_TIMEOUT') {
                throw new UpstreamTimeoutError();
            }
            throw new UpstreamServiceError(error.message, error.response?.status);
        }
    },
    async generateQuiz(postId, requestId) {
        try {
            const response = await fastApiClient_1.default.post('/api/quiz', { post_id: postId }, {
                headers: { 'x-request-id': requestId },
            });
            return response.data;
        }
        catch (error) {
            if (error.code === 'FASTAPI_TIMEOUT') {
                throw new UpstreamTimeoutError();
            }
            throw new UpstreamServiceError(error.message, error.response?.status);
        }
    },
    async searchEmbeddings(postId, query, requestId) {
        try {
            const response = await fastApiClient_1.default.post('/api/search', { post_id: postId, query }, {
                headers: { 'x-request-id': requestId },
            });
            return response.data;
        }
        catch (error) {
            if (error.code === 'FASTAPI_TIMEOUT') {
                throw new UpstreamTimeoutError();
            }
            throw new UpstreamServiceError(error.message, error.response?.status);
        }
    },
    async globalSemanticSearch(query, requestId) {
        try {
            const response = await fastApiClient_1.default.post('/api/search', { query }, {
                headers: { 'x-request-id': requestId },
            });
            return response.data;
        }
        catch (error) {
            if (error.code === 'FASTAPI_TIMEOUT') {
                throw new UpstreamTimeoutError();
            }
            throw new UpstreamServiceError(error.message, error.response?.status);
        }
    },
};
