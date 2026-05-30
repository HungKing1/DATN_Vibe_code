# AI Server — RAG Backend Overview

> **Mục đích của file này:** Đây là tài liệu context cho AI coding assistant (Vibe Code / Claude / Cursor). Đọc file này trước khi làm bất kỳ thay đổi nào trong folder `ai-server/` để hiểu kiến trúc, quy ước, và các quyết định thiết kế quan trọng.

---

## 1. Tổng Quan Hệ Thống

**`ai-server`** là một **Advanced RAG (Retrieval-Augmented Generation) Backend** được viết bằng Python, phục vụ việc tìm kiếm và trả lời câu hỏi pháp luật Việt Nam. Hệ thống đọc văn bản luật có cấu trúc từ **MongoDB**, chunking thông minh theo ranh giới Điều luật, lưu trữ vector vào Weaviate, và trả lời câu hỏi của người dùng thông qua LLM.

- **Framework:** FastAPI + Uvicorn (ASGI)
- **Python:** ≥ 3.11
- **Package manager:** `uv` (dùng `uv run` thay vì `python`)
- **Vector DB:** Weaviate — **1 collection duy nhất: `LegalChunk`** (chạy tại `http://localhost:9090`)
- **MongoDB:** Nguồn dữ liệu gốc — `legal_documents` + `legal_articles` collections
- **LLM mặc định:** Groq (`openai/gpt-oss-120b`) — có thể đổi sang Google Gemini / OpenAI qua env var
- **Embedding:** `sentence-transformers` (`all-MiniLM-L6-v2`, dim=384)
- **Observability:** LangSmith tracing (cấu hình qua `.env`)
- **Multi-Agent Framework:** LangGraph (Hỗ trợ xử lý song song nhiều Paralegal agents)

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
├── infrastructure/  # Implementations: LLM, vector DB, chunking, embedding, reranker, MongoDB reader
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
├── AI-SERVER_OVERVIEW.md         # File này — context cho AI coding
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
    │   │   ├── document.py       # LegalChunkMetadata, LegalChunk, IngestionResult
    │   │   ├── query.py          # Query, RAGResponse, Citation, RankedResult, QueryType
    │   │   ├── agent_state.py    # DeepAgentState, ResearchFinding, vv.
    │   │   └── embedding.py      # Embedding value object
    │   └── interfaces/
    │       ├── embedding_provider.py   # EmbeddingProvider ABC
    │       ├── llm_provider.py         # LLMProvider ABC (generate, generate_stream)
    │       ├── vector_repository.py    # VectorRepository ABC (CRUD Weaviate LegalChunk)
    │       ├── chunking_strategy.py    # ChunkingStrategy ABC (nhận articles + doc_meta)
    │       ├── reranker.py             # Reranker ABC
    │       ├── query_rewriter.py       # QueryRewriter ABC
    │       └── context_builder.py      # ContextBuilder ABC
    │
    ├── application/
    │   ├── agents/
    │   │   ├── master_lawyer_agent.py # Node Master Agent: Quản lý task, tổng hợp
    │   │   ├── paralegal_agent.py     # Node Paralegal Agent: Tra cứu Weaviate
    │   │   ├── agent_tools.py         # Các LangChain tools cho Agent
    │   │   └── __init__.py
    │   ├── prompt/
    │   │   └── prompt_manager.py # PromptManager — registry tập trung TẤT CẢ prompts
    │   └── services/
    │       ├── ingestion_service.py  # IngestionService — orchestrate MongoDB→Weaviate pipeline
    │       ├── query_service.py      # QueryService — extract so_ky_hieu, retrieve, rerank
    │       ├── rag_pipeline.py       # RAGPipeline — full RAG (standard + stream)
    │       └── multi_agent_service.py# MultiAgentService — Orchestrate LangGraph workflow
    │
    ├── infrastructure/
    │   ├── embeddings/
    │   │   └── sentence_transformer_provider.py  # SentenceTransformerProvider
    │   ├── llm/
    │   │   ├── google_provider.py     # GoogleGeminiProvider (langchain-google-genai)
    │   │   ├── groq_provider.py       # GroqProvider (langchain-groq)
    │   │   └── langchain_provider.py  # LangChainOpenAIProvider (default fallback)
    │   ├── vector_db/
    │   │   └── weaviate_repository.py # WeaviateRepository — single LegalChunk collection
    │   ├── chunking/
    │   │   └── legal_article_chunker.py  # LegalArticleChunker (theo ranh giới Điều luật)
    │   ├── mongodb/
    │   │   └── mongodb_legal_reader.py   # MongoDBLegalReader — đọc legal_documents + legal_articles
    │   ├── reranking/
    │   │   └── cross_encoder_reranker.py  # CrossEncoderReranker (cross-encoder/ms-marco-*)
    │   ├── multimodal/                # Placeholder (chưa implement)
    │   └── query/
    │       ├── llm_query_rewriter.py      # LLMQueryRewriter — rewrite query với LLM
    │       └── default_context_builder.py # DefaultContextBuilder — build context string
    │
    └── presentation/
        ├── controllers/
        │   ├── ingestion_controller.py  # IngestionController (MongoDB JSON ingestion)
        │   ├── query_controller.py      # QueryController (query, query_stream, query_reflect)
        │   └── agent_controller.py      # AgentController (Multi-Agent RAG)
        ├── routes/
        │   ├── health_routes.py         # GET /health
        │   ├── ingestion_routes.py      # /api/v1/ingestion/*
        │   ├── query_routes.py          # /api/v1/query/*
        │   └── agent_routes.py          # /api/v1/query/agent
        ├── schemas/
        │   ├── ingestion_schemas.py     # MongoIngestionRequest, IngestionResultDto, LawListResponse
        │   ├── query_schemas.py         # QueryRequestSchema, QueryResponseSchema
        │   └── agent_schemas.py         # AgentQueryRequest, AgentQueryResponse
        └── middlewares/
            ├── error_handler.py         # rag_backend_exception_handler
            └── logging_middleware.py    # LoggingMiddleware (request/response logging)
```

---

## 4. API Endpoints

### Ingestion (`/api/v1/ingestion`)

| Method | Path | Mô tả |
|--------|------|--------|
| `POST` | `/laws` | Ingest luật từ MongoDB theo tên (`{ten_day_du}`) |
| `POST` | `/laws/{so_ky_hieu}/reload` | Re-ingest (xóa cũ + ingest lại) từ MongoDB |
| `GET`  | `/laws` | Lấy danh sách tất cả bộ luật (distinct từ LegalChunk) |
| `DELETE` | `/laws/{so_ky_hieu}` | Xóa toàn bộ chunks của 1 bộ luật |
| `GET`  | `/collections` | Debug: list Weaviate collections |

### Query (`/api/v1/query`)

| Method | Path | Mô tả |
|--------|------|--------|
| `POST` | `/` | Standard RAG query (sync JSON hoặc SSE nếu `stream=true`) |
| `POST` | `/stream` | SSE streaming RAG query |
| `POST` | `/reflect` | Reflection RAG — tự đánh giá và cải thiện câu trả lời |
| `POST` | `/agent` | Multi-Agent RAG — dùng LangGraph chia task cho Paralegal tìm kiếm song song |

### Health

| Method | Path | Mô tả |
|--------|------|--------|
| `GET`  | `/health` | Health check |

**API Docs:** `http://localhost:8000/docs` (Swagger UI)

---

## 5. Weaviate Schema — Single Collection: `LegalChunk`

Hệ thống chỉ dùng **1 Weaviate collection** (được khởi tạo tự động khi startup):

```
LegalChunk collection
─────────────────────────────────────────────────────
# Core
content          : TEXT     — raw content Điều (LLM đọc cái này)
chunk_index      : INT

# Law identity (filter chính theo so_ky_hieu)
so_ky_hieu       : TEXT     — "91/2015/QH13" — key lọc chính
ten_day_du       : TEXT     — "Dân sự" — hiển thị cho user
loai_van_ban     : TEXT     — "Bộ luật" | "Luật" | ...
mongo_doc_id     : TEXT     — ObjectId từ legal_documents (trace)

# Article info
dieu_numbers     : INT[]    — [27] hoặc [27, 28] nếu merged
ten_dieu         : TEXT     — tên Điều đầu tiên
article_mongo_ids: TEXT[]   — ObjectId[] từ legal_articles (trace)

# Split tracking
is_split         : BOOL     — True nếu Điều bị chia nhỏ do quá dài
split_part       : INT      — 1-indexed (phần thứ mấy)
split_total      : INT
is_merged        : BOOL     — True nếu gộp nhiều Điều ngắn

# Vector
vector[384]                 — embedding của embedding_text (prefix + content)
```

> **Quan trọng:** Không còn collection `Law` hay `LawChunk` nữa. `so_ky_hieu` là key định danh chính thay vì `law_uuid`.

> **Trước khi dùng schema mới:** Phải drop collections cũ nếu còn tồn tại:
> ```python
> client.collections.delete("Law")
> client.collections.delete("LawChunk")
> ```

---

## 6. Ingestion Pipeline (MongoDB → Weaviate)

```
Nhận ten_day_du (VD: "Bộ luật Dân sự")
    │
    ▼
MongoDBLegalReader.find_by_name(ten_day_du)
    → Tìm regex (case-insensitive) trong legal_documents
    → doc_meta: { so_ky_hieu, ten_day_du, loai_van_ban, _id, ... }
    │
    ▼
MongoDBLegalReader.get_articles(so_ky_hieu)
    → Lấy tất cả legal_articles theo document_id, sorted by dieu
    │
    ▼
LegalArticleChunker.chunk(articles, doc_meta)
    ① Đo size = token_count(content) — KHÔNG tính prefix
    ② size < 300 → merge với Điều tiếp (cùng chương, tổng ≤ 600)
    ③ 300 ≤ size ≤ 600 → 1 chunk
    ④ size > 600 → split theo khoản (is_split=True)
    ⑤ SAU KHI xong → build embedding_text = prefix + content
       prefix = "{loai_van_ban} {so_ky_hieu}: {ten_day_du}. {path hierarchy}"
    │
    ▼
EmbeddingProvider.embed_batch([chunk.legal.embedding_text ...])
    → SentenceTransformer (all-MiniLM-L6-v2, dim=384)
    │
    ▼
WeaviateRepository.store_legal_chunks(chunks)
    → Lưu vào LegalChunk collection (không còn Law collection, không cross-reference)
```

---

## 7. Query Pipeline (RAGPipeline)

```
User Query
    │
    ▼
LLMQueryRewriter.rewrite()      [LLM] (optional, use_rewrite=True)
    → query được viết lại cho retrieval tốt hơn
    │
    ▼
QueryService._extract_so_ky_hieu(query)
    → Regex extract "XX/YYYY/QHZZ" từ query nếu có
    → None nếu không tìm thấy → global search trên tất cả chunks
    │
    ▼
EmbeddingProvider.embed_text(query)
    │
    ▼
WeaviateRepository.hybrid_search(query, vector, so_ky_hieu=...)
    → Weaviate hybrid search (BM25 + vector, alpha=0.5)
    → Filter by so_ky_hieu nếu có, global nếu không
    → top_k=20 results
    │
    ▼
QueryService._expand_split_chunks(results)
    → Nếu chunk is_split=True → fetch đủ parts → merge content
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

## 7.5. Multi-Agent Pipeline (LangGraph)

Hệ thống xử lý câu hỏi phức tạp (cần đối chiếu nhiều bộ luật) sử dụng LangGraph để điều phối các agents qua API `/api/v1/query/agent`:

```text
User Query
    │
    ▼
MasterLawyerAgent (Node)
    │   ├── Phân tích câu hỏi
    │   ├── Gọi `write_todos()`
    │   └── Gọi `delegate_task()` cho từng vấn đề pháp lý
    │
    ▼ (Send API - Parallel Execution)
ParalegalAgent(s) (Node)
    │   ├── Gọi `search_law_database()` (Hybrid Search: BM25 + Vector trên LegalChunk)
    │   ├── Gọi `think_tool()` tự đánh giá kết quả
    │   └── Trích xuất *NGUYÊN VĂN* điều luật đẩy vào State
    │
    ▼
MasterLawyerAgent (Node)
    │   ├── Gọi `read_research_findings()`
    │   └── Tổng hợp và viết câu trả lời cuối (dựa trên raw text)
    │
    ▼
AgentQueryResponse
```

---

## 8. Domain Models (`domain/models/document.py`)

```python
class LegalChunkMetadata(BaseModel):
    # Nhận dạng văn bản
    so_ky_hieu: str          # "91/2015/QH13"
    ten_day_du: str          # "Dân sự"
    loai_van_ban: str        # "Bộ luật" | "Luật" | ...
    mongo_doc_id: str        # ObjectId từ legal_documents

    # Thông tin Điều
    dieu_numbers: list[int]       # [27] hoặc [27, 28] nếu merged
    ten_dieu: str                 # tên Điều đầu tiên
    article_mongo_ids: list[str]  # ObjectId[] từ legal_articles

    # Split tracking
    is_split: bool = False
    split_part: int | None = None
    split_total: int | None = None
    is_merged: bool = False

    # Embedding text (build bởi chunker, dùng để embed — KHÔNG lưu path_*)
    embedding_text: str = ""

class LegalChunk(BaseModel):
    id: UUID
    content: str           # raw content Điều (LLM đọc)
    chunk_index: int
    legal: LegalChunkMetadata
    embedding: list[float] | None = None
    token_count: int | None = None

class IngestionResult(BaseModel):
    so_ky_hieu: str
    ten_day_du: str
    chunks_stored: int
    success: bool = True
    error_message: str | None = None
```

> **Lưu ý:** `path_phan/chuong/muc/tieu_muc` **KHÔNG lưu** vào metadata Weaviate. Chúng chỉ dùng tạm trong `LegalArticleChunker` để build `embedding_text` prefix.

---

## 9. Dependency Injection (Container)

File `di/container.py` là **Composition Root duy nhất**. Mọi object đều được tạo ở đây theo pattern lazy singleton:

| Method | Return type | Mô tả |
|--------|------------|-------|
| `embedding_provider()` | `SentenceTransformerProvider` | Local embedding |
| `vector_repository()` | `WeaviateRepository` | Weaviate client |
| `llm_provider()` | `GoogleGeminiProvider` / `GroqProvider` / `LangChainOpenAIProvider` | Auto-select từ env |
| `chunking_strategy()` | `LegalArticleChunker` | Chunker theo Điều luật |
| `mongo_reader()` | `MongoDBLegalReader` | Đọc MongoDB |
| `reranker()` | `CrossEncoderReranker` | Cross-encoder reranker |
| `query_rewriter()` | `LLMQueryRewriter` | LLM query rewriter |
| `context_builder()` | `DefaultContextBuilder` | Context string builder |
| `ingestion_service()` | `IngestionService` | Orchestrate ingestion |
| `query_service()` | `QueryService` | Orchestrate query |
| `rag_pipeline()` | `RAGPipeline` | Full RAG pipeline |

---

## 10. PromptManager — Quản Lý Tập Trung Prompts

**KHÔNG được hardcode prompt ở bất kỳ đâu khác.** Tất cả prompts phải qua `PromptManager`.

| Template Key | Dùng cho |
|---|---|
| `rag_system` | System prompt cho RAG generation |
| `rag_user` | User prompt với context + query |
| `evaluation` | LLM-as-Judge đánh giá câu trả lời |
| `reflection` | Reflection agent quyết định corrective action |
| `rewrite_system` | LLM rewrite query cho retrieval |
| `classify_system` | LLM classify query type |
| `master_lawyer_system` | System prompt cho Master Lawyer Agent |
| `paralegal_system` | System prompt cho Paralegal Agent |

> **Đã xóa:** `generate_law_header`, `update_law_description`, `route_query_system` — không còn LLM routing.

---

## 11. Cấu Hình (.env)

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

# MongoDB (nguồn dữ liệu gốc)
MONGODB_URL=mongodb://localhost:27017
MONGODB_DB_NAME=legal_db

# Chunking (token-based)
CHUNK_MIN_TOKENS=300
CHUNK_MAX_TOKENS=600

# Retrieval
RETRIEVAL_TOP_K=20
HYBRID_SEARCH_ALPHA=0.5         # 0=BM25 only, 1=vector only

# Observability
LANGCHAIN_TRACING_V2=true
LANGCHAIN_API_KEY=...
LANGCHAIN_PROJECT=rag_backend_dev
```

---

## 12. Quy Ước Code

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
- Upload/xử lý PDF — hệ thống chỉ đọc từ MongoDB
- Tạo thêm Law collection trong Weaviate — chỉ dùng LegalChunk
- Dùng `law_uuid` — đã thay bằng `so_ky_hieu`
- Dùng `pip install` — chỉ dùng `uv add`

---

## 13. Dependencies Chính

| Package | Mục đích |
|---------|----------|
| `fastapi` | Web framework |
| `uvicorn[standard]` | ASGI server |
| `pydantic` + `pydantic-settings` | Models + config validation |
| `langchain` + `langchain-*` | LLM abstraction (OpenAI, Groq, Google) |
| `sentence-transformers` | Local embedding model |
| `weaviate-client>=4.0` | Vector DB client |
| `motor` | Async MongoDB client (Motor AsyncIO) |
| `pymongo` | MongoDB driver |
| `langgraph` | Multi-Agent Orchestration (StateGraph, Parallel nodes) |
| `langsmith` | Tracing + observability |
| `structlog` | Structured logging |
| `httpx` | Async HTTP client |

**Dev extras:** `ruff` (linter), `pyright` (type checker), `pytest` + `pytest-asyncio`, `ragas` (RAG evaluation)

> **Đã xóa:** `pypdf`, `langchain-text-splitters` — không còn xử lý PDF.

---

## 14. Điểm Mở Rộng Thường Gặp

| Tác vụ | File cần chỉnh |
|--------|---------------|
| Đổi LLM provider | `di/container.py` → `llm_provider()` method |
| Thêm LLM provider mới | Tạo `infrastructure/llm/my_provider.py`, đăng ký trong container |
| Thay đổi chunking logic | `infrastructure/chunking/legal_article_chunker.py` |
| Thêm prompt mới | `application/prompt/prompt_manager.py` |
| Thêm API endpoint | `presentation/routes/` + `presentation/controllers/` |
| Đổi embedding model | `.env` → `EMBEDDING_MODEL` + `EMBEDDING_DIMENSION` |
| Thêm MongoDB collection | `infrastructure/mongodb/mongodb_legal_reader.py` |
| Đổi reranker model | `.env` → `RERANKER_MODEL` |
| Đổi ngưỡng chunking | `.env` → `CHUNK_MIN_TOKENS` + `CHUNK_MAX_TOKENS` |

---

*Cập nhật lần cuối: 2026-05-29. Refactored từ PDF-based pipeline sang MongoDB JSON ingestion với Single Collection LegalChunk architecture.*
