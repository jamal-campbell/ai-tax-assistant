"""Main FastAPI application."""
import logging
import os
from pathlib import Path
from contextlib import asynccontextmanager
from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from .routes import health, chat, documents
from .services.document_processor import get_document_processor
from .config import get_settings

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
settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_cors_origins(),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(health.router)
app.include_router(chat.router)
app.include_router(documents.router)


# Serve static frontend in production
STATIC_DIR = Path(__file__).parent.parent.parent.parent / "static"
if STATIC_DIR.exists():
    # Serve static assets
    app.mount("/assets", StaticFiles(directory=STATIC_DIR / "assets"), name="assets")

    @app.get("/{full_path:path}")
    async def serve_frontend(request: Request, full_path: str):
        """Serve frontend for all non-API routes."""
        # Don't intercept API routes
        if full_path.startswith("api"):
            return {"detail": "Not found"}

        # Try to serve the exact file
        file_path = STATIC_DIR / full_path
        if file_path.is_file():
            return FileResponse(file_path)

        # Fallback to index.html for SPA routing
        return FileResponse(STATIC_DIR / "index.html")
else:
    @app.get("/")
    async def root():
        """Root endpoint with API info (dev mode)."""
        return {
            "name": "Tax RAG System",
            "version": "2.0.0",
            "docs": "/api/docs",
            "health": "/api/health"
        }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
