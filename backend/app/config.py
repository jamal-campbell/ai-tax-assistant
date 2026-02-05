"""Configuration management using Pydantic Settings."""
import os
from functools import lru_cache
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings loaded from environment variables."""

    # API Keys
    anthropic_api_key: str
    qdrant_url: str
    qdrant_api_key: str | None = None
    redis_url: str

    # Application settings
    collection_name: str = "tax_documents"
    embedding_model: str = "all-MiniLM-L6-v2"
    llm_model: str = "claude-sonnet-4-20250514"

    # Paths
    irs_docs_dir: str = os.path.join(os.path.dirname(__file__), "..", "..", "irs_docs")
    sample_docs_dir: str = os.path.join(os.path.dirname(__file__), "..", "..", "sample_docs")
    uploads_dir: str = os.path.join(os.path.dirname(__file__), "..", "..", "uploads")

    # Chunking settings
    chunk_size: int = 1000
    chunk_overlap: int = 200

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


@lru_cache()
def get_settings() -> Settings:
    """Get cached settings instance."""
    return Settings()
