"""
FastAPI app for creating embeddings from posts.
Uses its own Pinecone index and ChatPipeline instance.
"""
import sys
import asyncio

# Ensure Windows uses the ProactorEventLoop so subprocesses (Playwright) work.
# This must run before any event loop is created or any asyncio subprocess calls.
if sys.platform.startswith("win"):
    try:
        asyncio.set_event_loop_policy(asyncio.WindowsProactorEventLoopPolicy())
    except Exception:
        pass
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from chat_pipeline import ChatPipeline
from conversation_rag import ConversationRAG

# Initialize FastAPI app
app = FastAPI(
    title="StudyFAST Embeddings API",
    description="Create embeddings for posts and store in Pinecone",
    version="1.0.0"
)

# Request/Response models
class EmbeddingRequest(BaseModel):
    """Request model for creating embeddings."""
    post_id: str
    chat_link: str


class EmbeddingResponse(BaseModel):
    """Response model for embedding creation."""
    success: bool
    post_id: str
    message: str
    vectors_created: int
    chunks_created: int


class SearchRequest(BaseModel):
    """Request model for semantic search."""
    question: str
    top_k: int = 5


class SearchResult(BaseModel):
    """Single search result."""
    post_id: str
    score: float
    best_chunk_index: int
    relevant_text: str


class SearchResponse(BaseModel):
    """Response model for semantic search."""
    success: bool
    question: str
    results: list[SearchResult]
    total_results: int


class SummarizeRequest(BaseModel):
    post_id: str
    max_tokens: int = 600


class SummarizeResponse(BaseModel):
    success: bool
    post_id: str
    summary: str


class QuizRequest(BaseModel):
    post_id: str
    num_questions: int = 10
    max_tokens: int = 600


class QuizResponse(BaseModel):
    success: bool
    post_id: str
    quiz: dict
    chunks_used: int


class ConversationRagRequest(BaseModel):
    post_id: str
    question: str
    top_k: int = 5
    max_tokens: int = 600


class ConversationRagResponse(BaseModel):
    success: bool
    post_id: str
    question: str
    answer: str
    chunks_used: int


# Initialize pipeline and RAG service globally with the posts index
pipeline = None
rag_service = None
POST_EMBEDDINGS_INDEX = "post-embeddings"  # Separate index for posts


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
async def create_embeddings(request: EmbeddingRequest):
    """
    Create embeddings for a post from a ChatGPT conversation link.
    Stores embeddings in own Pinecone index (post-embeddings).
    
    Args:
        request: EmbeddingRequest with post_id and chat_link
        
    Returns:
        EmbeddingResponse with creation status and vector count
    """
    global pipeline
    
    if not pipeline:
        raise HTTPException(
            status_code=500,
            detail="Pipeline not initialized. Try again or restart the server."
        )
    
    post_id = request.post_id
    chat_link = request.chat_link
    
    try:
        print(f"\n{'='*80}")
        print(f"📝 Creating embeddings for Post ID: {post_id}")
        print(f"🔗 Chat Link: {chat_link}")
        print(f"📊 Storing in Pinecone Index: {POST_EMBEDDINGS_INDEX}")
        print(f"{'='*80}\n")
        
        # Extract chat from link using ChatPipeline
        print("Step 1: Extracting chat from ChatGPT link...")
        chat_text = await pipeline.extract_chat(chat_link)
        
        # Create embeddings using ChatPipeline
        print("\nStep 2: Creating embeddings...")
        embedding_records = pipeline.create_embeddings(
            text=chat_text,
            chat_id=post_id  # Use post_id as identifier
        )
        
        chunks_count = len(embedding_records)
        
        # Store embeddings in own Pinecone index using ChatPipeline
        print("\nStep 3: Storing in Pinecone...")
        pipeline.store_embeddings(embedding_records)
        
        print(f"\n{'='*80}")
        print(f"✓ SUCCESS: Created {chunks_count} embeddings for post {post_id}")
        print(f"  Index: {POST_EMBEDDINGS_INDEX}")
        print(f"  Chunks: {chunks_count}")
        print(f"{'='*80}\n")
        
        return EmbeddingResponse(
            success=True,
            post_id=post_id,
            message=f"Successfully created embeddings from ChatGPT link",
            vectors_created=chunks_count,
            chunks_created=chunks_count
        )
        
    except Exception as e:
        print(f"\n✗ ERROR: Failed to create embeddings for post {post_id}")
        print(f"Error: {str(e)}\n")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to create embeddings: {str(e)}"
        )


@app.get("/api/status/{post_id}")
async def get_embedding_status(post_id: str):
    """
    Get the embedding status for a specific post.
    (Can check if embeddings exist in the post-embeddings index)
    """
    global rag_service
    if not rag_service:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")

    try:
        exists = rag_service.has_embeddings(post_id)
        return {
            "post_id": post_id,
            "index": POST_EMBEDDINGS_INDEX,
            "exists": exists,
            "message": "Embeddings found in Pinecone" if exists else "No embeddings found for this post_id",
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to check embedding status: {e}")


@app.post("/api/rag/search", response_model=SearchResponse)
async def semantic_search(request: SearchRequest):
    """Delegate semantic search scoring to `semantic_search.weighted_search`.

    The heavy scoring logic lives in `semantic_search.py`; this endpoint
    invokes it and adapts the results into the API response model.
    """
    global rag_service
    if not rag_service:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")

    question = request.question
    top_k = request.top_k
    if not question.strip():
        raise HTTPException(status_code=400, detail="Question cannot be empty")

    try:
        print(f"→ Delegating search to ConversationRAG.semantic_search (top_k={top_k})")
        raw_results = rag_service.semantic_search(question, top_k=top_k)

        if not raw_results:
            return SearchResponse(success=True, question=question, results=[], total_results=0)

        api_results = []
        for r in raw_results:
            api_results.append(SearchResult(
                post_id=r["post_id"],
                score=float(r["weighted_score"]),
                best_chunk_index=int(r.get("best_chunk_index", 0)),
                relevant_text=r.get("relevant_text", "")
            ))

        return SearchResponse(success=True, question=question, results=api_results, total_results=len(api_results))

    except Exception as e:
        print(f"Search endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Search failed: {e}")


@app.post("/api/rag/summary", response_model=SummarizeResponse)
async def summarize_post_endpoint(request: SummarizeRequest):
    """Summarize a post by `post_id`: reconstructs chat from Pinecone and calls Groq."""
    global rag_service
    if not rag_service:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")

    post_id = request.post_id
    max_tokens = request.max_tokens
    if not post_id.strip():
        raise HTTPException(status_code=400, detail="post_id cannot be empty")

    try:
        print(f"→ Summarizing post_id={post_id} with max_tokens={max_tokens}")
        summary_text = await asyncio.to_thread(rag_service.summarize_post, post_id, max_tokens)
        return SummarizeResponse(success=True, post_id=post_id, summary=summary_text)
    except Exception as e:
        print(f"Summarize endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Summarization failed: {e}")


@app.post("/api/rag/quiz", response_model=QuizResponse)
async def generate_quiz_endpoint(request: QuizRequest):
    """Generate quiz questions from a stored chat conversation."""
    global rag_service
    if not rag_service:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")

    post_id = request.post_id
    num_questions = request.num_questions
    max_tokens = request.max_tokens

    if not post_id.strip():
        raise HTTPException(status_code=400, detail="post_id cannot be empty")
    if num_questions <= 0:
        raise HTTPException(status_code=400, detail="num_questions must be greater than zero")

    try:
        print(f"→ Generating quiz for post_id={post_id} with num_questions={num_questions}")
        quiz_result = await asyncio.to_thread(rag_service.generate_quiz, post_id, num_questions, max_tokens)
        return QuizResponse(
            success=True,
            post_id=post_id,
            quiz=quiz_result["quiz"],
            chunks_used=quiz_result["chunks_used"],
        )
    except Exception as e:
        print(f"Quiz endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Quiz generation failed: {e}")


@app.post("/api/rag/answer", response_model=ConversationRagResponse)
async def conversation_rag_endpoint(request: ConversationRagRequest):
    """Answer a question using similarity-ranked chunks from a single post."""
    global rag_service
    if not rag_service:
        raise HTTPException(status_code=500, detail="Pipeline not initialized")

    post_id = request.post_id
    question = request.question
    top_k = request.top_k
    max_tokens = request.max_tokens

    if not post_id.strip():
        raise HTTPException(status_code=400, detail="post_id cannot be empty")
    if not question.strip():
        raise HTTPException(status_code=400, detail="question cannot be empty")
    if top_k <= 0:
        raise HTTPException(status_code=400, detail="top_k must be greater than zero")

    try:
        print(f"→ Conversation RAG for post_id={post_id}, top_k={top_k}, question={question[:80]!r}")
        rag_result = await asyncio.to_thread(rag_service.conversation_rag_answer, post_id, question, top_k, max_tokens)
        return ConversationRagResponse(
            success=True,
            post_id=post_id,
            question=question,
            answer=rag_result["answer"],
            chunks_used=rag_result["chunks_used"],
        )
    except Exception as e:
        print(f"Conversation RAG endpoint error: {e}")
        raise HTTPException(status_code=500, detail=f"Conversation RAG failed: {e}")


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
