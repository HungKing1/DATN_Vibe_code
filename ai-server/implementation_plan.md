# Advanced RAG Backend System — Implementation Plan

Production-ready, extensible Python backend with Clean Architecture, SOLID principles, and pluggable components.

## Proposed Changes

### Project Root

#### [NEW] [pyproject.toml](file:///e:/20252/DATN_vibe_code/pyproject.toml)

UV-based project config with all dependencies: `fastapi`, `uvicorn`, `weaviate-client`, `langchain`, `langchain-openai`, `redis`, `celery`, `python-dotenv`, `pydantic-settings`, `pypdf`, `sentence-transformers`, `httpx`, etc.

#### [NEW] [.env.example](file:///e:/20252/DATN_vibe_code/.env.example)

Template for all config vars (API keys, DB URLs, Redis, Weaviate, embedding model, etc.)

---

### Full Folder Structure

```
e:/20252/DATN_vibe_code/
├── pyproject.toml
├── .env.example
├── README.md
└── src/
    └── rag_backend/
        ├── __init__.py
        ├── main.py                          # FastAPI app entry point
        ├── config/
        │   ├── __init__.py
        │   └── settings.py                  # Pydantic Settings from .env
        │
        ├── domain/                          # CORE — no external deps
        │   ├── __init__.py
        │   ├── models/                      # Domain entities
        │   │   ├── __init__.py
        │   │   ├── document.py              # Document, Chunk, Metadata
        │   │   ├── query.py                 # Query, QueryResult
        │   │   └── embedding.py             # EmbeddingVector, EmbeddingVersion
        │   ├── interfaces/                  # Abstract interfaces (ABCs)
        │   │   ├── __init__.py
        │   │   ├── input_processor.py       # InputProcessor ABC
        │   │   ├── vector_repository.py     # VectorRepository ABC
        │   │   ├── llm_provider.py          # LLMProvider ABC
        │   │   ├── embedding_provider.py    # EmbeddingProvider ABC
        │   │   ├── chunking_strategy.py     # ChunkingStrategy ABC
        │   │   ├── reranker.py              # Reranker ABC
        │   │   ├── query_rewriter.py        # QueryRewriter ABC
        │   │   ├── cache_service.py         # CacheService ABC
        │   │   └── context_builder.py       # ContextBuilder ABC
        │   └── exceptions.py                # Domain-level exceptions
        │
        ├── application/                     # USE CASES — orchestration
        │   ├── __init__.py
        │   ├── services/
        │   │   ├── __init__.py
        │   │   ├── ingestion_service.py     # Document ingestion (async, batch)
        │   │   ├── query_service.py         # Query pipeline orchestrator
        │   │   └── rag_pipeline.py          # Full RAG pipeline
        │   ├── dto/
        │   │   ├── __init__.py
        │   │   ├── ingestion_dto.py         # Ingestion request/response DTOs
        │   │   └── query_dto.py             # Query request/response DTOs
        │   └── prompt/
        │       ├── __init__.py
        │       └── prompt_manager.py        # Prompt templates & management
        │
        ├── infrastructure/                  # EXTERNAL — implementations
        │   ├── __init__.py
        │   ├── input_processors/
        │   │   ├── __init__.py
        │   │   ├── pdf_processor.py
        │   │   ├── txt_processor.py
        │   │   ├── json_processor.py
        │   │   └── factory.py               # InputProcessorFactory
        │   ├── vector_db/
        │   │   ├── __init__.py
        │   │   └── weaviate_repository.py
        │   ├── llm/
        │   │   ├── __init__.py
        │   │   └── langchain_provider.py
        │   ├── embeddings/
        │   │   ├── __init__.py
        │   │   └── sentence_transformer_provider.py
        │   ├── chunking/
        │   │   ├── __init__.py
        │   │   ├── recursive_chunker.py
        │   │   └── semantic_chunker.py
        │   ├── reranking/
        │   │   ├── __init__.py
        │   │   └── cross_encoder_reranker.py
        │   ├── query/
        │   │   ├── __init__.py
        │   │   ├── llm_query_rewriter.py
        │   │   └── default_context_builder.py
        │   ├── cache/
        │   │   ├── __init__.py
        │   │   └── redis_cache.py
        │   ├── multimodal/
        │   │   ├── __init__.py
        │   │   ├── speech_to_text.py
        │   │   └── image_to_text.py
        │   └── background/
        │       ├── __init__.py
        │       └── celery_worker.py
        │
        ├── presentation/                    # API layer
        │   ├── __init__.py
        │   ├── routes/
        │   │   ├── __init__.py
        │   │   ├── ingestion_routes.py
        │   │   ├── query_routes.py
        │   │   └── health_routes.py
        │   ├── controllers/
        │   │   ├── __init__.py
        │   │   ├── ingestion_controller.py
        │   │   └── query_controller.py
        │   ├── schemas/
        │   │   ├── __init__.py
        │   │   ├── ingestion_schemas.py
        │   │   └── query_schemas.py
        │   └── middlewares/
        │       ├── __init__.py
        │       ├── error_handler.py
        │       ├── logging_middleware.py
        │       └── tenant_middleware.py
        │
        └── di/                              # Dependency Injection
            ├── __init__.py
            └── container.py                 # DI container wiring all layers
```

---

### Domain Layer (Pure Python, no external dependencies)

#### [NEW] [document.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/models/document.py)
Pydantic models: `Document`, `DocumentChunk`, `DocumentMetadata`, `ProcessedDocument`, `IngestionResult`.

#### [NEW] [query.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/models/query.py)
Models: `Query`, `RetrievalResult`, `RankedResult`, `GenerationResult`, `RAGResponse`, `Citation`.

#### [NEW] [embedding.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/models/embedding.py)
Models: `EmbeddingVector`, `EmbeddingVersion`, `CollectionVersion`.

#### [NEW] [input_processor.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/interfaces/input_processor.py)
ABC with `process(source) -> ProcessedDocument` and `supported_extensions() -> list[str]`.

#### [NEW] [vector_repository.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/interfaces/vector_repository.py)
ABC: `store()`, `search()`, `hybrid_search()`, `delete()`, `create_collection()`, `list_collections()`.

#### [NEW] [llm_provider.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/interfaces/llm_provider.py)
ABC: `generate()`, `generate_stream()` (async generator for streaming).

#### [NEW] [embedding_provider.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/interfaces/embedding_provider.py)
ABC: `embed_text()`, `embed_batch()`, `get_dimension()`, `get_version()`.

#### [NEW] [chunking_strategy.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/interfaces/chunking_strategy.py)
ABC: `chunk(document) -> list[DocumentChunk]`.

#### [NEW] [reranker.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/interfaces/reranker.py)
ABC: `rerank(query, results) -> list[RankedResult]`.

#### [NEW] [query_rewriter.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/interfaces/query_rewriter.py)
ABC: `rewrite(query) -> Query`.

#### [NEW] [cache_service.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/interfaces/cache_service.py)
ABC: `get()`, `set()`, `delete()`, `exists()`.

#### [NEW] [context_builder.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/interfaces/context_builder.py)
ABC: `build_context(ranked_results, max_tokens) -> str`.

#### [NEW] [exceptions.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/domain/exceptions.py)
Custom exceptions: `DocumentProcessingError`, `VectorStoreError`, `LLMProviderError`, `EmbeddingError`, `ChunkingError`, `CacheError`, `RerankingError`, `QueryRewriteError`, `IngestionError`, `TenantNotFoundError`.

---

### Infrastructure Layer (Concrete implementations)

#### [NEW] Input Processors — `pdf_processor.py`, `txt_processor.py`, `json_processor.py`
Each implements `InputProcessor`. Uses pypdf, plain file read, and json stdlib respectively.

#### [NEW] [factory.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/infrastructure/input_processors/factory.py)
`InputProcessorFactory` — auto-discovers processors, resolves by file extension. Uses registry pattern for easy plugin addition.

#### [NEW] [weaviate_repository.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/infrastructure/vector_db/weaviate_repository.py)
Implements `VectorRepository` for Weaviate. Supports collection versioning, multi-tenant, metadata filtering.

#### [NEW] [langchain_provider.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/infrastructure/llm/langchain_provider.py)
Implements `LLMProvider` wrapping LangChain `ChatOpenAI`. Supports streaming via async generator.

#### [NEW] [sentence_transformer_provider.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/infrastructure/embeddings/sentence_transformer_provider.py)
Implements `EmbeddingProvider` using `sentence-transformers`. Includes version tracking.

#### [NEW] Chunking — `recursive_chunker.py`, `semantic_chunker.py`
Implements `ChunkingStrategy` using LangChain's `RecursiveCharacterTextSplitter` and a semantic similarity approach.

#### [NEW] [cross_encoder_reranker.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/infrastructure/reranking/cross_encoder_reranker.py)
Implements `Reranker` using `sentence-transformers` cross-encoder models.

#### [NEW] [llm_query_rewriter.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/infrastructure/query/llm_query_rewriter.py)
Implements `QueryRewriter` using the LLM provider to rewrite queries for better retrieval.

#### [NEW] [default_context_builder.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/infrastructure/query/default_context_builder.py)
Implements `ContextBuilder` with top-k selection and context compression.

#### [NEW] [redis_cache.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/infrastructure/cache/redis_cache.py)
Implements `CacheService` backed by Redis with TTL support.

#### [NEW] Multimodal — `speech_to_text.py`, `image_to_text.py`
Adapters converting voice/image input to text. Uses Whisper API and OCR respectively.

#### [NEW] [celery_worker.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/infrastructure/background/celery_worker.py)
Celery app for background/async jobs (ingestion, batch processing).

---

### Application Layer (Use cases & orchestration)

#### [NEW] [ingestion_service.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/application/services/ingestion_service.py)
Orchestrates: resolve processor → process document → chunk → embed → store. Supports separate-collection and shared-collection strategies. Supports async/batch/large document handling.

#### [NEW] [query_service.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/application/services/query_service.py)
Orchestrates the query pipeline: rewrite → retrieve → rerank → build context.

#### [NEW] [rag_pipeline.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/application/services/rag_pipeline.py)
Full RAG pipeline: query understanding → retrieval (via query service) → LLM generation → post-processing (citations, formatting). Supports streaming.

#### [NEW] [prompt_manager.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/application/prompt/prompt_manager.py)
Manages prompt templates with variable substitution. Supports versioned prompts.

#### [NEW] DTOs — `ingestion_dto.py`, `query_dto.py`
Data Transfer Objects decoupling presentation from domain.

---

### Presentation Layer (FastAPI)

#### [NEW] [main.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/main.py)
FastAPI app bootstrap: mount routers, register middleware, configure lifespan events (DI container init).

#### [NEW] Routes — `ingestion_routes.py`, `query_routes.py`, `health_routes.py`
API endpoints for document ingestion, querying, and health checks.

#### [NEW] Controllers — `ingestion_controller.py`, `query_controller.py`
Thin controllers that delegate to application services via DI.

#### [NEW] Schemas — `ingestion_schemas.py`, `query_schemas.py`
Pydantic request/response schemas for API validation.

#### [NEW] Middlewares — `error_handler.py`, `logging_middleware.py`, `tenant_middleware.py`
Centralized error handling, structured logging, tenant resolution.

---

### Dependency Injection

#### [NEW] [container.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/di/container.py)
Central DI container wiring interfaces to implementations based on settings. Swapping a component = changing one line in the container.

---

### Configuration

#### [NEW] [settings.py](file:///e:/20252/DATN_vibe_code/src/rag_backend/config/settings.py)
Pydantic `BaseSettings` loading from `.env`: vector DB config, LLM config, embedding config, Redis, Celery, chunking strategy, tenant mode, etc.

---

## Key Design Patterns Applied

| Pattern | Where | Purpose |
|---------|-------|---------|
| **Factory** | `InputProcessorFactory` | Resolve processor by file extension |
| **Strategy** | `ChunkingStrategy` implementations | Runtime-swappable chunking |
| **Adapter** | LLM, Embedding, Input processors | Wrap external libs behind interfaces |
| **Repository** | `VectorRepository` | Abstract vector DB operations |
| **DI** | `container.py` + FastAPI `Depends` | Decouple all layers |

---

## Data Flow

```
Input (file/text/voice/image)
  → Multimodal Adapter (normalize to text)
  → InputProcessorFactory (select processor)
  → InputProcessor (extract content)
  → ChunkingStrategy (split into chunks)
  → EmbeddingProvider (vectorize)
  → VectorRepository (store)

Query (text/voice/image)
  → Multimodal Adapter (normalize)
  → QueryRewriter (rewrite for retrieval)
  → VectorRepository (search/hybrid search)
  → Reranker (cross-encoder re-ranking)
  → ContextBuilder (compress + top-k)
  → PromptManager (build prompt)
  → LLMProvider (generate response)
  → Post-processing (citations, formatting)
  → RAGResponse
```

---

## Verification Plan

### Automated Checks

1. **Import validation** — run `python -c "from rag_backend.main import app"` to verify all modules wire correctly
2. **Linting** — `ruff check src/` to ensure code quality
3. **Type checking** — `pyright src/` or `mypy src/` for type safety

### Manual Verification

Since this is a greenfield skeleton project with no running external services, full integration tests require active Weaviate/Redis/OpenAI connections. The user should:

1. Copy `.env.example` to `.env` and fill in API keys
2. Start Weaviate + Redis via Docker
3. Run `uv run uvicorn rag_backend.main:app --reload` and verify Swagger docs at `/docs`
4. Test the `/health` endpoint returns `200 OK`
