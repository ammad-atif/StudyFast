import { Queue } from 'bullmq';
import redisOptions from './connection';

export const EMBEDDING_QUEUE_NAME = 'embeddings';

export const embeddingQueue = new Queue(EMBEDDING_QUEUE_NAME, {
  connection: redisOptions,
  defaultJobOptions: {
    // Do not retry embedding jobs automatically; wait synchronously for result.
    attempts: 1,
    removeOnComplete: true,
  },
});

embeddingQueue.on('error', (err) => {
  console.error('[EmbeddingQueue] Error:', err ? (err.message || err) : 'unknown error');
});

export interface EmbeddingJobData {
  postId: string;
  chatLink: string;
  requestId: string;
}

export default embeddingQueue;
