# 🧠 Advanced RAG Backend System

Production-ready, highly extensible Retrieval-Augmented Generation backend built with **Clean Architecture** and **SOLID principles**.

## Tech Stack

- **Python 3.11+** with **FastAPI**
- **Weaviate** vector database (replaceable)
- **LangChain** LLM wrapper (replaceable)
- **uv** for dependency management

## Quick Start

```bash
# 1. Install dependencies
uv sync

# 2. Configure environment
cp .env.example .env
# Edit .env with your API keys and service URLs

# 3. Start external services (Docker)
docker run -d -p 8080:8080 -p 50051:50051 semitechnologies/weaviate:latest
docker run -d -p 6379:6379 redis:alpine

# 4. Run the application
uv run uvicorn rag_backend.main:app --reload --host 0.0.0.0 --port 8000

# 5. Open API docs
# http://localhost:8000/docs
```

## Architecture

```
src/rag_backend/
├── config/          # Settings from .env
├── domain/          # Core: models, interfaces (ABCs), exceptions
├── application/     # Use cases: services, DTOs, prompt management
├── infrastructure/  # Implementations: vector DB, LLM, embeddings, etc.
├── presentation/    # FastAPI: routes, controllers, schemas, middlewares
├── di/              # Dependency Injection container
└── main.py          # App entry point
```

## Key Design Patterns

| Pattern | Where | Purpose |
|---------|-------|---------|
| Factory | `InputProcessorFactory` | Resolve processor by file extension |
| Strategy | `ChunkingStrategy` | Runtime-swappable chunking |
| Adapter | LLM, Embedding, Input processors | Wrap external libs behind interfaces |
| Repository | `VectorRepository` | Abstract vector DB operations |
| DI | `container.py` + FastAPI | Decouple all layers |

## Data Flow

```
Ingestion:  File → InputProcessor → Chunker → Embedder → VectorRepository
Query:      Text → QueryRewriter → Embedder → VectorSearch → Reranker → ContextBuilder → LLM → Response
```

---

## 🔌 Extensibility Examples

### Adding a New Input Type (e.g., HTML)

```python
# 1. Create: infrastructure/input_processors/html_processor.py
from rag_backend.domain.interfaces.input_processor import InputProcessor

class HTMLProcessor(InputProcessor):
    def supported_extensions(self) -> list[str]:
        return [".html", ".htm"]

    async def process(self, source, **kwargs):
        from bs4 import BeautifulSoup
        html = source.read_text()
        text = BeautifulSoup(html, "html.parser").get_text()
        return ProcessedDocument(content=text, ...)

# 2. Register in di/container.py:
factory.register(HTMLProcessor())
# Done! No other files modified.
```

### Switching Vector Database (e.g., to Qdrant)

```python
# 1. Create: infrastructure/vector_db/qdrant_repository.py
class QdrantRepository(VectorRepository):
    async def store(self, chunks, collection_name): ...
    async def search(self, query_vector, collection_name, top_k, filters): ...
    async def hybrid_search(self, ...): ...
    # ... implement all VectorRepository methods

# 2. In di/container.py, change ONE line:
def vector_repository(self) -> VectorRepository:
    return QdrantRepository(url=self._settings.qdrant_url)
```

### Switching LLM Provider (e.g., to Ollama)

```python
# 1. Create: infrastructure/llm/ollama_provider.py
class OllamaProvider(LLMProvider):
    async def generate(self, prompt, **kwargs) -> GenerationResult: ...
    async def generate_stream(self, prompt, **kwargs) -> AsyncIterator[str]: ...

# 2. In di/container.py, change ONE line:
def llm_provider(self) -> LLMProvider:
    return OllamaProvider(model="llama3")
```

### Adding a New Chunking Strategy

```python
# 1. Create: infrastructure/chunking/sliding_window_chunker.py
class SlidingWindowChunker(ChunkingStrategy):
    def get_strategy_name(self) -> str:
        return "sliding_window"
    async def chunk(self, document, chunk_size, chunk_overlap): ...

# 2. Add to settings enum and container switch
```

---

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| `POST` | `/api/v1/ingestion/upload` | Upload & ingest a document |
| `POST` | `/api/v1/ingestion/upload/batch` | Batch upload & ingest |
| `DELETE` | `/api/v1/ingestion/document` | Delete a document |
| `GET` | `/api/v1/ingestion/collections` | List collections |
| `POST` | `/api/v1/ingestion/collections` | Create a collection |
| `POST` | `/api/v1/query/` | RAG query |
| `POST` | `/api/v1/query/stream` | Streaming RAG query |
| `GET` | `/health` | Health check |

---

## 🚀 RAG Best Practices

### Prompt Engineering
- Use explicit instructions about source citation
- Include few-shot examples in system prompts for consistent output format
- Separate context from instructions clearly

### Large Documents
- Use batched embedding (configured via `embedding_batch_size`)
- Leverage Celery for async background ingestion
- Set `max_document_size_mb` to prevent memory issues

### Improving Retrieval
- Enable hybrid search (`hybrid_alpha=0.5`) for better recall
- Use cross-encoder reranking for precision
- Implement query rewriting for incomplete queries

### Evaluating RAG Performance
- Track retrieval relevance metrics (nDCG, MRR)
- Monitor answer faithfulness (grounded in retrieved context)
- Log token usage for cost optimization
- A/B test prompt versions via `PromptManager`
