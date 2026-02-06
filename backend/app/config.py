"""Configuration management using Pydantic Settings."""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    anthropic_api_key: str
    openai_api_key: str
    qdrant_url: str
    qdrant_api_key: str | None = None
    redis_url: str

    # Application settings
    collection_name: str = "tax_documents"
    embedding_model: str = "text-embedding-3-small"
    llm_model: str = "claude-sonnet-4-20250514"

    # CORS - comma-separated list of allowed origins
    cors_origins: str = "http://localhost:5173,http://localhost:3000,http://127.0.0.1:5173"

    # Paths
    irs_docs_dir: str = os.path.join(os.path.dirname(__file__), "..", "..", "irs_docs")
    sample_docs_dir: str = os.path.join(os.path.dirname(__file__), "..", "..", "sample_docs")
    uploads_dir: str = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")

    # Chunking settings
    chunk_size: int = 1000
    chunk_overlap: int = 200

    def get_cors_origins(self) -> list[str]:
        """Parse CORS origins from comma-separated string."""
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
