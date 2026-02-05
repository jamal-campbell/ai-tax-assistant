"""Main FastAPI application."""
import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .routes import health, chat, documents
from .services.document_processor import get_document_processor
from .services.vector_store import get_vector_store

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup and shutdown events."""
    # Startup: Auto-ingest IRS documents if no documents in Redis
    logger.info("Starting Tax RAG System...")
    try:
        processor = get_document_processor()

        # Check if we have documents registered
        if not processor.has_documents():
            logger.info("No documents found in registry. Auto-ingesting sample tax documents...")
            result = processor.ingest_sample_documents()
            logger.info(f"Auto-ingested {result['documents_processed']} documents with {result['total_chunks']} chunks")
        else:
            docs = processor.get_documents()
            total_chunks = sum(d.get("chunk_count", 0) for d in docs)
            logger.info(f"Found {len(docs)} documents ({total_chunks} chunks) in registry")
    except Exception as e:
        logger.warning(f"Auto-ingestion skipped: {e}")
        import traceback
        traceback.print_exc()

    yield  # App runs here

    # Shutdown
    logger.info("Shutting down Tax RAG System...")

# Create FastAPI app
app = FastAPI(
    title="Tax RAG System",
    description="A Retrieval-Augmented Generation system for tax compliance questions using IRS publications.",
    version="2.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc",
    lifespan=lifespan
)

# Configure CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(documents.router)


@app.get("/")
async def root():
    """Root endpoint with API info."""
    return {
        "name": "Tax RAG System",
        "version": "2.0.0",
        "docs": "/api/docs",
        "health": "/api/health"
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
