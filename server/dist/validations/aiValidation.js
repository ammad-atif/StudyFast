"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.statusCheckSchema = exports.ragQuerySchema = exports.enqueueEmbeddingSchema = void 0;
const zod_1 = require("zod");
exports.enqueueEmbeddingSchema = zod_1.z.object({
    postId: zod_1.z.string().min(1, 'Post ID is required'),
    chatLink: zod_1.z.string().url('Invalid chat link URL'),
});
exports.ragQuerySchema = zod_1.z.object({
    postId: zod_1.z.string().min(1, 'Post ID is required'),
    query: zod_1.z.string().min(1, 'Query is required'),
});
exports.statusCheckSchema = zod_1.z.object({
    postId: zod_1.z.string().min(1, 'Post ID is required'),
});
