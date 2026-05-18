"""Application settings loaded from environment variables."""

from __future__ import annotations

from enum import Enum

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class VectorDBProvider(str, Enum):
    WEAVIATE = "weaviate"
    PINECONE = "pinecone"
    QDRANT = "qdrant"
    MILVUS = "milvus"
    CHROMA = "chroma"


class LLMProviderType(str, Enum):
    LANGCHAIN_OPENAI = "langchain_openai"
    OPENAI = "openai"
    CLAUDE = "claude"
    OLLAMA = "ollama"
    GOOGLE = "google"
    GROQ = "groq"


class EmbeddingProviderType(str, Enum):
    SENTENCE_TRANSFORMERS = "sentence_transformers"
    OPENAI = "openai"
    HUGGINGFACE = "huggingface"


class ChunkingStrategyType(str, Enum):
    RECURSIVE = "recursive"
    SEMANTIC = "semantic"
    SLIDING_WINDOW = "sliding_window"


class IngestionStrategyType(str, Enum):
    SEPARATE = "separate"
    SHARED = "shared"


class Settings(BaseSettings):
    """Application settings with environment variable loading."""

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # --- Application ---
    app_name: str = "RAG Backend"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = "INFO"

    # --- Server ---
    host: str = "0.0.0.0"
    port: int = 8000



    # --- LLM Provider ---
    llm_provider: LLMProviderType = LLMProviderType.GROQ
    openai_api_key: str = ""
    openai_model: str = "gpt-4o"
    openai_temperature: float = 0.1
    openai_max_tokens: int = 2048

    # --- Google Gemini ---
    google_api_key: str = ""
    google_model: str = "gemini-2.5-flash"
    google_temperature: float = 0.1

    # --- Groq ---
    groq_api_key: str = ""
    groq_model: str = "openai/gpt-oss-120b"
    groq_temperature: float = 0.1
    groq_max_tokens: int = 2048

    # --- Embedding ---
    embedding_provider: EmbeddingProviderType = EmbeddingProviderType.SENTENCE_TRANSFORMERS
    embedding_model: str = "all-MiniLM-L6-v2"
    embedding_dimension: int = 384

    # --- Vector Database ---
    vector_db_provider: VectorDBProvider = VectorDBProvider.WEAVIATE
    weaviate_url: str = "http://localhost:9090"
    weaviate_api_key: str = ""
    weaviate_default_collection: str = "documents"

    # --- Chunking ---
    chunking_strategy: ChunkingStrategyType = ChunkingStrategyType.RECURSIVE
    chunk_size: int = 512
    chunk_overlap: int = 50

    # --- Reranker ---
    reranker_model: str = "cross-encoder/ms-marco-MiniLM-L-6-v2"
    reranker_top_k: int = 5

    # --- Retrieval ---
    retrieval_top_k: int = 20
    hybrid_search_alpha: float = Field(default=0.5, ge=0.0, le=1.0)



    # --- Ingestion ---
    ingestion_strategy: IngestionStrategyType = IngestionStrategyType.SHARED
    max_batch_size: int = 100
    max_document_size_mb: int = 50




def get_settings() -> Settings:
    """Factory function for settings (allows caching / overrides)."""
    return Settings()
