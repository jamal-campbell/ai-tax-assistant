"""Embedding service using SentenceTransformers."""
from functools import lru_cache
from sentence_transformers import SentenceTransformer
from ..config import get_settings


class EmbeddingService:
    """Service for generating text embeddings."""

    def __init__(self, model_name: str | None = None):
        settings = get_settings()
        self.model_name = model_name or settings.embedding_model
        self._model: SentenceTransformer | None = None

    @property
    def model(self) -> SentenceTransformer:
        """Lazy load the embedding model."""
        if self._model is None:
            self._model = SentenceTransformer(self.model_name)
        return self._model

    def embed(self, text: str) -> list[float]:
        """Generate embedding for a single text."""
        return self.model.encode(text).tolist()

    def embed_batch(self, texts: list[str]) -> list[list[float]]:
        """Generate embeddings for multiple texts."""
        return self.model.encode(texts).tolist()

    def get_dimension(self) -> int:
        """Get the embedding dimension."""
        return self.model.get_sentence_embedding_dimension()


@lru_cache()
def get_embedding_service() -> EmbeddingService:
    """Get cached embedding service instance."""
    return EmbeddingService()
