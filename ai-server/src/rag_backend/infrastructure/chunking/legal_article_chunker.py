"""Legal Article Chunking Strategy."""

from __future__ import annotations

import logging
import re
from uuid import uuid4

from rag_backend.domain.interfaces.chunking_strategy import ChunkingStrategy
from rag_backend.domain.models.document import LegalChunk, LegalChunkMetadata

logger = logging.getLogger(__name__)


class LegalArticleChunker(ChunkingStrategy):
    """Chunking strategy based on legal document structure.
    
    Rules:
    - Target tokens: 300 - 600
    - If article < 300 tokens: merge with next article (if same chapter and total < 600)
    - If article > 600 tokens: split by clauses (1., 2., 3.)
    - Otherwise, keep as 1 chunk.
    """

    def __init__(self, min_tokens: int = 300, max_tokens: int = 600) -> None:
        self.MIN_TOKENS = min_tokens
        self.MAX_TOKENS = max_tokens

    def get_strategy_name(self) -> str:
        return "legal_article"

    def _count_tokens(self, text: str) -> int:
        """Naive token approximation (words)."""
        return len(text.split())

    async def chunk(
        self,
        articles: list[dict],
        doc_meta: dict,
    ) -> list[LegalChunk]:
        """Chunk articles into LegalChunks."""
        chunks: list[LegalChunk] = []
        i = 0
        while i < len(articles):
            art = articles[i]
            # Replace missing content or handle edge cases
            content = art.get("content", "")
            if not content:
                i += 1
                continue

            # Token count WITHOUT prefix
            size = self._count_tokens(content)

            if size > self.MAX_TOKENS:
                # CASE 3: Article is too long, split by clauses
                sub_chunks = self._split_by_khoan(art, doc_meta, base_index=len(chunks))
                chunks.extend(sub_chunks)
                i += 1
            elif size < self.MIN_TOKENS:
                # CASE 2: Article is too short, try to merge
                merged_chunk, consumed = self._try_merge(
                    articles, i, doc_meta, base_index=len(chunks)
                )
                chunks.append(merged_chunk)
                i += consumed
            else:
                # CASE 1: Article is within target size
                chunk = self._make_single_chunk(art, doc_meta, chunk_index=len(chunks))
                chunks.append(chunk)
                i += 1

        # Post-process: add embedding_text
        # We need to map chunks back to their primary article to get the path
        # Since chunk.legal.article_mongo_ids[0] is the primary article id,
        # we can just find that article or pass it during creation. 
        # For simplicity, we just look it up.
        for chunk in chunks:
            primary_id = chunk.legal.article_mongo_ids[0]
            primary_art = next((a for a in articles if str(a.get("_id", "")) == primary_id), {})
            prefix = self._build_prefix(primary_art, doc_meta)
            chunk.legal.embedding_text = f"{prefix}{chunk.content}"

        logger.info(
            "Chunked %d articles into %d chunks (strategy=legal_article)",
            len(articles),
            len(chunks),
        )
        return chunks

    def _make_single_chunk(self, art: dict, doc_meta: dict, chunk_index: int) -> LegalChunk:
        """Create a LegalChunk for a single article."""
        legal_meta = LegalChunkMetadata(
            so_ky_hieu=doc_meta.get("so_ky_hieu", ""),
            ten_day_du=doc_meta.get("ten_day_du", ""),
            loai_van_ban=doc_meta.get("loai_van_ban", ""),
            mongo_doc_id=str(doc_meta.get("_id", "")),
            dieu_numbers=[art.get("dieu", 0)],
            ten_dieu=art.get("ten_dieu", ""),
            article_mongo_ids=[str(art.get("_id", ""))],
        )
        return LegalChunk(
            content=art.get("content", ""),
            chunk_index=chunk_index,
            legal=legal_meta,
            token_count=self._count_tokens(art.get("content", "")),
        )

    def _try_merge(
        self, articles: list[dict], start_idx: int, doc_meta: dict, base_index: int
    ) -> tuple[LegalChunk, int]:
        """Merge short articles."""
        base_art = articles[start_idx]
        base_path = base_art.get("path", {}).get("chuong", "")
        
        merged_content = base_art.get("content", "")
        dieu_numbers = [base_art.get("dieu", 0)]
        article_mongo_ids = [str(base_art.get("_id", ""))]
        
        i = start_idx + 1
        while i < len(articles):
            next_art = articles[i]
            next_path = next_art.get("path", {}).get("chuong", "")
            # Only merge if same chapter
            if next_path != base_path:
                break
            
            next_content = next_art.get("content", "")
            next_size = self._count_tokens(next_content)
            current_size = self._count_tokens(merged_content)
            
            # Stop if merging would exceed max tokens
            if current_size + next_size > self.MAX_TOKENS:
                break
                
            merged_content += f"\n\n{next_content}"
            dieu_numbers.append(next_art.get("dieu", 0))
            article_mongo_ids.append(str(next_art.get("_id", "")))
            i += 1
            
        legal_meta = LegalChunkMetadata(
            so_ky_hieu=doc_meta.get("so_ky_hieu", ""),
            ten_day_du=doc_meta.get("ten_day_du", ""),
            loai_van_ban=doc_meta.get("loai_van_ban", ""),
            mongo_doc_id=str(doc_meta.get("_id", "")),
            dieu_numbers=dieu_numbers,
            ten_dieu=base_art.get("ten_dieu", ""), # Use first article's name
            article_mongo_ids=article_mongo_ids,
            is_merged=(len(dieu_numbers) > 1),
        )
        
        chunk = LegalChunk(
            content=merged_content,
            chunk_index=base_index,
            legal=legal_meta,
            token_count=self._count_tokens(merged_content),
        )
        
        return chunk, (i - start_idx)

    def _split_by_khoan(self, art: dict, doc_meta: dict, base_index: int) -> list[LegalChunk]:
        """Split a long article by clauses (khoản)."""
        content = art.get("content", "")
        # Basic split by clause numbers like "1. ", "2. ", "3. " at the start of a line
        parts = re.split(r"(?=\n\d+\.\s)", f"\n{content}")
        
        # Filter empty parts and clean up
        parts = [p.strip() for p in parts if p.strip()]
        
        if not parts:
            parts = [content]

        # If regex didn't split well or we still have a single part
        if len(parts) == 1:
            # Fallback to naive chunking if needed, but for now we just keep it
            pass

        chunks = []
        for j, part in enumerate(parts):
            legal_meta = LegalChunkMetadata(
                so_ky_hieu=doc_meta.get("so_ky_hieu", ""),
                ten_day_du=doc_meta.get("ten_day_du", ""),
                loai_van_ban=doc_meta.get("loai_van_ban", ""),
                mongo_doc_id=str(doc_meta.get("_id", "")),
                dieu_numbers=[art.get("dieu", 0)],
                ten_dieu=art.get("ten_dieu", ""),
                article_mongo_ids=[str(art.get("_id", ""))],
                is_split=True,
                split_part=j + 1,
                split_total=len(parts),
            )
            
            chunk = LegalChunk(
                content=part,
                chunk_index=base_index + j,
                legal=legal_meta,
                token_count=self._count_tokens(part),
            )
            chunks.append(chunk)
            
        return chunks

    def _build_prefix(self, article: dict, doc_meta: dict) -> str:
        """Build prefix from path_* of article (not stored in metadata)."""
        parts = [f"{doc_meta.get('loai_van_ban', '')} {doc_meta.get('so_ky_hieu', '')}: {doc_meta.get('ten_day_du', '')}."]
        path = article.get("path", {}) or {}
        path_parts = [v for v in [
            path.get("phan"), path.get("chuong"),
            path.get("muc"), path.get("tieu_muc"),
        ] if v]
        if path_parts:
            parts.append(" | ".join(path_parts) + ".")
        return " ".join(parts) + " "
