import { Router, Request, Response, NextFunction } from 'express';
import * as aiController from '../controllers/aiController';

const router = Router();

// Middleware stubs (implement based on your auth system)
const protect = (req: Request, res: Response, next: NextFunction) => next();
const requireVerified = (req: Request, res: Response, next: NextFunction) => next();

// Embedding endpoints
router.post('/embeddings/enqueue', protect, aiController.enqueueEmbedding);
router.get('/embeddings/:postId/status', protect, aiController.checkEmbeddingStatus);

// RAG proxy endpoints
router.post('/answer', protect, requireVerified, aiController.answerQuery);
router.post('/summary', protect, requireVerified, aiController.generateSummary);
router.post('/quiz', protect, requireVerified, aiController.generateQuiz);
router.post('/search', protect, requireVerified, aiController.searchEmbeddings);

export default router;
