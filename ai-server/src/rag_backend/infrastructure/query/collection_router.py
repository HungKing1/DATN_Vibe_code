"""Collection Router — routes queries to the correct legal collection.

Uses contextual headers (LLM-generated title + description) to match
user queries against available collections. This avoids searching ALL
collections and focuses on the most relevant one(s).
"""

from __future__ import annotations

import json
import logging
import re

from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.interfaces.llm_provider import LLMProvider
from rag_backend.domain.models.collection_registry import CollectionInfo, CollectionRegistry

logger = logging.getLogger(__name__)

# --- Prompts ---

GENERATE_HEADER_PROMPT = """Bạn là chuyên gia pháp luật Việt Nam. 
Dựa vào 1000 kí tự đầu tiên của văn bản pháp luật dưới đây, hãy tạo Contextual Chunk Headers (CCH) để phân loại tài liệu.
TRẢ VỀ ĐÚNG FORMAT JSON SAU, TUYỆT ĐỐI KHÔNG BAO BỌC BẰNG MARKDOWN (như ```json):

{{
  "title": "Tên văn bản ngắn gọn (ví dụ: Nghị định về Giám định tư pháp)",
  "description": "Mô tả ngắn 2-3 câu về nội dung chính của phần văn bản này",
  "keywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3"],
  "collection_name": "ten_viet_tat_khong_dau_co_gach_duoi"
}}

CHỈ trả về một block JSON duy nhất. Không giải thích thêm.

--- 1000 kí tự trích xuất ---
{text_excerpt}"""

ROUTE_QUERY_PROMPT = """Bạn là hệ thống phân loại câu hỏi pháp luật.
Dưới đây là danh sách các bộ luật có sẵn:

{collections_list}

Câu hỏi của người dùng: "{query}"

Hãy chọn bộ luật phù hợp nhất để trả lời câu hỏi này.
Trả về CHỈ tên collection_name, không giải thích.
Nếu câu hỏi liên quan đến nhiều bộ luật, trả về các collection_name cách nhau bằng dấu phẩy."""


class CollectionRouter:
    """Routes queries to the correct collection(s) based on contextual headers.

    Two routing strategies:
    1. Embedding similarity — compare query embedding vs collection title embeddings
    2. LLM classification — ask LLM to pick the best collection

    Strategy 1 is faster (no LLM call), Strategy 2 is more accurate.
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
        embedding_provider: EmbeddingProvider,
        registry: CollectionRegistry,
        similarity_threshold: float = 0.3,
    ) -> None:
        self._llm = llm_provider
        self._embeddings = embedding_provider
        self._registry = registry
        self._similarity_threshold = similarity_threshold

    @property
    def registry(self) -> CollectionRegistry:
        """Access the collection registry."""
        return self._registry

    # ────────────────────────────────────────────
    # INGESTION: Generate contextual header
    # ────────────────────────────────────────────

    async def generate_collection_header(
        self,
        document_text: str,
        excerpt_length: int = 1000,
    ) -> CollectionInfo:
        """Send the first N chars of a document to LLM to generate a contextual header.

        Args:
            document_text: Full text of the legal document.
            excerpt_length: How many characters from the beginning to send to LLM.

        Returns:
            CollectionInfo with LLM-generated title, description, keywords.
        """
        excerpt = document_text[:excerpt_length]

        prompt = GENERATE_HEADER_PROMPT.format(text_excerpt=excerpt)

        result = await self._llm.generate(
            prompt=prompt,
            temperature=0.0,
            max_tokens=500,
        )

        # Parse LLM response as JSON
        try:
            response_text = result.text.strip()
            # Find JSON boundaries to safely extract ignoring markdown fences
            start = response_text.find("{")
            end = response_text.rfind("}")
            if start != -1 and end != -1:
                response_text = response_text[start : end + 1]

            data = json.loads(response_text)
        except json.JSONDecodeError:
            logger.warning("LLM returned non-JSON, using fallback parsing")
            data = {
                "title": result.text[:100],
                "description": result.text[:300],
                "keywords": [],
                "collection_name": "unknown_collection",
            }

        # Embed the title + description for similarity matching
        combined_text = f"{data['title']}. {data['description']}. {', '.join(data.get('keywords', []))}"
        title_embedding = await self._embeddings.embed_text(combined_text)

        info = CollectionInfo(
            collection_name=data.get("collection_name", "unknown"),
            title=data["title"],
            description=data["description"],
            keywords=data.get("keywords", []),
            title_embedding=title_embedding,
        )

        logger.info(
            "Generated collection header: '%s' → collection '%s'",
            info.title,
            info.collection_name,
        )

        return info

    # ────────────────────────────────────────────
    # QUERY: Route to correct collection
    # ────────────────────────────────────────────

    async def route_by_embedding(
        self,
        query: str,
        top_k: int = 1,
    ) -> list[CollectionInfo]:
        """Route a query using embedding similarity (FAST, no LLM call).

        Compares query embedding against pre-computed title embeddings.
        """
        collections = self._registry.list_all()
        if not collections:
            return []

        query_embedding = await self._embeddings.embed_text(query)

        # Score each collection
        scored: list[tuple[float, CollectionInfo]] = []
        for info in collections:
            if not info.title_embedding:
                continue
            similarity = self._cosine_similarity(query_embedding, info.title_embedding)
            scored.append((similarity, info))

        # Sort by similarity descending
        scored.sort(key=lambda x: x[0], reverse=True)

        # Filter by threshold and return top_k
        results = [
            info for score, info in scored[:top_k]
            if score >= self._similarity_threshold
        ]

        if results:
            logger.info(
                "Routed query to: %s (score=%.3f)",
                results[0].collection_name,
                scored[0][0],
            )
        else:
            logger.warning("No collection matched query: '%s'", query[:50])

        return results

    async def route_by_llm(
        self,
        query: str,
    ) -> list[CollectionInfo]:
        """Route a query using LLM classification (ACCURATE, slower).

        Sends the query + all collection descriptions to LLM to pick the best match.
        """
        collections = self._registry.list_all()
        if not collections:
            return []

        # Build collection list for prompt
        collections_list = "\n".join(
            f"- {info.collection_name}: {info.title} — {info.description}"
            for info in collections
        )

        prompt = ROUTE_QUERY_PROMPT.format(
            collections_list=collections_list,
            query=query,
        )

        result = await self._llm.generate(
            prompt=prompt,
            temperature=0.0,
            max_tokens=100,
        )

        # Parse response — may contain multiple collection names
        selected_names = [
            name.strip()
            for name in result.text.strip().split(",")
        ]

        matched = [
            info for info in collections
            if info.collection_name in selected_names
        ]

        logger.info(
            "LLM routed query to: %s",
            [m.collection_name for m in matched],
        )

        return matched

    @staticmethod
    def _cosine_similarity(a: list[float], b: list[float]) -> float:
        """Compute cosine similarity between two vectors."""
        dot_product = sum(x * y for x, y in zip(a, b))
        norm_a = sum(x * x for x in a) ** 0.5
        norm_b = sum(x * x for x in b) ** 0.5
        if norm_a == 0 or norm_b == 0:
            return 0.0
        return dot_product / (norm_a * norm_b)
