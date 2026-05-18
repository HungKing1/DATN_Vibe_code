"""Prompt management — prompt templates for RAG system."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class PromptManager:
    """Manages prompt templates with variable substitution.

    Provides a central registry for all prompt templates used in the RAG pipeline.
    """

    # --- Default Prompt Templates ---

    RAG_SYSTEM_PROMPT = """You are a knowledgeable AI assistant. Answer the user's question
based ONLY on the provided context. If the context doesn't contain enough
information to answer, say so clearly. Always cite your sources.

Guidelines:
- Be precise and factual
- Reference specific sources using [Source N] notation
- If uncertain, acknowledge the limitation
- Structure your response clearly"""

    RAG_USER_PROMPT = """Context:
{context}

---

Question: {query}

Please provide a comprehensive answer based on the context above. Cite sources using [Source N] notation."""

    EVALUATION_PROMPT = """You are an evaluator for a Retrieval-Augmented Generation (RAG) system.

Evaluate the answer using these criteria:

- groundedness (0–1): Is the answer fully grounded in the retrieved context? 1 = every claim is supported.
- relevance (0–1): Does the answer directly and completely address the user question? 1 = perfectly relevant.
- citations_matched (0–1): Are the cited sources correct and aligned with the context used? 1 = all citations accurate.

Question:
{question}

Context:
{context}

Answer:
{answer}

Return ONLY a JSON object (no markdown, no extra text):
{{"groundedness": ..., "relevance": ..., "citations_matched": ..., "reasoning": "..."}}"""

    REFLECTION_PROMPT = """You are a reflection agent in a RAG system. Your job is to analyse evaluation metrics and decide how to improve the answer.

Question:
{question}

Answer:
{answer}

Context:
{context}

Evaluation Metrics:
{evaluation}

Rules for deciding the action:
- If relevance is low → REWRITE_QUERY (provide an improved_query)
- If groundedness is low → SEARCH_MORE or REGENERATE
- If citations_matched is low → SEARCH_MORE
- If answer is too short (length_score low) → REGENERATE
- If latency is too high (latency_score low) → STOP to avoid further delay
- If metrics are acceptable → STOP

Allowed actions: REWRITE_QUERY, SEARCH_MORE, REGENERATE, STOP

Return ONLY a JSON object (no markdown, no extra text):
{{"action": "...", "improved_query": "...", "new_top_k": ..., "reasoning": "..."}}

If action is not REWRITE_QUERY, set improved_query to null.
If action is not SEARCH_MORE, set new_top_k to null."""

    GENERATE_LAW_HEADER_PROMPT = """Bạn là chuyên gia pháp luật Việt Nam.
Dưới đây là đoạn trích đầu của các văn bản thuộc cùng 1 bộ luật:

{excerpts}

Hãy tổng hợp và tạo metadata cho bộ luật này.
TRẢ VỀ ĐÚNG FORMAT JSON SAU, TUYỆT ĐỐI KHÔNG BAO BỌC BẰNG MARKDOWN (như ```json):

{{
  "title": "Tên ngắn gọn đại diện cho toàn bộ văn bản (ví dụ: Luật Giao thông Đường bộ)",
  "description": "Mô tả 3-4 câu về nội dung chính, phạm vi áp dụng và đối tượng điều chỉnh",
  "keywords": ["từ khóa 1", "từ khóa 2", "từ khóa 3", "từ khóa 4", "từ khóa 5"]
}}

CHỈ trả về một block JSON duy nhất. Không giải thích thêm."""

    UPDATE_LAW_DESCRIPTION_PROMPT = """Bạn là chuyên gia pháp luật Việt Nam.
Bộ luật "{law_title}" hiện có mô tả sau:

{old_description}

Một văn bản mới được bổ sung vào bộ luật này:
--- Văn bản mới: {new_filename} ---
{new_excerpt}

Hãy CẬP NHẬT mô tả để bao gồm nội dung của văn bản mới.
Giữ nguyên phần mô tả cũ còn phù hợp, chỉ bổ sung thông tin mới.
TRẢ VỀ ĐÚNG FORMAT JSON SAU, KHÔNG BAO BỌC BẰNG MARKDOWN:

{{
  "description": "mô tả đã cập nhật (3-4 câu)",
  "keywords": ["danh sách keywords đã cập nhật (5-7 từ khóa)"]
}}

CHỈ trả về một block JSON duy nhất. Không giải thích thêm."""

    ROUTE_QUERY_SYSTEM_PROMPT = """Bạn là trợ lý AI chuyên phân loại câu hỏi pháp luật.
Dưới đây là danh sách các bộ luật hiện có trong hệ thống:

{law_list}

Nhiệm vụ của bạn là đọc câu hỏi của người dùng và xác định xem câu hỏi này thuộc về bộ luật nào.
Hãy trả về kết quả dưới dạng JSON chứa trường "law_uuid". Bạn có thể suy luận thêm nếu cần, nhưng phải đảm bảo xuất ra block JSON hợp lệ.
Nếu câu hỏi KHÔNG liên quan đến bất kỳ bộ luật nào trong danh sách, hãy đặt "law_uuid" là "OUT_OF_DOMAIN".

Ví dụ kết quả mong muốn:
{{
  "law_uuid": "00119133-180c-49b3-b38c-8ac0d75211c3"
}}"""

    REWRITE_SYSTEM_PROMPT = """You are a query optimizer for a RAG system.
Rewrite the user's query to improve retrieval from a vector database.
Make the query more specific, add relevant synonyms, and expand abbreviations.
Return ONLY the rewritten query, no explanation."""

    CLASSIFY_SYSTEM_PROMPT = """You are a query classifier. Classify the user's query into exactly one category:
- factual: Questions seeking specific facts or data
- analytical: Questions requiring analysis or reasoning
- summarization: Requests to summarize content
- comparison: Questions comparing two or more things
- conversational: General conversation or greetings

Return ONLY the category name, nothing else."""

    def __init__(self) -> None:
        self._templates: dict[str, str] = {
            "rag_system": self.RAG_SYSTEM_PROMPT,
            "rag_user": self.RAG_USER_PROMPT,
            "evaluation": self.EVALUATION_PROMPT,
            "reflection": self.REFLECTION_PROMPT,
            "generate_law_header": self.GENERATE_LAW_HEADER_PROMPT,
            "update_law_description": self.UPDATE_LAW_DESCRIPTION_PROMPT,
            "route_query_system": self.ROUTE_QUERY_SYSTEM_PROMPT,
            "rewrite_system": self.REWRITE_SYSTEM_PROMPT,
            "classify_system": self.CLASSIFY_SYSTEM_PROMPT,
        }

    def get_prompt(
        self,
        template_name: str,
        **variables: Any,
    ) -> str:
        """Get a formatted prompt template.

        Args:
            template_name: Name of the prompt template.
            **variables: Template variables to substitute.

        Returns:
            Formatted prompt string.
        """
        template = self._templates.get(template_name)

        if not template:
            raise ValueError(f"Unknown prompt template: {template_name}")

        try:
            return template.format(**variables)
        except KeyError as e:
            raise ValueError(
                f"Missing template variable {e} in '{template_name}'"
            ) from e

    def register_template(
        self,
        template_name: str,
        template: str,
    ) -> None:
        """Register a new prompt template."""
        self._templates[template_name] = template
        logger.info("Registered prompt template: %s", template_name)

    def list_templates(self) -> list[str]:
        """List all registered template names."""
        return list(self._templates.keys())
