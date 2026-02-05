"""Document management endpoints."""
import os
import shutil
import logging
from fastapi import APIRouter, HTTPException, UploadFile, File
from ..models.schemas import DocumentList, DocumentInfo, UploadResponse, IngestResponse, DocumentContent, DocumentChunk
from ..services.vector_store import get_vector_store
from ..services.document_processor import get_document_processor
from ..config import get_settings

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/documents", tags=["Documents"])


@router.get("", response_model=DocumentList)
async def list_documents():
    """List all ingested documents."""
    processor = get_document_processor()
    documents = processor.get_documents()

    return DocumentList(
        documents=[DocumentInfo(**doc) for doc in documents],
        total=len(documents)
    )


@router.post("/upload", response_model=UploadResponse)
async def upload_document(file: UploadFile = File(...)):
    """Upload and process a PDF document."""
    if not file.filename or not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are allowed")

    settings = get_settings()
    uploads_dir = os.path.abspath(settings.uploads_dir)

    # Ensure uploads directory exists
    os.makedirs(uploads_dir, exist_ok=True)

    # Save uploaded file
    filepath = os.path.join(uploads_dir, file.filename)
    try:
        with open(filepath, "wb") as buffer:
            shutil.copyfileobj(file.file, buffer)
    except Exception as e:
        logger.error(f"Failed to save upload: {e}")
        raise HTTPException(status_code=500, detail="Failed to save file")

    # Process the document
    processor = get_document_processor()
    try:
        doc_info = processor.process_pdf(filepath, source_type="user")
        return UploadResponse(
            message="Document uploaded and processed successfully",
            document_id=doc_info["id"],
            filename=doc_info["filename"],
            chunk_count=doc_info["chunk_count"]
        )
    except Exception as e:
        logger.error(f"Failed to process upload: {e}")
        # Clean up the file
        if os.path.exists(filepath):
            os.remove(filepath)
        raise HTTPException(status_code=500, detail=f"Failed to process document: {str(e)}")


@router.post("/ingest", response_model=IngestResponse)
async def ingest_irs_documents():
    """Ingest all IRS documents from the irs_docs folder."""
    processor = get_document_processor()

    try:
        results = processor.ingest_irs_documents()

        if results["errors"]:
            logger.warning(f"Some documents failed: {results['errors']}")

        return IngestResponse(
            message=f"Processed {results['documents_processed']} documents",
            documents_processed=results["documents_processed"],
            total_chunks=results["total_chunks"]
        )
    except Exception as e:
        logger.error(f"Ingestion failed: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{doc_id}", response_model=DocumentContent)
async def get_document_content(doc_id: str):
    """Get the full content of a document."""
    processor = get_document_processor()
    vector_store = get_vector_store()

    # Check if document exists
    documents = processor.get_documents()
    doc_info = next((d for d in documents if d["id"] == doc_id), None)

    if not doc_info:
        raise HTTPException(status_code=404, detail="Document not found")

    # Get all chunks for this document
    chunks = vector_store.get_document_chunks(doc_id)

    return DocumentContent(
        id=doc_id,
        filename=doc_info["filename"],
        source_type=doc_info["source_type"],
        chunks=[DocumentChunk(**{k: v for k, v in c.items() if k != "source"}) for c in chunks],
        total_chunks=len(chunks)
    )


@router.delete("/{doc_id}")
async def delete_document(doc_id: str):
    """Delete a document and its vectors."""
    processor = get_document_processor()

    if not processor.delete_document(doc_id):
        raise HTTPException(status_code=404, detail="Document not found")

    return {"message": "Document deleted successfully"}
