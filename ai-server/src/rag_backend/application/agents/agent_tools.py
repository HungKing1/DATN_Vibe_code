"""Tools for Master Lawyer and Paralegal agents."""

from typing import Optional
from langchain_core.tools import tool

from rag_backend.domain.interfaces.vector_repository import VectorRepository
from rag_backend.domain.interfaces.embedding_provider import EmbeddingProvider
from rag_backend.domain.interfaces.reranker import Reranker


@tool
def write_todos(todos: list[dict]) -> str:
    """Lập hoặc cập nhật danh sách công việc.
    Args:
        todos: Danh sách các dict, mỗi dict có key 'task' và 'status' (ví dụ: 'pending').
    """
    return "Đã ghi nhận danh sách công việc."


@tool
def read_todos() -> str:
    """Đọc danh sách công việc hiện tại."""
    return "Action logged."


@tool
def delegate_task(description: str, law_name: Optional[str] = None) -> str:
    """Tạo task cho Paralegal Agent đi tìm kiếm thông tin theo mô tả.
    Args:
        description: Mô tả chi tiết vấn đề pháp lý cần tìm kiếm.
        law_name: Tên của bộ luật (ví dụ 'Bộ luật Dân sự') nếu biết, nếu không có thể để None.
    """
    return f"Đã giao việc: {description}"


@tool
def read_research_findings() -> str:
    """Đọc toàn bộ raw findings từ Paralegal Agents."""
    return "Action logged."


def create_search_law_database_tool(
    vector_repo: VectorRepository,
    embedding_provider: EmbeddingProvider,
    reranker: Reranker,
):
    @tool
    async def search_law_database(
        query: str,
        law_name: Optional[str] = None,
    ) -> str:
        """Tìm kiếm trong cơ sở dữ liệu luật. Trả về text nguyên văn.
        Args:
            query: Câu query dùng để tìm kiếm (từ khóa hoặc câu hỏi).
            law_name: Tên của bộ luật (ví dụ 'Bộ luật Dân sự') để thu hẹp phạm vi tìm kiếm (optional).
        """
        try:
            query_vector = await embedding_provider.embed_text(query)
            results = await vector_repo.hybrid_search(
                query=query,
                query_vector=query_vector,
                top_k=20,
                ten_day_du=law_name,
            )
            
            if not results:
                return "Không tìm thấy kết quả nào phù hợp."
                
            # Expand split chunks
            from rag_backend.application.utils.chunk_utils import expand_split_chunks_async
            expanded_results = await expand_split_chunks_async(results, vector_repo, law_name)
            
            # Rerank to get top 5
            ranked_results = await reranker.rerank(
                query=query, results=expanded_results, top_k=5
            )
                
            chunks = []
            for i, r in enumerate(ranked_results):
                # Only extract raw content, DO NOT summarize
                chunks.append(f"--- Chunk {i+1} ---\nNguồn: {r.metadata.get('ten_day_du', 'Unknown')}\nNội dung:\n{r.content}")
            
            return "\n\n".join(chunks)
        except Exception as e:
            return f"Lỗi khi tìm kiếm: {str(e)}"

    return search_law_database


@tool
def think_tool(reflection: str) -> str:
    """Bắt buộc Paralegal phải tự đánh giá kết quả search.
    Args:
        reflection: Đánh giá: "Đã tìm thấy nội dung cần thiết chưa? Có cần đổi từ khóa search không?".
    """
    return f"[Reflection logged]: {reflection}"
