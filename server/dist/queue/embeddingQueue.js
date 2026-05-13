"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.embeddingQueue = exports.EMBEDDING_QUEUE_NAME = void 0;
const bullmq_1 = require("bullmq");
const connection_1 = __importDefault(require("./connection"));
exports.EMBEDDING_QUEUE_NAME = 'embeddings';
exports.embeddingQueue = new bullmq_1.Queue(exports.EMBEDDING_QUEUE_NAME, {
    connection: connection_1.default,
    defaultJobOptions: {
        // Do not retry embedding jobs automatically; wait synchronously for result.
        attempts: 1,
        removeOnComplete: true,
    },
});
exports.embeddingQueue.on('error', (err) => {
    console.error('[EmbeddingQueue] Error:', err ? (err.message || err) : 'unknown error');
});
exports.default = exports.embeddingQueue;
