# StudyFAST Microservice Architecture - Implementation Handoff

## Overview

Re-implemented complete end-to-end microservice architecture with:
- **Express.js BFF** (Backend for Frontend) with async queue-based embedding creation
- **FastAPI AI Backend** with simplified endpoint-level idempotency
- **React Frontend** with request ID propagation for distributed tracing
- **Redis + BullMQ** for asynchronous embedding job processing
- **Pinecone** for vector embeddings and semantic search

---

## ✨ Key Changes from User Feedback

### Simplified Idempotency Approach
- **Original**: SQLite persistence + async locks in embedding service (complex state management)
- **User Requirement**: "Just check for postid if already chunks created then yes dont create a new duplicate one"
- **Implemented**: Endpoint-level idempotency check only
  - POST /api/embeddings checks if post_id already has embeddings in Pinecone
  - If exists → return `status: "already_exists"` (no duplicates created)
  - If not → create embeddings, store, return `status: "created"`
  - **No SQLite persistence, no async locks** — cleaner, simpler, single-instance friendly

---

## 📦 Architecture Components

### Express.js (BFF) - `server/`

#### Middleware Layer
- **`middleware/requestContext.ts`**: Extracts or generates `x-request-id` header for request tracing across services
- **`middleware/errorHandler.ts`**: Catches validation/DB/HTTP errors, normalizes responses with request ID
- **`types/express.d.ts`**: Ambient TypeScript declarations for `req.requestId` and `req.user`

#### Utilities
- **`utils/logger.ts`**: JSON logger (timestamp, level, message, requestId, metadata)
- **`utils/apiResponse.ts`**: `sendSuccess()` / `sendError()` helpers for consistent envelope responses

#### Queue Infrastructure
- **`queue/connection.ts`**: Redis connection pool (ioredis)
- **`queue/embeddingQueue.ts`**: BullMQ queue definition with retry policy (3 attempts, exponential backoff 2s)
  - Job interface: `{ postId, chatLink, requestId }`
- **`queue/embeddingWorker.ts`**: Worker process that:
  1. Calls `aiProxyService.createEmbeddings(postId, chatLink, requestId)` to FastAPI
  2. Updates Post model with `embeddingStatus` (queued/completed/failed)
  3. Logs job lifecycle events

#### AI Service Layer
- **`services/ai/fastApiClient.ts`**: Axios HTTP client to FastAPI with configurable timeout (15s default)
  - Handles ECONNABORTED as `FASTAPI_TIMEOUT` error
- **`services/ai/aiProxyService.ts`**: Wrapper for all FastAPI endpoints
  - `createEmbeddings()`, `answerQuery()`, `generateSummary()`, `generateQuiz()`, `searchEmbeddings()`
  - Custom error classes: `UpstreamTimeoutError`, `UpstreamServiceError`
  - All methods accept `requestId` and pass via `x-request-id` header

#### Validation & Routes
- **`validations/aiValidation.ts`**: Zod schemas for request validation
  - `enqueueEmbeddingSchema`: postId (string) + chatLink (URL)
  - `ragQuerySchema`: postId + query
  - `statusCheckSchema`: postId only
- **`routes/aiRoutes.ts`**: All AI endpoints
  - POST `/ai/embeddings/enqueue` → queue job asynchronously
  - GET `/ai/embeddings/:postId/status` → check post embedding status
  - POST `/ai/answer`, `/ai/summary`, `/ai/quiz`, `/ai/search` → RAG proxies

#### Controllers
- **`controllers/aiController.ts`**: Implements all AI endpoints
  - `enqueueEmbedding()`: Validates payload, enqueues job, updates Post
  - `checkEmbeddingStatus()`: Retrieves Post.embeddingStatus
  - `answerQuery()`, `generateSummary()`, `generateQuiz()`, `searchEmbeddings()`: Proxy to FastAPI with error handling
- **`controllers/postController.ts`** (Updated):
  - `createPost()` now enqueues embedding job if chatLink provided
  - Sets `embeddingStatus: 'queued'`, `embeddingJobId`, `embeddingUpdatedAt`

#### Models
- **`models/Post.ts`** (Updated):
  - New fields: `embeddingStatus` (enum: pending/queued/completed/failed)
  - `embeddingJobId` (references BullMQ job ID)
  - `embeddingError` (error message if failed)
  - `embeddingUpdatedAt` (timestamp of last status change)

#### Entry Points
- **`src/server.ts`**: Main server (existing, unchanged)
- **`src/worker.ts`**: NEW - Worker process entry point
  - Connects to Redis
  - Starts BullMQ worker for embedding jobs
  - Handles SIGTERM/SIGINT graceful shutdown

#### Dependencies Added
```json
{
  "axios": "^1.7.7",
  "bullmq": "^5.8.3",
  "ioredis": "^5.4.1",
  "uuid": "^10.0.0"
}
```

#### Scripts Added
```json
{
  "dev:worker": "ts-node-dev --respawn --transpile-only src/worker.ts",
  "build": "tsc",
  "start": "node dist/server.js",
  "start:worker": "node dist/worker.js"
}
```

---

### FastAPI (AI Backend) - `ai_backend/`

#### App Configuration (`app.py`)
- **RequestContextMiddleware**: Extracts `x-request-id` header from upstream requests, attaches to FastAPI request.state
- **Global Exception Handler**: Catches all exceptions, normalizes to `ApiErrorResponse` with requestId
- **Pipeline Initialization**: Loads ChatPipeline + ConversationRAG on startup

#### Endpoints

##### 1. POST `/api/embeddings` (Main Idempotency Logic)
```python
# SIMPLIFIED IDEMPOTENCY CHECK ONLY (no SQLite, no locks)
1. Check if rag_service.has_embeddings(post_id)  # Query Pinecone
2. If yes → return EmbeddingResponse(status="already_exists", ...)
3. If no → extract chat, create embeddings, store, return status="created"
```
- Request: `{ post_id, chat_link }`
- Response: `{ success, status, message, post_id, vectors_created, chunks_created, index, request_id }`

##### 2. GET `/api/embeddings/{post_id}/status`
- Check if embeddings exist for post_id in Pinecone
- Response: `{ success, post_id, index, exists, message, request_id }`

##### 3. POST `/api/answer`
- Question answering via RAG
- Request: `{ post_id, query }`
- Response: `{ success, message, answer, request_id }`

##### 4. POST `/api/summary`
- Generate summary from post embeddings
- Request: `{ post_id }`
- Response: `{ success, message, summary, request_id }`

##### 5. POST `/api/quiz`
- Generate quiz questions
- Request: `{ post_id }`
- Response: `{ success, message, quiz: [...], request_id }`

##### 6. POST `/api/search`
- Semantic search over post embeddings
- Request: `{ post_id, query }`
- Response: `{ success, message, results: [...], request_id }`

#### Schemas (`schemas/api_models.py`)
- `EmbeddingRequest`, `EmbeddingResponse` with status field
- `SearchRequest`, `SearchResult`, `SearchResponse`
- `QueryRequest`, `QueryResponse`
- `SummaryResponse`, `QuizResponse`
- `ApiErrorResponse` for normalized error handling

#### Removed Files (No SQLite/Locks Needed)
- ❌ `repositories/embedding_status_repository.py` — **NOT CREATED**
- ❌ Complex `services/embedding_service.py` with async locks — **SIMPLIFIED**

---

### React Frontend - `client/`

#### Request ID Propagation (`src/api.ts`)
- **`getOrCreateRequestId()`**: Generates UUID using `crypto.randomUUID()` (fallback for older browsers)
- **Request Interceptor**: Adds `x-request-id` header to every request
  - Also attaches JWT auth token from Redux
- **Response Interceptor**: Unwraps envelope (extracts `data` from `{ success, data, requestId }`)

---

## 🔄 Request Flow

### Scenario: User Creates Post with Chat Link

```
1. React Frontend (POST /posts)
   ↓ [includes x-request-id: UUID]
   
2. Express BFF
   ├─ requestContextMiddleware
   │  └─ Extracts/validates x-request-id, attaches to req.requestId
   ├─ postController.createPost()
   │  ├─ Create post in MongoDB
   │  ├─ Enqueue job in BullMQ
   │  │  └─ Passes requestId to job
   │  └─ Return 201 with post data
   └─ Response header: x-request-id (echoed back)
   ↑
3. React Frontend
   └─ Display success, show post

4. [Asynchronous] BullMQ Worker Process
   ├─ Dequeue job { postId, chatLink, requestId }
   ├─ Call FastAPI POST /api/embeddings
   │  └─ Includes header x-request-id
   ├─ FastAPI checks Pinecone for existing embeddings
   │  ├─ If exists → return already_exists
   │  └─ If not → create, store, return created
   ├─ Update Post.embeddingStatus in MongoDB
   └─ Log job completion with requestId for tracing
```

### Request ID Tracing Chain
```
React Client
  x-request-id: req-12345...
    ↓
Express BFF
  req.requestId = "req-12345..."
  Logs: { requestId: "req-12345...", message: "...", metadata }
  Response header: x-request-id: "req-12345..."
    ↓
BullMQ Job Data
  { jobId: job.id, requestId: "req-12345...", postId: ... }
    ↓
FastAPI Backend
  x-request-id: "req-12345..."
  request.state.request_id = "req-12345..."
  Response: { ..., request_id: "req-12345..." }
```
**→ Single requestId visible across all services for debugging & tracing**

---

## 🚀 Running the Application

### Prerequisites
- MongoDB (local or Atlas URI)
- Redis (local or cloud)
- FastAPI backend running on localhost:8000
- Pinecone API key
- OpenAI API key (for embeddings)
- Groq API key (for RAG responses)

### Setup

#### 1. Install Dependencies

**Server (Express BFF)**
```bash
cd server
npm.cmd install  # Windows
npm install       # Mac/Linux
```

**Frontend (React)**
```bash
cd client
npm.cmd install  # Windows
npm install       # Mac/Linux
```

#### 2. Configure Environment Variables

**Create `.env` files from `.env.example`:**

```bash
# server/.env
PORT=5000
NODE_ENV=development
MONGODB_URI=mongodb+srv://...
REDIS_HOST=localhost
REDIS_PORT=6379
FASTAPI_URL=http://localhost:8000
FASTAPI_TIMEOUT=15000
JWT_SECRET=your_secret
CORS_ORIGIN=http://localhost:5173

# ai_backend/.env
FASTAPI_PORT=8000
PINECONE_API_KEY=...
OPENAI_API_KEY=...
GROQ_API_KEY=...

# client/.env
VITE_API_URL=http://localhost:5000/
```

#### 3. Start Services (Terminal 1, 2, 3)

**Terminal 1: Express BFF**
```bash
cd server
npm run dev
# Starts on http://localhost:5000
```

**Terminal 2: BullMQ Worker**
```bash
cd server
npm run dev:worker
# Connects to Redis, waits for embedding jobs
```

**Terminal 3: FastAPI Backend**
```bash
cd ai_backend
python -m uvicorn app:app --host localhost --port 8000 --reload
# Starts on http://localhost:8000
```

**Terminal 4: React Frontend**
```bash
cd client
npm run dev
# Starts on http://localhost:5173
```

---

## 📋 Testing Checklist

### Manual Testing Flow

- [ ] **Create Post**
  - POST `/posts` with title, description, chatLink
  - Verify: Post created, BullMQ job enqueued, embeddingStatus = "queued"

- [ ] **Check Embedding Status**
  - GET `/ai/embeddings/{postId}/status`
  - Verify: Returns current status (queued/completed/failed)

- [ ] **Verify Worker Processing**
  - Check server worker terminal logs
  - Watch: "Processing embedding job..." → "Checking if embeddings exist..." → "Storing in Pinecone..."
  - Verify Post.embeddingStatus updates to "completed"

- [ ] **Idempotency Test**
  - Enqueue same postId twice
  - First: Creates embeddings (status: "created")
  - Second: Returns already_exists (status: "already_exists"), no duplicates
  - Verify Pinecone has only one copy

- [ ] **Request ID Propagation**
  - Check browser DevTools → Network → x-request-id headers
  - Verify same ID appears in:
    - React request headers
    - Express response headers
    - Server logs (JSON with requestId field)
    - FastAPI logs (via middleware)

- [ ] **Error Handling**
  - FastAPI timeout (15s) → Express returns 504
  - Invalid chat link → FastAPI returns 500 → Express proxy returns 500
  - Validation error (missing postId) → Express returns 400

- [ ] **RAG Endpoints** (Proxy Testing)
  - POST `/ai/answer` → FastAPI /api/answer
  - POST `/ai/summary` → FastAPI /api/summary
  - POST `/ai/quiz` → FastAPI /api/quiz
  - POST `/ai/search` → FastAPI /api/search
  - Verify all return proper envelopes with requestId

---

## 🔧 Troubleshooting

### Issue: "BullMQ job not processing"
- Check Redis connection: `redis-cli ping`
- Verify worker process is running: `npm run dev:worker`
- Check Redis host/port in `queue/connection.ts`

### Issue: "FastAPI connection refused"
- Verify FastAPI running: `curl http://localhost:8000/health`
- Check `FASTAPI_URL` in Express .env
- Check Express logs for `UpstreamServiceError`

### Issue: "Embeddings not being created"
- Check worker terminal for errors
- Verify Pinecone API key valid
- Check ChatPipeline logs in FastAPI terminal
- Verify chat link is valid (can extract content)

### Issue: "Request ID not appearing in logs"
- Verify `requestContextMiddleware` is mounted in `app.ts`
- Check that it's added **before** route handlers
- Verify `logWithRequest()` is being used, not `logger.info()`

### Issue: "Build errors in TypeScript"
- Pre-existing auth middleware type issues (not related to new code)
- Queue, validation, AI controller files compile cleanly
- Errors in routes/authRoutes due to IUser type mismatch (pre-existing)

---

## 📊 Performance & Scaling Notes

### Single-Instance (Current)
- ✅ BullMQ + Redis for async jobs
- ✅ Idempotency: Pinecone lookup (fast, no state persistence)
- ✅ Worker can be scaled (multiple worker processes)

### Multi-Instance Future (if needed)
- Consider: Shared Redis cluster for queue
- Consider: Distributed locking if multiple workers update same post
- Current Pinecone check is already distributed-safe (read-only query)

---

## 📝 Notes

- **No SQLite**: Simplified approach as requested—just Pinecone lookup
- **No Async Locks**: Single-instance focus, clean endpoint logic
- **Request ID**: Full tracing chain from React → Express → FastAPI
- **Error Handling**: Normalized envelopes with requestId for debugging
- **Queue**: 3 retries with exponential backoff (2s, 4s, 8s)
- **Timeout**: 15s default for FastAPI calls, configurable via env

---

## 🎯 Next Steps

1. Copy `.env.example` → `.env` for all three services
2. Populate environment variables (API keys, DB URIs)
3. Run all four services in separate terminals
4. Test manual flow per checklist above
5. Deploy: Build TypeScript (`npm run build`), run dist/ files
6. Monitor: Check logs with requestId for distributed tracing

