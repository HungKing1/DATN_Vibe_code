"""Collection Router — routes queries to the correct legal law collection.

Uses LLM to:
1. Generate Law metadata (title, description, keywords) from document excerpts.
2. Update Law description when a new file is added.
3. Route a user query to exactly 1 Law UUID (out-of-domain → OutOfDomainError).
"""

from __future__ import annotations

import json
import logging

from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.interfaces.llm_provider import LLMProvider

logger = logging.getLogger(__name__)

from rag_backend.application.prompt.prompt_manager import PromptManager
class CollectionRouter:
    """Routes queries to the correct Law collection using LLM.

    Responsibilities:
    - generate_law_header: LLM tạo metadata từ excerpt nhiều file
    - update_law_description: LLM cập nhật description khi thêm file mới
    - route_query: LLM chọn 1 law_uuid từ danh sách Laws trong Weaviate
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
        embedding_provider: EmbeddingProvider,
        prompt_manager: PromptManager,
    ) -> None:
        self._llm = llm_provider
        self._embeddings = embedding_provider
        self._prompts = prompt_manager

    # ────────────────────────────────────────────
    # INGESTION: Generate Law header (nhiều file)
    # ────────────────────────────────────────────

    async def generate_law_header(
        self,
        file_excerpts: dict[str, str],
        excerpt_length: int = 1000,
    ) -> dict:
        """Gửi excerpt đầu của nhiều file lên LLM → sinh title, description, keywords.

        Args:
            file_excerpts: {filename: content_excerpt} — 1 hoặc nhiều file.
            excerpt_length: Số ký tự lấy từ đầu mỗi file.

        Returns:
            dict with keys: title, description, keywords (list[str])
        """
        # Format excerpts
        parts = []
        for i, (filename, content) in enumerate(file_excerpts.items(), 1):
            excerpt = content[:excerpt_length]
            parts.append(f"--- Văn bản {i}: {filename} ---\n{excerpt}")
        excerpts_text = "\n\n".join(parts)

        prompt = self._prompts.get_prompt("generate_law_header", excerpts=excerpts_text)

        result = await self._llm.generate(
            prompt=prompt,
            temperature=0.0,
            max_tokens=600,
        )

        return self._parse_json_response(result.text, fallback_title="Văn bản pháp luật")

    # ────────────────────────────────────────────
    # INGESTION: Update description (thêm file mới)
    # ────────────────────────────────────────────

    async def update_law_description(
        self,
        law_title: str,
        old_description: str,
        new_filename: str,
        new_content: str,
        excerpt_length: int = 1000,
    ) -> dict:
        """Cập nhật description khi thêm file mới vào Law đã có.

        Returns:
            dict with keys: description (str), keywords (list[str])
        """
        new_excerpt = new_content[:excerpt_length]

        prompt = self._prompts.get_prompt(
            "update_law_description",
            law_title=law_title,
            old_description=old_description,
            new_filename=new_filename,
            new_excerpt=new_excerpt,
        )

        result = await self._llm.generate(
            prompt=prompt,
            temperature=0.0,
            max_tokens=500,
        )

        return self._parse_json_response(result.text, fallback_title=law_title)

    # ────────────────────────────────────────────
    # QUERY: Route query → 1 law_uuid
    # ────────────────────────────────────────────

    async def route_query(
        self,
        query: str,
        all_laws: list[dict],
    ) -> str:
        """LLM chọn 1 law_uuid phù hợp nhất với câu hỏi.

        Args:
            query: Câu hỏi của người dùng.
            all_laws: Danh sách laws từ Weaviate [{law_uuid, title, description}].

        Returns:
            law_uuid của Law được chọn.

        Raises:
            OutOfDomainError: Nếu LLM trả về OUT_OF_DOMAIN hoặc UUID không hợp lệ.
        """
        from rag_backend.domain.exceptions import OutOfDomainError

        if not all_laws:
            raise OutOfDomainError([])

        valid_uuids = {law["law_uuid"] for law in all_laws}

        law_list = "\n".join(
            f"- law_uuid: {law['law_uuid']}\n"
            f"  title: {law['title']}\n"
            f"  description: {law['description']}"
            for law in all_laws
        )

        system_prompt = self._prompts.get_prompt("route_query_system", law_list=law_list)

        result = await self._llm.generate(
            prompt=query,
            system_prompt=system_prompt,
            temperature=0.0,
            max_tokens=200,
        )

        text = result.text.strip()
        selected = "OUT_OF_DOMAIN"
        
        try:
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                json_str = text[start : end + 1]
                data = json.loads(json_str)
                selected = data.get("law_uuid", "OUT_OF_DOMAIN").strip()
            else:
                # Fallback: if it returns just raw string
                if text in valid_uuids or text == "OUT_OF_DOMAIN":
                    selected = text
        except Exception:
            logger.warning("Failed to parse LLM router response as JSON: %s", text)

        if selected == "OUT_OF_DOMAIN" or selected not in valid_uuids:
            logger.warning(
                "Query '%s' out of domain. LLM returned: '%s' -> Proceeding with Global Search (None)", 
                query[:60], text
            )
            return None  # Không ném lỗi nữa, trả về None để tìm kiếm trên tất cả các luật

        logger.info("Routed query to law_uuid=%s", selected)
        return selected

    # ────────────────────────────────────────────
    # Helpers
    # ────────────────────────────────────────────

    @staticmethod
    def _parse_json_response(text: str, fallback_title: str = "Unknown") -> dict:
        """Parse LLM JSON response, with fallback on failure."""
        try:
            text = text.strip()
            start = text.find("{")
            end = text.rfind("}")
            if start != -1 and end != -1:
                text = text[start: end + 1]
            return json.loads(text)
        except json.JSONDecodeError:
            logger.warning("LLM returned non-JSON, using fallback")
            return {
                "title":       fallback_title,
                "description": text[:300],
                "keywords":    [],
            }
