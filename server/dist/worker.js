"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// Worker process entry point
require("dotenv/config");
const embeddingWorker_1 = __importDefault(require("./queue/embeddingWorker"));
const db_1 = require("./config/db");
const logger_1 = require("./utils/logger");
const mongoose_1 = __importDefault(require("mongoose"));
const startWorker = async () => {
    try {
        // Ensure DB connection is established so worker can persist job status
        if (mongoose_1.default.connection.readyState === 1) {
            logger_1.logger.info('MongoDB already connected (worker)');
        }
        else if (mongoose_1.default.connection.readyState === 2) {
            logger_1.logger.info('MongoDB connection pending (worker)');
        }
        else {
            await (0, db_1.connectDB)();
        }
        logger_1.logger.info('Worker started');
        logger_1.logger.info('Waiting for embedding jobs...');
    }
    catch (error) {
        logger_1.logger.error('Failed to start worker', { error: error.message });
        process.exit(1);
    }
};
startWorker();
process.on('SIGTERM', async () => {
    logger_1.logger.info('SIGTERM received, shutting down worker');
    await embeddingWorker_1.default.close();
    process.exit(0);
});
process.on('SIGINT', async () => {
    logger_1.logger.info('SIGINT received, shutting down worker');
    await embeddingWorker_1.default.close();
    process.exit(0);
});
