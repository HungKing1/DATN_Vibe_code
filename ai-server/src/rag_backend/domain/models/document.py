"""Legal domain models — replaces generic document models."""

from __future__ import annotations
from uuid import UUID, uuid4
from pydantic import BaseModel, Field


class LegalChunkMetadata(BaseModel):
    """Metadata của 1 chunk pháp lý.

    Lưu ý: path_phan/chuong/muc/tieu_muc KHÔNG lưu ở đây.
    Chúng chỉ dùng tạm trong LegalArticleChunker để build
    embedding_text prefix, sau đó bỏ đi.
    """

    # — Nhận dạng văn bản —
    so_ky_hieu: str          # "91/2015/QH13" — filter chính trong Weaviate
    ten_day_du: str          # "Dân sự" — hiển thị cho user
    loai_van_ban: str        # "Bộ luật" | "Luật" | ...
    mongo_doc_id: str        # ObjectId từ legal_documents (trace về nguồn)

    # — Thông tin Điều —
    dieu_numbers: list[int]       # [27] hoặc [27, 28] nếu merged
    ten_dieu: str                 # tên Điều đầu tiên trong chunk
    article_mongo_ids: list[str]  # ObjectId[] từ legal_articles (trace)

    # — Split tracking —
    is_split: bool = False        # True nếu Điều bị chia nhỏ do quá dài
    split_part: int | None = None # 1-indexed phần thứ mấy
    split_total: int | None = None
    is_merged: bool = False       # True nếu gộp nhiều Điều ngắn

    # — Embedding —
    embedding_text: str = ""      # "Bộ luật ... Phần... Chương... Điều..." + content
                                  # Build bởi LegalArticleChunker, dùng để embed


class LegalChunk(BaseModel):
    """Unit duy nhất lưu vào Weaviate LegalChunk collection."""

    id: UUID = Field(default_factory=uuid4)
    content: str                  # raw content Điều (LLM đọc cái này)
    chunk_index: int
    legal: LegalChunkMetadata     # trực tiếp, không wrapper
    embedding: list[float] | None = None
    token_count: int | None = None


class IngestionResult(BaseModel):
    """Kết quả ingestion 1 văn bản luật."""

    so_ky_hieu: str
    ten_day_du: str
    chunks_stored: int
    success: bool = True
    error_message: str | None = None
