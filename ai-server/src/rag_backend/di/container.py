"""Dependency Injection container — wires all layers together."""

from __future__ import annotations

import logging

from rag_backend.application.prompt.prompt_manager import PromptManager
from rag_backend.application.services.ingestion_service import IngestionService
from rag_backend.application.services.query_service import QueryService
from rag_backend.application.services.rag_pipeline import RAGPipeline
from rag_backend.config.settings import LLMProviderType, Settings

from rag_backend.domain.interfaces.chunking_strategy import ChunkingStrategy
from rag_backend.domain.interfaces.context_builder import ContextBuilder
from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.interfaces.llm_provider import LLMProvider
from rag_backend.domain.interfaces.query_rewriter import QueryRewriter
from rag_backend.domain.interfaces.reranker import Reranker
from rag_backend.domain.interfaces.vector_repository import VectorRepository

# Infrastructure implementations
from rag_backend.infrastructure.chunking.legal_article_chunker import LegalArticleChunker
from rag_backend.infrastructure.embeddings.sentence_transformer_provider import (
    SentenceTransformerProvider,
)
from rag_backend.infrastructure.mongodb.mongodb_legal_reader import MongoDBLegalReader
from rag_backend.infrastructure.llm.langchain_provider import LangChainOpenAIProvider
from rag_backend.infrastructure.llm.google_provider import GoogleGeminiProvider
from rag_backend.infrastructure.query.default_context_builder import DefaultContextBuilder
from rag_backend.infrastructure.query.llm_query_rewriter import LLMQueryRewriter
from rag_backend.infrastructure.reranking.cross_encoder_reranker import CrossEncoderReranker
from rag_backend.infrastructure.vector_db.weaviate_repository import WeaviateRepository

# Agents
from rag_backend.application.services.multi_agent_service import MultiAgentService
from rag_backend.application.agents.master_lawyer_agent import MasterLawyerAgent
from rag_backend.application.agents.paralegal_agent import ParalegalAgentFactory

# Controllers
from rag_backend.presentation.controllers.ingestion_controller import IngestionController
from rag_backend.presentation.controllers.query_controller import QueryController
from rag_backend.presentation.controllers.agent_controller import AgentController


logger = logging.getLogger(__name__)


class Container:
    """Central DI container — creates and wires all dependencies."""

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
            self._instances["vector_repository"] = WeaviateRepository(
                url=self._settings.weaviate_url,
                api_key=self._settings.weaviate_api_key,
            )
        return self._instances["vector_repository"]  # type: ignore

    def llm_provider(self) -> LLMProvider:
        if "llm_provider" not in self._instances:
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
            self._instances["chunking_strategy"] = LegalArticleChunker(
                min_tokens=self._settings.chunk_min_tokens,
                max_tokens=self._settings.chunk_max_tokens,
            )
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
                prompt_manager=self.prompt_manager(),
            )
        return self._instances["query_rewriter"]  # type: ignore

    def context_builder(self) -> ContextBuilder:
        if "context_builder" not in self._instances:
            self._instances["context_builder"] = DefaultContextBuilder()
        return self._instances["context_builder"]  # type: ignore

    def mongo_reader(self) -> MongoDBLegalReader:
        if "mongo_reader" not in self._instances:
            self._instances["mongo_reader"] = MongoDBLegalReader(
                url=self._settings.mongodb_url,
                db_name=self._settings.mongodb_db_name,
            )
        return self._instances["mongo_reader"]  # type: ignore

    # ──────────────────────────────────────────────
    # Application Services
    # ──────────────────────────────────────────────

    def ingestion_service(self) -> IngestionService:
        if "ingestion_service" not in self._instances:
            self._instances["ingestion_service"] = IngestionService(
                chunking_strategy=self.chunking_strategy(),
                embedding_provider=self.embedding_provider(),
                vector_repository=self.vector_repository(),
                mongo_reader=self.mongo_reader(),
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
            )
        return self._instances["query_service"]  # type: ignore

    def prompt_manager(self) -> PromptManager:
        if "prompt_manager" not in self._instances:
            self._instances["prompt_manager"] = PromptManager()
        return self._instances["prompt_manager"]  # type: ignore

    def rag_pipeline(self) -> RAGPipeline:
        if "rag_pipeline" not in self._instances:
            self._instances["rag_pipeline"] = RAGPipeline(
                query_service=self.query_service(),
                llm_provider=self.llm_provider(),
                prompt_manager=self.prompt_manager(),
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

    def multi_agent_service(self) -> MultiAgentService:
        if "multi_agent_service" not in self._instances:
            master = MasterLawyerAgent(
                llm_provider=self.llm_provider(),
                prompt_manager=self.prompt_manager(),
            )
            paralegal_factory = ParalegalAgentFactory(
                llm_provider=self.llm_provider(),
                vector_repository=self.vector_repository(),
                embedding_provider=self.embedding_provider(),
                prompt_manager=self.prompt_manager(),
                reranker=self.reranker(),
            )
            self._instances["multi_agent_service"] = MultiAgentService(
                master_agent=master,
                paralegal_factory=paralegal_factory,
                max_iterations=5,
            )
        return self._instances["multi_agent_service"]  # type: ignore

    def agent_controller(self) -> AgentController:
        if "agent_controller" not in self._instances:
            self._instances["agent_controller"] = AgentController(
                multi_agent_service=self.multi_agent_service()
            )
        return self._instances["agent_controller"]  # type: ignore


# --- Module-level singleton ---

_container: Container | None = None


def init_container(settings: Settings) -> Container:
    """Initialize the global container."""
    global _container
    _container = Container(settings)
    logger.info("DI container initialized")
    return _container


def get_container() -> Container:
    """Get the global container instance."""
    if _container is None:
        raise RuntimeError("Container not initialized. Call init_container() first.")
    return _container
