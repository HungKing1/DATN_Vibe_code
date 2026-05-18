# AI Server — RAG Backend Overview

> **Mục đích của file này:** Đây là tài liệu context cho AI coding assistant (Vibe Code / Claude / Cursor). Đọc file này trước khi làm bất kỳ thay đổi nào trong folder `ai-server/` để hiểu kiến trúc, quy ước, và các quyết định thiết kế quan trọng.

---

## 1. Tổng Quan Hệ Thống

**`ai-server`** là một **Advanced RAG (Retrieval-Augmented Generation) Backend** được viết bằng Python, phục vụ việc tìm kiếm và trả lời câu hỏi pháp luật Việt Nam. Hệ thống nhận PDF văn bản luật, lưu trữ vector, và trả lời câu hỏi của người dùng thông qua LLM.

- **Framework:** FastAPI + Uvicorn (ASGI)
- **Python:** ≥ 3.11
- **Package manager:** `uv` (dùng `uv run` thay vì `python`)
- **Vector DB:** Weaviate (chạy tại `http://localhost:9090`)
- **LLM mặc định:** Groq (`openai/gpt-oss-120b`) — có thể đổi sang Google Gemini / OpenAI qua env var
- **Embedding:** `sentence-transformers` (`all-MiniLM-L6-v2`, dim=384)
- **Observability:** LangSmith tracing (cấu hình qua `.env`)

**Khởi động server:**
```bash
uv run uvicorn rag_backend.main:app --reload
```

---

## 2. Kiến Trúc — Clean Architecture (4 Layers)

```
src/rag_backend/
├── domain/          # Lớp lõi: interfaces + models + exceptions (KHÔNG import layer nào khác)
├── application/     # Use-cases: services + prompt manager + DTOs
├── infrastructure/  # Implementations: LLM, vector DB, chunking, embedding, reranker
├── presentation/    # FastAPI: routes + controllers + schemas + middlewares
├── config/          # Settings (pydantic-settings, load từ .env)
├── di/              # Dependency Injection container (Composition Root)
└── main.py          # App factory + lifespan
```

**Dependency rule (quan trọng):** `presentation → application → domain ← infrastructure`
- `domain/` **không được** import bất kỳ layer nào khác.
- `infrastructure/` implement interfaces từ `domain/`.
- `di/container.py` là nơi DUY NHẤT khởi tạo và wire các object.

---

## 3. Cấu Trúc Thư Mục Chi Tiết

```
ai-server/
├── .env                          # Biến môi trường thực (không commit)
├── .env.example                  # Template env vars
├── pyproject.toml                # Dependencies & tool config
├── overview.md                   # File này — context cho AI coding
│
└── src/rag_backend/
    ├── main.py                   # create_app() factory + lifespan (startup/shutdown)
    │
    ├── config/
    │   └── settings.py           # Settings(BaseSettings) — tất cả config đọc từ env
    │
    ├── di/
    │   └── container.py          # Container class — Composition Root duy nhất
    │
    ├── domain/
    │   ├── exceptions.py         # RAGBackendError + các custom exceptions
    │   ├── models/
    │   │   ├── document.py       # DocumentChunk, ProcessedDocument, IngestionResult
    │   │   ├── query.py          # Query, RAGResponse, Citation, RankedResult, QueryType
    │   │   ├── embedding.py      # Embedding value object
    │   │   └── collection_registry.py  # CollectionInfo (legacy, ít dùng)
    │   └── interfaces/
    │       ├── embedding_provider.py   # EmbeddingProvider ABC
    │       ├── llm_provider.py         # LLMProvider ABC (generate, generate_stream)
    │       ├── vector_repository.py    # VectorRepository ABC (CRUD Weaviate)
    │       ├── chunking_strategy.py    # ChunkingStrategy ABC
    │       ├── input_processor.py      # InputProcessor ABC
    │       ├── reranker.py             # Reranker ABC
    │       ├── query_rewriter.py       # QueryRewriter ABC
    │       └── context_builder.py      # ContextBuilder ABC
    │
    ├── application/
    │   ├── dto/
    │   │   ├── ingestion_dto.py  # IngestionRequestDTO, IngestionResultDTO
    │   │   └── query_dto.py      # QueryDTO, RAGResponseDTO
    │   ├── prompt/
    │   │   └── prompt_manager.py # PromptManager — registry tập trung TẤT CẢ prompts
    │   └── services/
    │       ├── ingestion_service.py  # IngestionService — orchestrate ingestion pipeline
    │       ├── query_service.py      # QueryService — route, rewrite, retrieve, rerank
    │       └── rag_pipeline.py       # RAGPipeline — full RAG (standard + stream)
    │
    ├── infrastructure/
    │   ├── embeddings/
    │   │   └── sentence_transformer_provider.py  # SentenceTransformerProvider
    │   ├── llm/
    │   │   ├── google_provider.py     # GoogleGeminiProvider (langchain-google-genai)
    │   │   ├── groq_provider.py       # GroqProvider (langchain-groq)
    │   │   └── langchain_provider.py  # LangChainOpenAIProvider (default fallback)
    │   ├── vector_db/
    │   │   └── weaviate_repository.py # WeaviateRepository — implement VectorRepository
    │   ├── chunking/
    │   │   ├── recursive_chunker.py   # RecursiveChunker (default)
    │   │   └── semantic_chunker.py    # SemanticChunker (dùng embedding)
    │   ├── reranking/
    │   │   └── cross_encoder_reranker.py  # CrossEncoderReranker (cross-encoder/ms-marco-*)
    │   ├── input_processors/
    │   │   └── pdf_processor.py       # PDFProcessor — dùng pypdf (ONLY PDF supported)
    │   ├── multimodal/                # Placeholder (chưa implement, cần Whisper/Tesseract)
    │   └── query/
    │       ├── collection_router.py       # CollectionRouter — LLM route query → law_uuid
    │       ├── llm_query_rewriter.py      # LLMQueryRewriter — rewrite query với LLM
    │       └── default_context_builder.py # DefaultContextBuilder — build context string
    │
    └── presentation/
        ├── controllers/
        │   ├── ingestion_controller.py  # IngestionController
        │   └── query_controller.py      # QueryController (query, query_stream, query_reflect)
        ├── routes/
        │   ├── health_routes.py         # GET /health
        │   ├── ingestion_routes.py      # /api/v1/ingestion/*
        │   └── query_routes.py          # /api/v1/query/*
        ├── schemas/
        │   ├── ingestion_schemas.py     # Pydantic schemas for ingestion API
        │   └── query_schemas.py         # QueryRequestSchema, QueryResponseSchema, ReflectionQueryRequestSchema
        └── middlewares/
            ├── error_handler.py         # rag_exception_handler + generic_exception_handler
            └── logging_middleware.py    # LoggingMiddleware (request/response logging)
```

---

## 4. API Endpoints

### Ingestion (`/api/v1/ingestion`)

| Method | Path | Mô tả |
|--------|------|--------|
| `POST` | `/laws` | Upload 1+ PDF → tạo Law mới trong Weaviate |
| `POST` | `/laws/{law_uuid}/files` | Thêm 1+ PDF vào Law đã có (incremental) |
| `GET`  | `/laws` | Lấy danh sách tất cả bộ luật |
| `DELETE` | `/laws/{law_uuid}` | Cascade-delete Law + toàn bộ chunks |
| `DELETE` | `/document` | Xóa chunks của 1 document cụ thể |
| `GET`  | `/collections` | Debug: list Weaviate collections |

### Query (`/api/v1/query`)

| Method | Path | Mô tả |
|--------|------|--------|
| `POST` | `/` | Standard RAG query (sync JSON hoặc SSE nếu `stream=true`) |
| `POST` | `/stream` | SSE streaming RAG query |
| `POST` | `/reflect` | Reflection RAG — tự đánh giá và cải thiện câu trả lời |

### Health

| Method | Path | Mô tả |
|--------|------|--------|
| `GET`  | `/health` | Health check |

**API Docs:** `http://localhost:8000/docs` (Swagger UI)

---

## 5. Weaviate Schema (2-Collection Model)

Hệ thống dùng **2 Weaviate collections** (được khởi tạo tự động khi startup):

### `Law` collection — metadata của bộ luật
```
law_uuid    : string (UUID)
title       : string
description : string (3-4 câu, do LLM sinh)
keywords    : string[] 
source_file : string (tên file gốc)
title_vector: vector[384] (embedding của title + description)
```

### `LawChunk` collection — các chunk text
```
chunk_id        : string
document_id     : string
law_uuid        : string (cross-ref → Law)
collection_name : string (= law_uuid, để trace)
content         : string
source          : string (tên file)
page_number     : int
content_vector  : vector[384]
```

**Quan trọng:** `Law` collection đóng vai trò là **persistent registry** (thay thế in-memory registry cũ). Không cần maintain registry riêng.

---

## 6. Ingestion Pipeline

```
Upload PDF(s)
    │
    ▼
PDFProcessor.process()          → extract text + metadata
    │
    ▼
CollectionRouter.generate_law_header()   [LLM]
    → title, description, keywords
    │
    ▼
VectorRepository.upsert_law()   → tạo/update Law object trong Weaviate
    │
    ▼
ChunkingStrategy.chunk()        → RecursiveChunker (default) hoặc SemanticChunker
    │
    ▼
EmbeddingProvider.embed_batch() → SentenceTransformer (all-MiniLM-L6-v2, dim=384)
    │
    ▼
VectorRepository.store_chunks() → lưu LawChunk objects vào Weaviate
```

**Batch ingestion:** Nhiều file vào cùng 1 Law → file đầu tạo Law, các file sau dùng `update_law_description` để update description/keywords rồi append chunks.

---

## 7. Query Pipeline (RAGPipeline)

```
User Query
    │
    ▼
CollectionRouter.route_query()  [LLM]
    → chọn law_uuid từ danh sách Laws
    → None nếu OUT_OF_DOMAIN (Global Search trên tất cả Laws)
    │
    ▼
LLMQueryRewriter.rewrite()      [LLM] (optional, use_rewrite=True)
    → query được viết lại cho retrieval tốt hơn
    │
    ▼
VectorRepository.hybrid_search()
    → Weaviate hybrid search (BM25 + vector, alpha=0.5)
    → top_k=20 results
    │
    ▼
CrossEncoderReranker.rerank()   (optional, use_reranker=True)
    → cross-encoder/ms-marco-MiniLM-L-6-v2
    → top_k=5 results
    │
    ▼
DefaultContextBuilder.build()
    → format chunks thành context string
    │
    ▼
PromptManager.get_prompt("rag_system") + get_prompt("rag_user")
    │
    ▼
LLMProvider.generate() / generate_stream()
    │
    ▼
RAGResponse (answer + citations + metadata)
```

**Reflection RAG** (`POST /query/reflect`): Sau khi generate, LLM tự evaluate (groundedness, relevance, citations_matched) → nếu chất lượng thấp → thực hiện corrective action (REWRITE_QUERY / SEARCH_MORE / REGENERATE / STOP) → lặp tối đa N lần.

---

## 8. Dependency Injection (Container)

File `di/container.py` là **Composition Root duy nhất**. Mọi object đều được tạo ở đây theo pattern lazy singleton:

```python
# Để đổi LLM provider:
# Chỉ cần thay trong container.py, không đụng code khác
container.llm_provider()  # auto-select từ LLM_PROVIDER env var
                          # groq → GroqProvider
                          # google → GoogleGeminiProvider  
                          # default → LangChainOpenAIProvider
```

**Để thêm implementation mới:**
1. Tạo class implement interface tương ứng trong `infrastructure/`
2. Đăng ký trong `di/container.py`
3. Không cần thay đổi code ở layers khác

---

## 9. PromptManager — Quản Lý Tập Trung Prompts

**KHÔNG được hardcode prompt ở bất kỳ đâu khác.** Tất cả prompts phải qua `PromptManager`.

| Template Key | Dùng cho |
|---|---|
| `rag_system` | System prompt cho RAG generation |
| `rag_user` | User prompt với context + query |
| `evaluation` | LLM-as-Judge đánh giá câu trả lời |
| `reflection` | Reflection agent quyết định corrective action |
| `generate_law_header` | LLM sinh title/description/keywords từ PDF excerpt |
| `update_law_description` | LLM update description khi thêm file mới |
| `route_query_system` | LLM route query → law_uuid |
| `rewrite_system` | LLM rewrite query cho retrieval |
| `classify_system` | LLM classify query type |

Để thêm prompt mới: `prompt_manager.register_template("my_key", "template {var}")`.

---

## 10. Cấu Hình (.env)

Các biến quan trọng (xem `.env.example` để đầy đủ):

```bash
# LLM
LLM_PROVIDER=groq               # groq | google | langchain_openai
GROQ_API_KEY=...
GROQ_MODEL=openai/gpt-oss-120b

# Embedding
EMBEDDING_MODEL=all-MiniLM-L6-v2
EMBEDDING_DIMENSION=384

# Vector DB
WEAVIATE_URL=http://localhost:9090

# Chunking
CHUNKING_STRATEGY=recursive      # recursive | semantic
CHUNK_SIZE=512
CHUNK_OVERLAP=50

# Retrieval
RETRIEVAL_TOP_K=20
HYBRID_SEARCH_ALPHA=0.5          # 0=BM25 only, 1=vector only

# Observability
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=rag_backend_dev
```

---

## 11. Quy Ước Code

### ✅ DO (Nên làm)
- Mọi interface mới → đặt trong `domain/interfaces/`
- Mọi implementation mới → đặt trong `infrastructure/`
- Mọi object khởi tạo → trong `di/container.py`
- Mọi prompt mới → thêm vào `PromptManager` (không hardcode)
- Dùng `async/await` cho tất cả I/O (LLM calls, DB calls, file reads)
- Exceptions từ `domain/exceptions.py` — không raise generic `Exception`
- Type hints đầy đủ (pyright mode=basic)
- Dùng `uv run` để chạy scripts

### ❌ DON'T (Không làm)
- `domain/` import từ `infrastructure/` hoặc `application/` — vi phạm Clean Architecture
- Hardcode prompt string trong service/controller
- Tạo object ngoài `container.py`
- Thêm LLM provider mới mà không qua interface `LLMProvider`
- Dùng `pip install` — chỉ dùng `uv add`

---

## 12. Dependencies Chính

| Package | Mục đích |
|---------|----------|
| `fastapi` | Web framework |
| `uvicorn[standard]` | ASGI server |
| `pydantic` + `pydantic-settings` | Models + config validation |
| `langchain` + `langchain-*` | LLM abstraction (OpenAI, Groq, Google) |
| `sentence-transformers` | Local embedding model |
| `weaviate-client>=4.0` | Vector DB client |
| `pypdf` | PDF text extraction |
| `langchain-text-splitters` | RecursiveCharacterTextSplitter |
| `langsmith` | Tracing + observability |
| `structlog` | Structured logging |
| `httpx` | Async HTTP client |

**Dev extras:** `ruff` (linter), `pyright` (type checker), `pytest` + `pytest-asyncio`, `ragas` (RAG evaluation)

---

## 13. Điểm Mở Rộng Thường Gặp

| Tác vụ | File cần chỉnh |
|--------|---------------|
| Đổi LLM provider | `di/container.py` → `llm_provider()` method |
| Thêm LLM provider mới | Tạo `infrastructure/llm/my_provider.py`, đăng ký trong container |
| Đổi chunking strategy | `settings.py` → `CHUNKING_STRATEGY=semantic` |
| Thêm prompt mới | `application/prompt/prompt_manager.py` |
| Thêm API endpoint | `presentation/routes/` + `presentation/controllers/` |
| Đổi embedding model | `.env` → `EMBEDDING_MODEL` + `EMBEDDING_DIMENSION` |
| Thêm document type | Tạo `infrastructure/input_processors/my_processor.py` |
| Đổi reranker model | `.env` → `RERANKER_MODEL` |

---

*Cập nhật lần cuối: 2026-05-18. Khi thay đổi kiến trúc đáng kể, hãy cập nhật file này.*
