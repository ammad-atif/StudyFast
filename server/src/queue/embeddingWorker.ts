import { Worker, Job } from 'bullmq';
import redisOptions from './connection';
import { EMBEDDING_QUEUE_NAME, EmbeddingJobData } from './embeddingQueue';
import { aiProxyService } from '../services/ai/aiProxyService';
import Post from '../models/Post';
import { logger } from '../utils/logger';

const EMBEDDING_WORKER_CONCURRENCY = parseInt(process.env.EMBEDDING_WORKER_CONCURRENCY || '1', 10);

const embeddingWorker = new Worker(
  EMBEDDING_QUEUE_NAME,
  async (job: Job<EmbeddingJobData>) => {
    const { postId, chatLink, requestId } = job.data;

      logger.info('Processing embedding job', { postId, jobId: job.id }, requestId);

    // Simple synchronous flow: call AI backend, then persist final status.

    try {
      // Call FastAPI to create embeddings
      const result = await aiProxyService.createEmbeddings(postId, chatLink, requestId);

      // Persist final success status
      await Post.findByIdAndUpdate(postId, {
        embeddingStatus: 'completed',
        embeddingJobId: job.id,
        embeddingError: null,
        embeddingUpdatedAt: new Date(),
      });

      logger.info('Embedding job completed', { postId, jobId: job.id, aiStatus: result?.status, aiMessage: result?.message }, requestId);
      return result;
    } catch (error: any) {
      logger.error('Embedding job failed', { postId, jobId: job.id, error: error.message }, requestId);

      // Persist failure status
      await Post.findByIdAndUpdate(postId, {
        embeddingStatus: 'failed',
        embeddingError: error.message,
        embeddingUpdatedAt: new Date(),
      });

      throw error;
    }
  },
  {
    connection: redisOptions,
    // Keep embedding calls serialized by default to avoid overloading AI backend.
    concurrency: EMBEDDING_WORKER_CONCURRENCY,
  }
);

embeddingWorker.on('error', (err) => {
  logger.error('Worker error', { error: err ? (err.message || err) : 'unknown error' });
});

embeddingWorker.on('completed', (job) => {
  logger.info('Job completed', { jobId: job.id });
});

embeddingWorker.on('failed', (job, err) => {
  logger.error('Job failed', { jobId: job?.id, error: err.message });
});

export default embeddingWorker;
