"""
FastAPI app for creating embeddings from posts with simplified idempotency.
Uses Pinecone index and ChatPipeline instance.
"""
import sys
import asyncio
from typing import Optional
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

# Ensure Windows uses the ProactorEventLoop
if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass

from chat_pipeline import ChatPipeline
from conversation_rag import ConversationRAG
from schemas.api_models import (
    EmbeddingRequest,
    EmbeddingResponse,
    SearchRequest,
    SearchResponse,
    QueryRequest,
    QueryResponse,
    SummaryResponse,
    QuizResponse,
    ApiErrorResponse,
    SearchResult,
)

# Initialize FastAPI app
app = FastAPI(
    title="StudyFAST Embeddings API",
    description="Create embeddings for posts and store in Pinecone",
    version="1.0.0"
)

# Middleware for request context
class RequestContextMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        request_id = request.headers.get("x-request-id", "unknown")
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["x-request-id"] = request_id
        return response

app.add_middleware(RequestContextMiddleware)

# Exception handlers
@app.exception_handler(Exception)
async def global_exception_handler(request: Request, exc: Exception):
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "message": "Internal server error",
            "error": str(exc),
            "status_code": 500,
            "request_id": getattr(request.state, "request_id", None),
        },
    )


# Request/Response models (now imported from schemas)
# Initialize pipeline and RAG service globally
pipeline = None
rag_service = None
POST_EMBEDDINGS_INDEX = "post-embeddings"


@app.on_event("startup")
async def startup():
    """Initialize ChatPipeline on app startup with posts index."""
    global pipeline, rag_service
    print("\n🚀 Initializing ChatPipeline for Posts Embeddings...")
    pipeline = ChatPipeline(index_name=POST_EMBEDDINGS_INDEX)
    rag_service = ConversationRAG(pipeline)
    print(f"✓ ChatPipeline initialized with index: {POST_EMBEDDINGS_INDEX}\n")


@app.get("/health")
async def health_check():
    """Health check endpoint."""
    return {
        "status": "healthy",
        "service": "StudyFAST Embeddings API",
        "version": "1.0.0",
        "index": POST_EMBEDDINGS_INDEX
    }


@app.post("/api/embeddings", response_model=EmbeddingResponse)
async def create_embeddings(request_body: EmbeddingRequest, request: Request):
    """
    Create embeddings for a post with simplified idempotency.
    
    SIMPLIFIED IDEMPOTENCY:
    - Check if post_id already has embeddings in Pinecone
    - If yes, return already_exists (no duplicate creation)
    - If no, extract chat, create embeddings, store, and return created
    
    Args:
        request_body: EmbeddingRequest with post_id and chat_link
        request: FastAPI Request for request ID
        
    Returns:
        EmbeddingResponse with status (created or already_exists)
    """
    global pipeline, rag_service
    
    if not pipeline or not rag_service:
        raise HTTPException(
            status_code=500,
            detail="Pipeline not initialized"
        )
    
    post_id = request_body.post_id
    chat_link = request_body.chat_link
    request_id = getattr(request.state, "request_id", "unknown")
    
    try:
        print(f"\n{'='*80}")
        print(f"📝 Embeddings Request for Post ID: {post_id}")
        print(f"🔗 Chat Link: {chat_link}")
        print(f"📊 Pinecone Index: {POST_EMBEDDINGS_INDEX}")
        print(f"{'='*80}\n")
        
        # SIMPLIFIED IDEMPOTENCY: Check if embeddings already exist
        print("Step 1: Checking if embeddings already exist in Pinecone...")
        if rag_service.has_embeddings(post_id):
            print(f"✓ Embeddings already exist for post {post_id}")
            return EmbeddingResponse(
                success=True,
                post_id=post_id,
                status="already_exists",
                message="Embeddings already exist for this post_id",
                vectors_created=0,
                chunks_created=0,
                index=POST_EMBEDDINGS_INDEX,
                request_id=request_id,
            )
        
        # Create embeddings if not present
        print("Step 2: Extracting chat from ChatGPT link...")
        chat_text = await pipeline.extract_chat(chat_link)
        
        print("Step 3: Creating embeddings...")
        embedding_records = pipeline.create_embeddings(
            text=chat_text,
            chat_id=post_id
        )
        
        chunks_count = len(embedding_records)
        
        print("Step 4: Storing in Pinecone...")
        pipeline.store_embeddings(embedding_records)
        
        print(f"\n{'='*80}")
        print(f"✓ SUCCESS: Created {chunks_count} embeddings for post {post_id}")
        print(f"  Index: {POST_EMBEDDINGS_INDEX}")
        print(f"  Chunks: {chunks_count}")
        print(f"{'='*80}\n")
        
        return EmbeddingResponse(
            success=True,
            post_id=post_id,
            status="created",
            message="Embeddings created successfully",
            vectors_created=chunks_count,
            chunks_created=chunks_count,
            index=POST_EMBEDDINGS_INDEX,
            request_id=request_id,
        )
        
    except Exception as e:
        print(f"\n✗ ERROR: Failed to create embeddings for post {post_id}")
        print(f"Error: {str(e)}\n")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create embeddings: {str(e)}"
        )


@app.get("/api/embeddings/{post_id}/status")
async def check_embedding_status(post_id: str, request: Request):
    """Check if embeddings exist for a post."""
    global rag_service
    if not rag_service:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")

    request_id = getattr(request.state, "request_id", "unknown")
    try:
        exists = rag_service.has_embeddings(post_id)
        return {
            "success": True,
            "post_id": post_id,
            "index": POST_EMBEDDINGS_INDEX,
            "exists": exists,
            "message": "Embeddings found" if exists else "No embeddings found",
            "request_id": request_id,
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to check embedding status: {str(e)}"
        )


@app.post("/api/answer", response_model=QueryResponse)
async def answer_query(request_body: QueryRequest, request: Request):
    """Answer a question based on post embeddings."""
    global rag_service
    if not rag_service:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")

    post_id = request_body.post_id
    query = request_body.query or ""
    request_id = getattr(request.state, "request_id", "unknown")
    
    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        answer = rag_service.answer_question(post_id, query)
        return QueryResponse(
            success=True,
            message="Answer generated",
            answer=answer,
            request_id=request_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to answer query: {str(e)}"
        )


@app.post("/api/summary", response_model=SummaryResponse)
async def generate_summary(request_body: QueryRequest, request: Request):
    """Generate a summary for a post."""
    global rag_service
    if not rag_service:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")

    post_id = request_body.post_id
    request_id = getattr(request.state, "request_id", "unknown")

    try:
        summary = rag_service.generate_summary(post_id)
        return SummaryResponse(
            success=True,
            message="Summary generated",
            summary=summary,
            request_id=request_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate summary: {str(e)}"
        )


@app.post("/api/quiz", response_model=QuizResponse)
async def generate_quiz(request_body: QueryRequest, request: Request):
    """Generate a quiz for a post."""
    global rag_service
    if not rag_service:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")

    post_id = request_body.post_id
    request_id = getattr(request.state, "request_id", "unknown")

    try:
        quiz = rag_service.generate_quiz(post_id)
        return QuizResponse(
            success=True,
            message="Quiz generated",
            quiz=quiz if isinstance(quiz, list) else [quiz],
            request_id=request_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to generate quiz: {str(e)}"
        )


@app.post("/api/search", response_model=SearchResponse)
async def search_embeddings(request_body: SearchRequest, request: Request):
    """Search embeddings for a post."""
    global rag_service
    if not rag_service:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")

    post_id = request_body.post_id
    query = request_body.query
    request_id = getattr(request.state, "request_id", "unknown")

    if not query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty")

    try:
        results = rag_service.semantic_search(query, top_k=5)
        api_results = [
            SearchResult(
                text=r.get("relevant_text", ""),
                score=float(r.get("weighted_score", 0))
            )
            for r in results
        ]
        return SearchResponse(
            success=True,
            message="Search completed",
            results=api_results,
            request_id=request_id,
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to search: {str(e)}"
        )


if __name__ == "__main__":
    import uvicorn
    
    print("\n" + "="*80)
    print("🚀 Starting StudyFAST Embeddings API")
    print("="*80)
    print(f"\n📊 Pinecone Index: {POST_EMBEDDINGS_INDEX}")
    print("\n📍 Endpoints:")
    print("  GET  /health                    - Health check")
    print("  POST /api/embeddings            - Create embeddings from ChatGPT link")
    print("  GET  /api/status/{post_id}      - Check embedding status")
    print("  POST /api/rag/search            - Semantic search with question")
    print("  POST /api/rag/summary           - Generate a summary from a post")
    print("  POST /api/rag/quiz              - Generate quiz questions from a post")
    print("  POST /api/rag/answer            - Ask a question over a post via similarity")
    print("\n📖 API Docs: http://localhost:8000/docs")
    print("="*80 + "\n")
    # Use import string so `reload=True` works correctly when launched
    # i.e. uvicorn will import the module `app` and look up `app` inside it.
    uvicorn.run(
        "app:app",
        host="localhost",
        port=8000,
        reload=True,
        log_level="info"
    )
