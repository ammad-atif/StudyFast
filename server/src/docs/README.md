# Server Docs — Final

This document describes the final, updated functionality of the StudyFAST Express backend (BFF).
Keep this file as the canonical server-side documentation for developers and operators.

## Summary

The Express BFF provides:

- Authentication (JWT) and user management
- Post CRUD operations with embedding job orchestration
- Async embedding creation via BullMQ + Redis
- RAG proxy endpoints that forward requests to the FastAPI AI backend
- Request tracing via `x-request-id` propagated across frontend, BFF, worker, and AI backend
- Centralized error handling and JSON logging
- OpenAPI spec served at `/openapi.json` and interactive docs at `/docs`

## Key Files and Locations

- `src/app.ts` — Express configuration, middleware mounting, routes registration
- `src/server.ts` — App bootstrap and HTTP server entry
- `src/worker.ts` — Worker process entry (BullMQ worker for embedding jobs)
- `src/config/db.ts` — MongoDB connection
- `src/models/Post.ts` — Post model (includes `embeddingStatus`, `embeddingJobId`, `embeddingError`, `embeddingUpdatedAt`)
- `src/queue/` — Redis connection, `embeddingQueue.ts`, `embeddingWorker.ts`
- `src/services/ai/` — `fastApiClient.ts`, `aiProxyService.ts` (proxy + error mapping)
- `src/controllers/aiController.ts` — Enqueue embedding, check status, RAG proxy handlers
- `src/middleware/requestContext.ts` — `x-request-id` attachment and propagation
- `src/middleware/errorHandler.ts` — Normalized error responses and Zod handling
- `src/utils/apiResponse.ts` — `sendSuccess` / `sendError` helpers
- `src/utils/logger.ts` — JSON logger used across services

## New / Updated Functionality (2026)

1. Embedding Pipeline (async)
   - Creating a Post with a `chatLink` enqueues a job to the BullMQ `embeddings` queue.
   - Worker retrieves the job, calls FastAPI `/api/embeddings` and updates `Post.embeddingStatus`.
   - Idempotency: FastAPI checks Pinecone for existing vectors for `post_id`. If found, it returns `already_exists` and no duplicate vectors are created.

2. RAG Proxy Endpoints
   - `/ai/answer`, `/ai/summary`, `/ai/quiz`, `/ai/search` proxy requests to the FastAPI backend and forward `x-request-id` for tracing.
   - Upstream errors and timeouts are normalized and converted to appropriate HTTP statuses (504 for timeouts, 502/503 for upstream errors).

3. Observability and Tracing
   - `x-request-id` header generated at entry (frontend or BFF) is preserved through worker jobs and forwarded to FastAPI.
   - All logs produced by `src/utils/logger.ts` include `requestId` where available.
   - Access logs are written via Morgan to `logs/access.log`.

4. Queue Configuration
   - BullMQ configured with 3 attempts and exponential backoff (2s base).
   - Worker concurrency set to 5 (configurable in `src/queue/embeddingWorker.ts`).

5. Error Handling
   - Zod validation errors are returned as `400` with details.
   - Database errors are captured and returned as `500`.
   - Upstream FastAPI timeouts are surfaced as `504` to clients.

## API: Important Endpoints (short)

- `POST /posts` — Create post (with optional `chatLink`) — enqueues embedding job.
- `GET /ai/embeddings/:postId/status` — Check embedding existence/status.
- `POST /ai/embeddings/enqueue` — Manually enqueue embedding creation (if needed).
- `POST /ai/answer` — RAG answer proxy.
- `POST /ai/summary` — RAG summary proxy.
- `POST /ai/quiz` — RAG quiz proxy.
- `POST /ai/search` — RAG search proxy.
- `GET /openapi.json` and `GET /docs` — API specification and interactive docs.

## How to Run (dev)

```bash
# from repository root
cd server
npm install
# Run server with auto-reload
npm run dev
# In separate terminal, run worker
npm run dev:worker
```

## How to Run (production)

```bash
cd server
npm run build
npm start         # runs dist/server.js
npm run start:worker  # runs dist/worker.js in another process
```

## Troubleshooting Tips

- If embeddings are not created: verify worker process is running and Redis connection is healthy.
- If FastAPI calls fail: confirm FastAPI is reachable at `FASTAPI_URL` and `FASTAPI_TIMEOUT` is sufficient.
- If request IDs are missing: ensure `requestContextMiddleware` is mounted before routes in `src/app.ts`.

## Maintenance Notes

- `dist/` is a build artifact; regenerate with `npm run build`. Add `dist/` to `.gitignore` if it isn't already.
- For multi-instance deployments, consider moving stateful idempotency from endpoint-only checks to a shared lock mechanism (Redis lock or DB row) to avoid race conditions when concurrent workers process the same `post_id`.

## Contact / Maintainers

- StudyFAST backend team

---

_Last updated: May 13, 2026_
