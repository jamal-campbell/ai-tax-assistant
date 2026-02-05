"""Document processing service for PDF ingestion."""
import os
import uuid
import json
import logging
from datetime import datetime
from functools import lru_cache
import pypdf
from ..config import get_settings
from .vector_store import get_vector_store

logger = logging.getLogger(__name__)


class DocumentProcessor:
    """Service for processing and ingesting PDF documents."""

    def __init__(self):
        settings = get_settings()
        self.chunk_size = settings.chunk_size
        self.chunk_overlap = settings.chunk_overlap
        self.irs_docs_dir = os.path.abspath(settings.irs_docs_dir)
        self.sample_docs_dir = os.path.abspath(settings.sample_docs_dir)
        self.uploads_dir = os.path.abspath(settings.uploads_dir)
        self.vector_store = get_vector_store()

        # In-memory document registry (reconstructed from Qdrant on startup)
        self._documents: dict[str, dict] = {}
        self._initialized = False

    def _init_from_qdrant(self) -> None:
        """Initialize document list from Qdrant if not already done."""
        if self._initialized:
            return

        try:
            # Query Qdrant to get unique sources
            stats = self.vector_store.get_collection_stats()
            if stats.get("points_count", 0) > 0:
                # Scroll through points to get unique doc_ids and sources
                # This is a simplified reconstruction
                result = self.vector_store.client.scroll(
                    collection_name=self.vector_store.collection_name,
                    limit=100,
                    with_payload=True,
                    with_vectors=False
                )

                docs_info = {}
                for point in result[0]:
                    payload = point.payload
                    doc_id = payload.get("doc_id", "unknown")
                    source = payload.get("source", "unknown")
                    source_type = payload.get("source_type", "irs")

                    if doc_id not in docs_info:
                        docs_info[doc_id] = {
                            "id": doc_id,
                            "filename": source,
                            "source_type": source_type,
                            "chunk_count": 0,
                            "uploaded_at": datetime.now().isoformat()
                        }
                    docs_info[doc_id]["chunk_count"] += 1

                self._documents = docs_info
                logger.info(f"Reconstructed {len(docs_info)} documents from Qdrant")
        except Exception as e:
            logger.warning(f"Failed to init from Qdrant: {e}")

        self._initialized = True

    def _extract_text_from_pdf(self, filepath: str) -> list[tuple[str, int]]:
        """Extract text from PDF with page numbers."""
        pages = []
        try:
            reader = pypdf.PdfReader(filepath)
            for i, page in enumerate(reader.pages):
                text = page.extract_text()
                if text and text.strip():
                    pages.append((text.strip(), i + 1))
        except Exception as e:
            logger.error(f"Failed to read PDF {filepath}: {e}")
        return pages

    def _extract_text_from_txt(self, filepath: str) -> list[tuple[str, int]]:
        """Extract text from a text file, treating sections as pages."""
        pages = []
        try:
            with open(filepath, 'r', encoding='utf-8') as f:
                content = f.read()

            # Split by double newlines to create logical sections
            sections = content.split('\n\n')
            current_section = ""
            section_num = 1

            for section in sections:
                section = section.strip()
                if not section:
                    continue

                # Accumulate sections until we have enough content
                if current_section:
                    current_section += "\n\n" + section
                else:
                    current_section = section

                # If section is large enough, save it
                if len(current_section) > 500:
                    pages.append((current_section, section_num))
                    section_num += 1
                    current_section = ""

            # Don't forget remaining content
            if current_section:
                pages.append((current_section, section_num))

        except Exception as e:
            logger.error(f"Failed to read text file {filepath}: {e}")
        return pages

    def _chunk_text(
        self,
        text: str,
        page_num: int,
        source: str
    ) -> list[dict]:
        """Split text into overlapping chunks with metadata."""
        chunks = []

        # Split into sentences (simple approach)
        sentences = text.replace("\n", " ").split(". ")

        current_chunk = ""
        chunk_index = 0

        for sentence in sentences:
            sentence = sentence.strip()
            if not sentence:
                continue

            # Add sentence to current chunk
            test_chunk = current_chunk + (" " if current_chunk else "") + sentence + "."

            if len(test_chunk) <= self.chunk_size:
                current_chunk = test_chunk
            else:
                # Save current chunk if not empty
                if current_chunk:
                    chunks.append({
                        "text": current_chunk,
                        "source": source,
                        "page": page_num,
                        "chunk_index": chunk_index
                    })
                    chunk_index += 1

                    # Start new chunk with overlap
                    words = current_chunk.split()
                    overlap_words = words[-self.chunk_overlap // 5:] if len(words) > self.chunk_overlap // 5 else []
                    current_chunk = " ".join(overlap_words) + " " + sentence + "."
                else:
                    current_chunk = sentence + "."

        # Don't forget the last chunk
        if current_chunk:
            chunks.append({
                "text": current_chunk,
                "source": source,
                "page": page_num,
                "chunk_index": chunk_index
            })

        return chunks

    def process_pdf(
        self,
        filepath: str,
        source_type: str = "user"
    ) -> dict:
        """Process a single PDF file."""
        filename = os.path.basename(filepath)
        doc_id = str(uuid.uuid4())

        logger.info(f"Processing PDF: {filename}")

        # Extract text from PDF
        pages = self._extract_text_from_pdf(filepath)
        if not pages:
            raise ValueError(f"No text could be extracted from {filename}")

        # Chunk all pages
        all_chunks = []
        for text, page_num in pages:
            chunks = self._chunk_text(text, page_num, filename)
            all_chunks.extend(chunks)

        if not all_chunks:
            raise ValueError(f"No chunks created from {filename}")

        logger.info(f"Created {len(all_chunks)} chunks from {filename}")

        # Extract texts and metadata
        texts = [c["text"] for c in all_chunks]
        metadata = [
            {
                "source": c["source"],
                "page": c["page"],
                "chunk_index": c["chunk_index"],
                "source_type": source_type
            }
            for c in all_chunks
        ]

        # Add to vector store
        self.vector_store.add_documents(texts, metadata, doc_id)

        # Register document
        doc_info = {
            "id": doc_id,
            "filename": filename,
            "source_type": source_type,
            "chunk_count": len(all_chunks),
            "uploaded_at": datetime.now().isoformat()
        }
        self._documents[doc_id] = doc_info
        self._initialized = True

        return doc_info

    def process_text_file(
        self,
        filepath: str,
        source_type: str = "irs"
    ) -> dict:
        """Process a single text file."""
        filename = os.path.basename(filepath)
        doc_id = str(uuid.uuid4())

        logger.info(f"Processing text file: {filename}")

        # Extract text from file
        pages = self._extract_text_from_txt(filepath)
        if not pages:
            raise ValueError(f"No text could be extracted from {filename}")

        # Chunk all pages
        all_chunks = []
        for text, page_num in pages:
            chunks = self._chunk_text(text, page_num, filename)
            all_chunks.extend(chunks)

        if not all_chunks:
            raise ValueError(f"No chunks created from {filename}")

        logger.info(f"Created {len(all_chunks)} chunks from {filename}")

        # Extract texts and metadata
        texts = [c["text"] for c in all_chunks]
        metadata = [
            {
                "source": c["source"],
                "page": c["page"],
                "chunk_index": c["chunk_index"],
                "source_type": source_type
            }
            for c in all_chunks
        ]

        # Add to vector store
        self.vector_store.add_documents(texts, metadata, doc_id)

        # Register document
        doc_info = {
            "id": doc_id,
            "filename": filename,
            "source_type": source_type,
            "chunk_count": len(all_chunks),
            "uploaded_at": datetime.now().isoformat()
        }
        self._documents[doc_id] = doc_info
        self._initialized = True

        return doc_info

    def ingest_sample_documents(self) -> dict:
        """Ingest sample documents from the sample_docs directory."""
        if not os.path.exists(self.sample_docs_dir):
            raise ValueError(f"Sample docs directory not found: {self.sample_docs_dir}")

        results = {
            "documents_processed": 0,
            "total_chunks": 0,
            "errors": []
        }

        for filename in os.listdir(self.sample_docs_dir):
            filepath = os.path.join(self.sample_docs_dir, filename)
            try:
                if filename.lower().endswith(".txt"):
                    doc_info = self.process_text_file(filepath, source_type="irs")
                    results["documents_processed"] += 1
                    results["total_chunks"] += doc_info["chunk_count"]
                elif filename.lower().endswith(".pdf"):
                    doc_info = self.process_pdf(filepath, source_type="irs")
                    results["documents_processed"] += 1
                    results["total_chunks"] += doc_info["chunk_count"]
            except Exception as e:
                logger.error(f"Failed to process {filename}: {e}")
                results["errors"].append({"file": filename, "error": str(e)})

        return results

    def ingest_irs_documents(self) -> dict:
        """Ingest all IRS documents from the irs_docs directory."""
        if not os.path.exists(self.irs_docs_dir):
            raise ValueError(f"IRS docs directory not found: {self.irs_docs_dir}")

        results = {
            "documents_processed": 0,
            "total_chunks": 0,
            "errors": []
        }

        for filename in os.listdir(self.irs_docs_dir):
            if filename.lower().endswith(".pdf"):
                filepath = os.path.join(self.irs_docs_dir, filename)
                try:
                    doc_info = self.process_pdf(filepath, source_type="irs")
                    results["documents_processed"] += 1
                    results["total_chunks"] += doc_info["chunk_count"]
                except Exception as e:
                    logger.error(f"Failed to process {filename}: {e}")
                    results["errors"].append({"file": filename, "error": str(e)})

        return results

    def get_documents(self) -> list[dict]:
        """Get list of all processed documents."""
        self._init_from_qdrant()
        return list(self._documents.values())

    def delete_document(self, doc_id: str) -> bool:
        """Delete a document and its vectors."""
        self._init_from_qdrant()
        if doc_id not in self._documents:
            return False

        # Delete from vector store
        self.vector_store.delete_by_doc_id(doc_id)

        # Remove from registry
        del self._documents[doc_id]
        return True

    def has_documents(self) -> bool:
        """Check if any documents are loaded."""
        self._init_from_qdrant()
        return len(self._documents) > 0


@lru_cache()
def get_document_processor() -> DocumentProcessor:
    """Get cached document processor instance."""
    return DocumentProcessor()
