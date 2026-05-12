import { Request, Response, NextFunction } from 'express';
import embeddingQueue from '../queue/embeddingQueue';
import { aiProxyService, UpstreamTimeoutError, UpstreamServiceError } from '../services/ai/aiProxyService';
import Post from '../models/Post';
import { enqueueEmbeddingSchema, ragQuerySchema, statusCheckSchema } from '../validations/aiValidation';
import { sendSuccess, sendError } from '../utils/apiResponse';
import { logWithRequest, logger } from '../utils/logger';

export const enqueueEmbedding = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const validated = enqueueEmbeddingSchema.parse(req.body);
    const { postId, chatLink } = validated;

    logWithRequest(req, 'info', 'Enqueuing embedding job', { postId, chatLink });

    const job = await embeddingQueue.add('create-embeddings', {
      postId,
      chatLink,
      requestId: req.requestId,
    });

    // Update post with job ID
    await Post.findByIdAndUpdate(postId, {
      embeddingJobId: job.id,
      embeddingStatus: 'queued',
      embeddingUpdatedAt: new Date(),
    });

    logWithRequest(req, 'info', 'Embedding job enqueued', { jobId: job.id });
    return sendSuccess(res, 'Embedding job enqueued', { jobId: job.id }, 202, req.requestId);
  } catch (error) {
    next(error);
  }
};

export const checkEmbeddingStatus = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId } = statusCheckSchema.parse({ postId: req.params.postId });

    logWithRequest(req, 'info', 'Checking embedding status', { postId });

    const post = await Post.findById(postId);
    if (!post) {
      return sendError(res, 'Post not found', 404, undefined, req.requestId);
    }

    return sendSuccess(res, 'Status retrieved', {
      postId,
      status: post.embeddingStatus || 'pending',
      jobId: post.embeddingJobId,
      error: post.embeddingError,
      updatedAt: post.embeddingUpdatedAt,
    }, 200, req.requestId);
  } catch (error) {
    next(error);
  }
};

export const answerQuery = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId, query } = ragQuerySchema.parse(req.body);

    logWithRequest(req, 'info', 'Answering query', { postId, query });

    const answer = await aiProxyService.answerQuery(postId, query, req.requestId);
    return sendSuccess(res, 'Query answered', answer, 200, req.requestId);
  } catch (error: any) {
    if (error instanceof UpstreamTimeoutError) {
      logWithRequest(req, 'warn', 'Answer query timeout', { error: error.message });
      return sendError(res, 'Request timeout', 504, error.message, req.requestId);
    }
    if (error instanceof UpstreamServiceError) {
      logWithRequest(req, 'error', 'Upstream service error', { statusCode: error.statusCode });
      return sendError(res, error.message, error.statusCode, undefined, req.requestId);
    }
    next(error);
  }
};

export const generateSummary = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId } = statusCheckSchema.parse(req.body);

    logWithRequest(req, 'info', 'Generating summary', { postId });

    const summary = await aiProxyService.generateSummary(postId, req.requestId);
    return sendSuccess(res, 'Summary generated', summary, 200, req.requestId);
  } catch (error: any) {
    if (error instanceof UpstreamTimeoutError) {
      return sendError(res, 'Request timeout', 504, error.message, req.requestId);
    }
    if (error instanceof UpstreamServiceError) {
      return sendError(res, error.message, error.statusCode, undefined, req.requestId);
    }
    next(error);
  }
};

export const generateQuiz = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId } = statusCheckSchema.parse(req.body);

    logWithRequest(req, 'info', 'Generating quiz', { postId });

    const quiz = await aiProxyService.generateQuiz(postId, req.requestId);
    return sendSuccess(res, 'Quiz generated', quiz, 200, req.requestId);
  } catch (error: any) {
    if (error instanceof UpstreamTimeoutError) {
      return sendError(res, 'Request timeout', 504, error.message, req.requestId);
    }
    if (error instanceof UpstreamServiceError) {
      return sendError(res, error.message, error.statusCode, undefined, req.requestId);
    }
    next(error);
  }
};

export const searchEmbeddings = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { postId, query } = ragQuerySchema.parse(req.body);

    logWithRequest(req, 'info', 'Searching embeddings', { postId, query });

    const results = await aiProxyService.searchEmbeddings(postId, query, req.requestId);
    return sendSuccess(res, 'Search completed', results, 200, req.requestId);
  } catch (error: any) {
    if (error instanceof UpstreamTimeoutError) {
      return sendError(res, 'Request timeout', 504, error.message, req.requestId);
    }
    if (error instanceof UpstreamServiceError) {
      return sendError(res, error.message, error.statusCode, undefined, req.requestId);
    }
    next(error);
  }
};
