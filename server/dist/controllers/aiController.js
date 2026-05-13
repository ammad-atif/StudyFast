"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.globalSemanticSearch = exports.searchEmbeddings = exports.generateQuiz = exports.generateSummary = exports.answerQuery = exports.checkEmbeddingStatus = exports.enqueueEmbedding = void 0;
const embeddingQueue_1 = __importDefault(require("../queue/embeddingQueue"));
const aiProxyService_1 = require("../services/ai/aiProxyService");
const Post_1 = __importDefault(require("../models/Post"));
const aiValidation_1 = require("../validations/aiValidation");
const apiResponse_1 = require("../utils/apiResponse");
const logger_1 = require("../utils/logger");
const enqueueEmbedding = async (req, res, next) => {
    try {
        const validated = aiValidation_1.enqueueEmbeddingSchema.parse(req.body);
        const { postId, chatLink } = validated;
        (0, logger_1.logWithRequest)(req, 'info', 'Enqueuing embedding job', { postId, chatLink });
        const job = await embeddingQueue_1.default.add('create-embeddings', {
            postId,
            chatLink,
            requestId: req.requestId,
        });
        // Update post with job ID
        await Post_1.default.findByIdAndUpdate(postId, {
            embeddingJobId: job.id,
            embeddingStatus: 'queued',
            embeddingUpdatedAt: new Date(),
        });
        (0, logger_1.logWithRequest)(req, 'info', 'Embedding job enqueued', { jobId: job.id });
        return (0, apiResponse_1.sendSuccess)(res, 'Embedding job enqueued', { jobId: job.id }, 202, req.requestId);
    }
    catch (error) {
        next(error);
    }
};
exports.enqueueEmbedding = enqueueEmbedding;
const checkEmbeddingStatus = async (req, res, next) => {
    try {
        const { postId } = aiValidation_1.statusCheckSchema.parse({ postId: req.params.postId });
        (0, logger_1.logWithRequest)(req, 'info', 'Checking embedding status', { postId });
        const post = await Post_1.default.findById(postId);
        if (!post) {
            return (0, apiResponse_1.sendError)(res, 'Post not found', 404, undefined, req.requestId);
        }
        return (0, apiResponse_1.sendSuccess)(res, 'Status retrieved', {
            postId,
            status: post.embeddingStatus || 'pending',
            jobId: post.embeddingJobId,
            error: post.embeddingError,
            updatedAt: post.embeddingUpdatedAt,
        }, 200, req.requestId);
    }
    catch (error) {
        next(error);
    }
};
exports.checkEmbeddingStatus = checkEmbeddingStatus;
const answerQuery = async (req, res, next) => {
    try {
        const { postId, query } = aiValidation_1.ragQuerySchema.parse(req.body);
        (0, logger_1.logWithRequest)(req, 'info', 'Answering query', { postId, query });
        const post = await Post_1.default.findById(postId).select('embeddingStatus embeddingError');
        if (!post) {
            return (0, apiResponse_1.sendError)(res, 'Post not found', 404, undefined, req.requestId);
        }
        if (post.embeddingStatus !== 'completed') {
            return (0, apiResponse_1.sendError)(res, 'Embeddings not completed yet', 409, post.embeddingStatus ? `Current embedding status: ${post.embeddingStatus}` : 'Embeddings not completed', req.requestId);
        }
        const answer = await aiProxyService_1.aiProxyService.answerQuery(postId, query, req.requestId);
        return (0, apiResponse_1.sendSuccess)(res, 'Query answered', answer, 200, req.requestId);
    }
    catch (error) {
        if (error instanceof aiProxyService_1.UpstreamTimeoutError) {
            (0, logger_1.logWithRequest)(req, 'warn', 'Answer query timeout', { error: error.message });
            return (0, apiResponse_1.sendError)(res, 'Request timeout', 504, error.message, req.requestId);
        }
        if (error instanceof aiProxyService_1.UpstreamServiceError) {
            (0, logger_1.logWithRequest)(req, 'error', 'Upstream service error', { statusCode: error.statusCode });
            return (0, apiResponse_1.sendError)(res, error.message, error.statusCode, undefined, req.requestId);
        }
        next(error);
    }
};
exports.answerQuery = answerQuery;
const generateSummary = async (req, res, next) => {
    try {
        const { postId } = aiValidation_1.statusCheckSchema.parse(req.body);
        (0, logger_1.logWithRequest)(req, 'info', 'Generating summary', { postId });
        const summary = await aiProxyService_1.aiProxyService.generateSummary(postId, req.requestId);
        return (0, apiResponse_1.sendSuccess)(res, 'Summary generated', summary, 200, req.requestId);
    }
    catch (error) {
        if (error instanceof aiProxyService_1.UpstreamTimeoutError) {
            return (0, apiResponse_1.sendError)(res, 'Request timeout', 504, error.message, req.requestId);
        }
        if (error instanceof aiProxyService_1.UpstreamServiceError) {
            return (0, apiResponse_1.sendError)(res, error.message, error.statusCode, undefined, req.requestId);
        }
        next(error);
    }
};
exports.generateSummary = generateSummary;
const generateQuiz = async (req, res, next) => {
    try {
        const { postId } = aiValidation_1.statusCheckSchema.parse(req.body);
        (0, logger_1.logWithRequest)(req, 'info', 'Generating quiz', { postId });
        const quiz = await aiProxyService_1.aiProxyService.generateQuiz(postId, req.requestId);
        return (0, apiResponse_1.sendSuccess)(res, 'Quiz generated', quiz, 200, req.requestId);
    }
    catch (error) {
        if (error instanceof aiProxyService_1.UpstreamTimeoutError) {
            return (0, apiResponse_1.sendError)(res, 'Request timeout', 504, error.message, req.requestId);
        }
        if (error instanceof aiProxyService_1.UpstreamServiceError) {
            return (0, apiResponse_1.sendError)(res, error.message, error.statusCode, undefined, req.requestId);
        }
        next(error);
    }
};
exports.generateQuiz = generateQuiz;
const searchEmbeddings = async (req, res, next) => {
    try {
        const { postId, query } = aiValidation_1.ragQuerySchema.parse(req.body);
        (0, logger_1.logWithRequest)(req, 'info', 'Searching embeddings', { postId, query });
        const results = await aiProxyService_1.aiProxyService.searchEmbeddings(postId, query, req.requestId);
        return (0, apiResponse_1.sendSuccess)(res, 'Search completed', results, 200, req.requestId);
    }
    catch (error) {
        if (error instanceof aiProxyService_1.UpstreamTimeoutError) {
            return (0, apiResponse_1.sendError)(res, 'Request timeout', 504, error.message, req.requestId);
        }
        if (error instanceof aiProxyService_1.UpstreamServiceError) {
            return (0, apiResponse_1.sendError)(res, error.message, error.statusCode, undefined, req.requestId);
        }
        next(error);
    }
};
exports.searchEmbeddings = searchEmbeddings;
const globalSemanticSearch = async (req, res, next) => {
    try {
        const { query } = req.body;
        if (!query || typeof query !== 'string' || query.trim().length === 0) {
            return (0, apiResponse_1.sendError)(res, 'Query is required', 400, undefined, req.requestId);
        }
        (0, logger_1.logWithRequest)(req, 'info', 'Global semantic search', { query });
        const searchResults = await aiProxyService_1.aiProxyService.globalSemanticSearch(query.trim(), req.requestId);
        // Extract post_ids from results array
        const results = searchResults?.results || [];
        const postIds = results.map((r) => r.post_id).filter(Boolean);
        if (postIds.length === 0) {
            return (0, apiResponse_1.sendSuccess)(res, 'Search completed', { posts: [] }, 200, req.requestId);
        }
        // Fetch posts from MongoDB using the IDs returned by semantic search
        const posts = await Post_1.default.find({ _id: { $in: postIds } }, { title: 1, description: 1, subject: 1, llmName: 1, createdBy: 1, upvotesCount: 1, downvotesCount: 1, commentsCount: 1, createdAt: 1, updatedAt: 1 }).populate('createdBy', '_id fullName email');
        return (0, apiResponse_1.sendSuccess)(res, 'Search completed', { posts }, 200, req.requestId);
    }
    catch (error) {
        if (error instanceof aiProxyService_1.UpstreamTimeoutError) {
            return (0, apiResponse_1.sendError)(res, 'Request timeout', 504, error.message, req.requestId);
        }
        if (error instanceof aiProxyService_1.UpstreamServiceError) {
            return (0, apiResponse_1.sendError)(res, error.message, error.statusCode, undefined, req.requestId);
        }
        next(error);
    }
};
exports.globalSemanticSearch = globalSemanticSearch;
