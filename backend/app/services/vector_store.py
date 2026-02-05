"""Vector store service using Qdrant."""
import uuid
import logging
from functools import lru_cache
from qdrant_client import QdrantClient, models
from qdrant_client.http.exceptions import UnexpectedResponse
from ..config import get_settings
from .embeddings import get_embedding_service

logger = logging.getLogger(__name__)


class VectorStoreService:
    """Service for managing vectors in Qdrant."""

    def __init__(self):
        settings = get_settings()
        self.client = QdrantClient(
            url=settings.qdrant_url,
            api_key=settings.qdrant_api_key,
            timeout=60  # 60 second timeout
        )
        self.collection_name = settings.collection_name
        self.embedding_service = get_embedding_service()

    def ensure_collection(self) -> bool:
        """Ensure the collection exists, create if not."""
        try:
            self.client.get_collection(self.collection_name)
            logger.info(f"Collection '{self.collection_name}' exists")
            return True
        except UnexpectedResponse:
            logger.info(f"Creating collection '{self.collection_name}'")
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=models.VectorParams(
                    size=self.embedding_service.get_dimension(),
                    distance=models.Distance.COSINE
                )
            )
            return True

    def add_documents(
        self,
        texts: list[str],
        metadata: list[dict],
        doc_id: str | None = None
    ) -> int:
        """Add documents to the vector store."""
        self.ensure_collection()

        # Generate embeddings
        embeddings = self.embedding_service.embed_batch(texts)

        # Create points
        points = []
        for i, (text, embedding, meta) in enumerate(zip(texts, embeddings, metadata)):
            point_id = str(uuid.uuid4())
            payload = {
                "text": text,
                "doc_id": doc_id or str(uuid.uuid4()),
                **meta
            }
            points.append(
                models.PointStruct(
                    id=point_id,
                    vector=embedding,
                    payload=payload
                )
            )

        # Upsert in smaller batches to avoid timeout
        batch_size = 20
        for i in range(0, len(points), batch_size):
            batch = points[i:i + batch_size]
            try:
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=batch,
                    wait=True
                )
            except Exception as e:
                logger.warning(f"Batch {i//batch_size + 1} failed, retrying: {e}")
                # Retry once
                self.client.upsert(
                    collection_name=self.collection_name,
                    points=batch,
                    wait=True
                )

        logger.info(f"Added {len(points)} points to collection")
        return len(points)

    def search(
        self,
        query: str,
        limit: int = 5,
        score_threshold: float = 0.3
    ) -> list[dict]:
        """Search for similar documents."""
        self.ensure_collection()

        query_embedding = self.embedding_service.embed(query)

        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=query_embedding,
            limit=limit,
            score_threshold=score_threshold,
            with_payload=True
        )

        return [
            {
                "text": r.payload.get("text", ""),
                "source": r.payload.get("source", "unknown"),
                "chunk_index": r.payload.get("chunk_index", 0),
                "page": r.payload.get("page"),
                "score": r.score
            }
            for r in results
        ]

    def delete_by_doc_id(self, doc_id: str) -> bool:
        """Delete all points for a document."""
        try:
            self.client.delete(
                collection_name=self.collection_name,
                points_selector=models.FilterSelector(
                    filter=models.Filter(
                        must=[
                            models.FieldCondition(
                                key="doc_id",
                                match=models.MatchValue(value=doc_id)
                            )
                        ]
                    )
                )
            )
            logger.info(f"Deleted points for doc_id: {doc_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to delete doc_id {doc_id}: {e}")
            return False

    def get_collection_stats(self) -> dict:
        """Get collection statistics."""
        try:
            info = self.client.get_collection(self.collection_name)
            return {
                "points_count": info.points_count,
                "status": info.status.name
            }
        except Exception:
            return {"points_count": 0, "status": "not_found"}

    def health_check(self) -> bool:
        """Check if Qdrant is accessible."""
        try:
            self.client.get_collections()
            return True
        except Exception:
            return False


@lru_cache()
def get_vector_store() -> VectorStoreService:
    """Get cached vector store service instance."""
    return VectorStoreService()
