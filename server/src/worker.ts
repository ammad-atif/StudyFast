// Worker process entry point
import 'dotenv/config';
import embeddingWorker from './queue/embeddingWorker';
import { connectDB } from './config/db';
import { logger } from './utils/logger';
import mongoose from 'mongoose';

const startWorker = async () => {
  try {
    // Ensure DB connection is established so worker can persist job status
    if (mongoose.connection.readyState === 1) {
      logger.info('MongoDB already connected (worker)');
    } else if (mongoose.connection.readyState === 2) {
      logger.info('MongoDB connection pending (worker)');
    } else {
      await connectDB();
    }
    logger.info('Worker started');
    logger.info('Waiting for embedding jobs...');
  } catch (error: any) {
    logger.error('Failed to start worker', { error: error.message });
    process.exit(1);
  }
};

startWorker();

process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down worker');
  await embeddingWorker.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down worker');
  await embeddingWorker.close();
  process.exit(0);
});
