from pydantic import BaseModel, Field
from typing import Optional, List, Any

class EmbeddingRequest(BaseModel):
    post_id: str = Field(..., description="The post ID for embeddings")
    chat_link: str = Field(..., description="The chat link URL")

class EmbeddingResponse(BaseModel):
    success: bool
    status: str = Field(..., description="'created' or 'already_exists'")
    message: str
    post_id: str
    vectors_created: int = 0
    chunks_created: int = 0
    index: str = "posts"
    request_id: Optional[str] = None

class SearchRequest(BaseModel):
    post_id: str = Field(..., description="The post ID for search")
    query: str = Field(..., description="Search query")

class SearchResult(BaseModel):
    text: str
    score: float

class SearchResponse(BaseModel):
    success: bool
    message: str
    results: List[SearchResult]
    request_id: Optional[str] = None

class QueryRequest(BaseModel):
    post_id: str = Field(..., description="The post ID for query")
    query: Optional[str] = None

class QueryResponse(BaseModel):
    success: bool
    message: str
    answer: str
    request_id: Optional[str] = None

class SummaryResponse(BaseModel):
    success: bool
    message: str
    summary: str
    request_id: Optional[str] = None

class QuizResponse(BaseModel):
    success: bool
    message: str
    quiz: List[Any]
    request_id: Optional[str] = None

class ApiErrorResponse(BaseModel):
    success: bool = False
    message: str
    error: str
    status_code: int
    request_id: Optional[str] = None
