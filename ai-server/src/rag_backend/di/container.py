"""Dependency Injection container — wires all layers together.

To swap any component:
1. Create a new implementation of the corresponding interface
2. Change the initialization in this file
3. No other code changes needed

Examples:
    - Switch vector DB: Replace WeaviateRepository with QdrantRepository
    - Switch LLM: Replace LangChainOpenAIProvider with OllamaProvider
    - Switch chunking: Replace RecursiveChunker with SemanticChunker
    - Add input type: Register a new processor with the factory
"""

from __future__ import annotations

import logging

from rag_backend.application.prompt.prompt_manager import PromptManager
from rag_backend.application.services.evaluation_service import EvaluationService
from rag_backend.application.services.ingestion_service import IngestionService
from rag_backend.application.services.query_service import QueryService
from rag_backend.application.services.rag_pipeline import RAGPipeline
from rag_backend.application.services.reflection_service import ReflectionService
from rag_backend.config.settings import ChunkingStrategyType, LLMProviderType, Settings

from rag_backend.domain.interfaces.chunking_strategy import ChunkingStrategy
from rag_backend.domain.interfaces.context_builder import ContextBuilder
from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.interfaces.llm_provider import LLMProvider
from rag_backend.domain.interfaces.query_rewriter import QueryRewriter
from rag_backend.domain.interfaces.reranker import Reranker
from rag_backend.domain.interfaces.vector_repository import VectorRepository

# Infrastructure implementations

from rag_backend.infrastructure.chunking.recursive_chunker import RecursiveChunker
from rag_backend.infrastructure.chunking.semantic_chunker import SemanticChunker
from rag_backend.infrastructure.embeddings.sentence_transformer_provider import (
    SentenceTransformerProvider,
)
from rag_backend.infrastructure.input_processors.factory import InputProcessorFactory
from rag_backend.infrastructure.input_processors.json_processor import JSONProcessor
from rag_backend.infrastructure.input_processors.pdf_processor import PDFProcessor
from rag_backend.infrastructure.input_processors.txt_processor import TXTProcessor
from rag_backend.infrastructure.llm.langchain_provider import LangChainOpenAIProvider
from rag_backend.infrastructure.llm.google_provider import GoogleGeminiProvider
from rag_backend.infrastructure.query.default_context_builder import DefaultContextBuilder
from rag_backend.infrastructure.query.llm_query_rewriter import LLMQueryRewriter
from rag_backend.infrastructure.reranking.cross_encoder_reranker import CrossEncoderReranker
from rag_backend.infrastructure.vector_db.weaviate_repository import WeaviateRepository
from rag_backend.infrastructure.query.collection_router import CollectionRouter
from rag_backend.domain.models.collection_registry import CollectionRegistry

# Controllers
from rag_backend.presentation.controllers.ingestion_controller import IngestionController
from rag_backend.presentation.controllers.query_controller import QueryController

logger = logging.getLogger(__name__)


class Container:
    """Central DI container — creates and wires all dependencies.

    Follows the Composition Root pattern: all object creation
    happens here, nowhere else in the application.
    """

    def __init__(self, settings: Settings) -> None:
        self._settings = settings
        self._instances: dict[str, object] = {}

    # ──────────────────────────────────────────────
    # Infrastructure Singletons
    # ──────────────────────────────────────────────

    def embedding_provider(self) -> EmbeddingProvider:
        if "embedding_provider" not in self._instances:
            self._instances["embedding_provider"] = SentenceTransformerProvider(
                model_name=self._settings.embedding_model,
            )
        return self._instances["embedding_provider"]  # type: ignore

    def vector_repository(self) -> VectorRepository:
        if "vector_repository" not in self._instances:
            # ▶ To switch vector DB, change this line:
            self._instances["vector_repository"] = WeaviateRepository(
                url=self._settings.weaviate_url,
                api_key=self._settings.weaviate_api_key,
            )
        return self._instances["vector_repository"]  # type: ignore

    def llm_provider(self) -> LLMProvider:
        if "llm_provider" not in self._instances:
            # ▶ Auto-selected based on LLM_PROVIDER env var:
            if self._settings.llm_provider == LLMProviderType.GOOGLE:
                self._instances["llm_provider"] = GoogleGeminiProvider(
                    api_key=self._settings.google_api_key,
                    model=self._settings.google_model,
                    temperature=self._settings.google_temperature,
                )
            elif self._settings.llm_provider == LLMProviderType.GROQ:
                from rag_backend.infrastructure.llm.groq_provider import GroqProvider
                self._instances["llm_provider"] = GroqProvider(
                    api_key=self._settings.groq_api_key,
                    model=self._settings.groq_model,
                    temperature=self._settings.groq_temperature,
                    max_tokens=self._settings.groq_max_tokens,
                )
            else:
                # Default: LangChain OpenAI (also used for OPENAI / LANGCHAIN_OPENAI)
                self._instances["llm_provider"] = LangChainOpenAIProvider(
                    api_key=self._settings.openai_api_key,
                    model=self._settings.openai_model,
                    temperature=self._settings.openai_temperature,
                    max_tokens=self._settings.openai_max_tokens,
                )
            logger.info("LLM provider: %s", self._settings.llm_provider.value)
        return self._instances["llm_provider"]  # type: ignore

    def chunking_strategy(self) -> ChunkingStrategy:
        if "chunking_strategy" not in self._instances:
            # ▶ Strategy Pattern — selected based on config:
            if self._settings.chunking_strategy == ChunkingStrategyType.SEMANTIC:
                self._instances["chunking_strategy"] = SemanticChunker(
                    embedding_provider=self.embedding_provider(),
                )
            else:
                self._instances["chunking_strategy"] = RecursiveChunker()
        return self._instances["chunking_strategy"]  # type: ignore

    def reranker(self) -> Reranker:
        if "reranker" not in self._instances:
            self._instances["reranker"] = CrossEncoderReranker(
                model_name=self._settings.reranker_model,
            )
        return self._instances["reranker"]  # type: ignore

    def query_rewriter(self) -> QueryRewriter:
        if "query_rewriter" not in self._instances:
            self._instances["query_rewriter"] = LLMQueryRewriter(
                llm_provider=self.llm_provider(),
            )
        return self._instances["query_rewriter"]  # type: ignore

    def context_builder(self) -> ContextBuilder:
        if "context_builder" not in self._instances:
            self._instances["context_builder"] = DefaultContextBuilder()
        return self._instances["context_builder"]  # type: ignore



    def input_processor_factory(self) -> InputProcessorFactory:
        if "input_processor_factory" not in self._instances:
            factory = InputProcessorFactory()
            # Register all built-in processors
            factory.register(PDFProcessor())
            factory.register(TXTProcessor())
            factory.register(JSONProcessor())
            # ▶ To add a new input type, register here:
            # factory.register(HTMLProcessor())
            # factory.register(DOCXProcessor())
            self._instances["input_processor_factory"] = factory
        return self._instances["input_processor_factory"]  # type: ignore

    def collection_router(self) -> CollectionRouter:
        if "collection_router" not in self._instances:
            self._instances["collection_router"] = CollectionRouter(
                llm_provider=self.llm_provider(),
                embedding_provider=self.embedding_provider(),
                registry=CollectionRegistry(),
            )
        return self._instances["collection_router"]  # type: ignore

    # ──────────────────────────────────────────────
    # Application Services
    # ──────────────────────────────────────────────

    def ingestion_service(self) -> IngestionService:
        if "ingestion_service" not in self._instances:
            self._instances["ingestion_service"] = IngestionService(
                processor_factory=self.input_processor_factory(),
                chunking_strategy=self.chunking_strategy(),
                embedding_provider=self.embedding_provider(),
                vector_repository=self.vector_repository(),
                collection_router=self.collection_router(),
                max_document_size_mb=self._settings.max_document_size_mb,
                chunk_size=self._settings.chunk_size,
                chunk_overlap=self._settings.chunk_overlap,
            )
        return self._instances["ingestion_service"]  # type: ignore

    def query_service(self) -> QueryService:
        if "query_service" not in self._instances:
            self._instances["query_service"] = QueryService(
                query_rewriter=self.query_rewriter(),
                embedding_provider=self.embedding_provider(),
                vector_repository=self.vector_repository(),
                reranker=self.reranker(),
                context_builder=self.context_builder(),
                collection_router=self.collection_router(),
            )
        return self._instances["query_service"]  # type: ignore

    def prompt_manager(self) -> PromptManager:
        if "prompt_manager" not in self._instances:
            self._instances["prompt_manager"] = PromptManager()
        return self._instances["prompt_manager"]  # type: ignore

    def evaluation_service(self) -> EvaluationService:
        if "evaluation_service" not in self._instances:
            self._instances["evaluation_service"] = EvaluationService(
                llm_provider=self.llm_provider(),
                prompt_manager=self.prompt_manager(),
                score_threshold=self._settings.reflection_score_threshold,
                groundedness_threshold=self._settings.reflection_groundedness_threshold,
                relevance_threshold=self._settings.reflection_relevance_threshold,
            )
        return self._instances["evaluation_service"]  # type: ignore

    def reflection_service(self) -> ReflectionService:
        if "reflection_service" not in self._instances:
            self._instances["reflection_service"] = ReflectionService(
                llm_provider=self.llm_provider(),
                prompt_manager=self.prompt_manager(),
            )
        return self._instances["reflection_service"]  # type: ignore

    def rag_pipeline(self) -> RAGPipeline:
        if "rag_pipeline" not in self._instances:
            self._instances["rag_pipeline"] = RAGPipeline(
                query_service=self.query_service(),
                llm_provider=self.llm_provider(),
                prompt_manager=self.prompt_manager(),
                evaluation_service=self.evaluation_service(),
                reflection_service=self.reflection_service(),
            )
        return self._instances["rag_pipeline"]  # type: ignore

    # ──────────────────────────────────────────────
    # Presentation Controllers
    # ──────────────────────────────────────────────

    def ingestion_controller(self) -> IngestionController:
        if "ingestion_controller" not in self._instances:
            self._instances["ingestion_controller"] = IngestionController(
                ingestion_service=self.ingestion_service(),
            )
        return self._instances["ingestion_controller"]  # type: ignore

    def query_controller(self) -> QueryController:
        if "query_controller" not in self._instances:
            self._instances["query_controller"] = QueryController(
                rag_pipeline=self.rag_pipeline(),
            )
        return self._instances["query_controller"]  # type: ignore


# --- Module-level singleton ---

_container: Container | None = None


def init_container(settings: Settings) -> Container:
    """Initialize the global container (called at app startup)."""
    global _container
    _container = Container(settings)
    logger.info("DI container initialized")
    return _container


def get_container() -> Container:
    """Get the global container instance."""
    if _container is None:
        raise RuntimeError("Container not initialized. Call init_container() first.")
    return _container
