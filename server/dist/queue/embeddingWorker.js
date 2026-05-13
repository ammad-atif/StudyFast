"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const bullmq_1 = require("bullmq");
const connection_1 = __importDefault(require("./connection"));
const embeddingQueue_1 = require("./embeddingQueue");
const aiProxyService_1 = require("../services/ai/aiProxyService");
const Post_1 = __importDefault(require("../models/Post"));
const logger_1 = require("../utils/logger");
const EMBEDDING_WORKER_CONCURRENCY = parseInt(process.env.EMBEDDING_WORKER_CONCURRENCY || '1', 10);
const embeddingWorker = new bullmq_1.Worker(embeddingQueue_1.EMBEDDING_QUEUE_NAME, async (job) => {
    const { postId, chatLink, requestId } = job.data;
    logger_1.logger.info('Processing embedding job', { postId, jobId: job.id }, requestId);
    // Simple synchronous flow: call AI backend, then persist final status.
    try {
        // Call FastAPI to create embeddings
        const result = await aiProxyService_1.aiProxyService.createEmbeddings(postId, chatLink, requestId);
        // Persist final success status
        await Post_1.default.findByIdAndUpdate(postId, {
            embeddingStatus: 'completed',
            embeddingJobId: job.id,
            embeddingError: null,
            embeddingUpdatedAt: new Date(),
        });
        logger_1.logger.info('Embedding job completed', { postId, jobId: job.id, aiStatus: result?.status, aiMessage: result?.message }, requestId);
        return result;
    }
    catch (error) {
        logger_1.logger.error('Embedding job failed', { postId, jobId: job.id, error: error.message }, requestId);
        // Persist failure status
        await Post_1.default.findByIdAndUpdate(postId, {
            embeddingStatus: 'failed',
            embeddingError: error.message,
            embeddingUpdatedAt: new Date(),
        });
        throw error;
    }
}, {
    connection: connection_1.default,
    // Keep embedding calls serialized by default to avoid overloading AI backend.
    concurrency: EMBEDDING_WORKER_CONCURRENCY,
});
embeddingWorker.on('error', (err) => {
    logger_1.logger.error('Worker error', { error: err ? (err.message || err) : 'unknown error' });
});
embeddingWorker.on('completed', (job) => {
    logger_1.logger.info('Job completed', { jobId: job.id });
});
embeddingWorker.on('failed', (job, err) => {
    logger_1.logger.error('Job failed', { jobId: job?.id, error: err.message });
});
exports.default = embeddingWorker;
