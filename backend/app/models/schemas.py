"""Pydantic models for API request/response schemas."""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime


# Chat schemas
class ChatRequest(BaseModel):
    """Request body for chat endpoint."""
    query: str = Field(..., min_length=1, description="User's question")
    session_id: Optional[str] = Field(None, description="Session ID for chat history")


class Source(BaseModel):
    """A source document chunk used in the response."""
    text: str
    source: str
    chunk_index: int
    score: float
    page: Optional[int] = None


class ChatResponse(BaseModel):
    """Response from chat endpoint (non-streaming)."""
    response: str
    sources: list[Source]
    session_id: str


class ChatMessage(BaseModel):
    """A single chat message in history."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: datetime
    sources: Optional[list[Source]] = None


class ChatHistory(BaseModel):
    """Chat history for a session."""
    session_id: str
    messages: list[ChatMessage]


# Document schemas
class DocumentInfo(BaseModel):
    """Information about an ingested document."""
    id: str
    filename: str
    source_type: str  # "irs" or "user"
    chunk_count: int
    uploaded_at: datetime


class DocumentList(BaseModel):
    """List of documents."""
    documents: list[DocumentInfo]
    total: int


class UploadResponse(BaseModel):
    """Response after document upload."""
    message: str
    document_id: str
    filename: str
    chunk_count: int


class IngestResponse(BaseModel):
    """Response after document ingestion."""
    message: str
    documents_processed: int
    total_chunks: int


# Health schemas
class HealthResponse(BaseModel):
    """Health check response."""
    status: str
    services: dict[str, bool]
