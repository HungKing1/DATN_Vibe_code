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
def delegate_task(
    description: str,
    law_name: Optional[str] = None,
    so_ky_hieu: Optional[str] = None,
    dieu_number: Optional[int] = None,
) -> str:
    """Tạo task cho Paralegal Agent đi tìm kiếm thông tin theo mô tả.
    Args:
        description: Mô tả chi tiết vấn đề pháp lý cần tìm kiếm.
        law_name: Tên CỐT LÕI của bộ luật (ví dụ 'Giá Trị Gia Tăng', 'Đất đai') thay vì tên đầy đủ. KHÔNG truyền số ký hiệu vào đây.
        so_ky_hieu: Số ký hiệu của văn bản nếu biết (ví dụ '48/2024/QH15').
        dieu_number: Số nguyên của Điều luật nếu muốn tìm đích danh (ví dụ 15).
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
    retrieval_top_k: int = 20,
    hybrid_search_alpha: float = 0.5,
):
    @tool
    async def search_law_database(
        query: str = "",
        law_name: Optional[str] = None,
        so_ky_hieu: Optional[str] = None,
        dieu_number: Optional[int] = None,
    ) -> str:
        """Tìm kiếm trong cơ sở dữ liệu luật. Trả về text nguyên văn.
        Args:
            query: BẮT BUỘC. Câu query dùng để tìm kiếm (từ khóa hoặc câu hỏi nội dung).
            law_name: Tên CỐT LÕI của bộ luật (ví dụ 'Giá Trị Gia Tăng'). KHÔNG truyền số ký hiệu.
            so_ky_hieu: Số ký hiệu của văn bản nếu có (ví dụ '48/2024/QH15').
            dieu_number: Số nguyên của Điều luật nếu muốn tìm đích danh (ví dụ 15).
        """
        try:
            if not query:
                # Fallback in case the LLM fails to provide a query
                query = f"Nội dung quy định về {law_name or ''} {so_ky_hieu or ''} Điều {dieu_number or ''}"

            query_vector = await embedding_provider.embed_text(query)
            results = await vector_repo.hybrid_search(
                query=query,
                query_vector=query_vector,
                top_k=retrieval_top_k,
                alpha=hybrid_search_alpha,
                ten_day_du=law_name,
                so_ky_hieu=so_ky_hieu,
                dieu_number=dieu_number,
            )
            
            if not results:
                return "Không tìm thấy kết quả nào phù hợp."
                
            # Expand split chunks
            from rag_backend.application.utils.chunk_utils import expand_split_chunks_async
            expanded_results = await expand_split_chunks_async(results, vector_repo, law_name)
            
            # Rerank — use reranker's configured top_k from settings
            ranked_results = await reranker.rerank(
                query=query, results=expanded_results
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


def create_list_available_laws_tool(vector_repo: VectorRepository):
    @tool
    async def list_available_laws() -> str:
        """Lấy danh sách các bộ luật hiện có trong hệ thống để biết lĩnh vực có thể trả lời.
        Sử dụng tool này khi cần xác định hệ thống có hỗ trợ tra cứu về một bộ luật cụ thể hay không.
        """
        try:
            laws = await vector_repo.get_distinct_laws()
            if not laws:
                return "Hiện tại hệ thống chưa có dữ liệu bộ luật nào."
            
            formatted_laws = []
            for law in laws:
                so_ky_hieu = law.get('so_ky_hieu', 'N/A')
                ten_day_du = law.get('ten_day_du', 'N/A')
                loai_van_ban = law.get('loai_van_ban', 'N/A')
                formatted_laws.append(f"- {loai_van_ban} {so_ky_hieu}: {ten_day_du}")
                
            return "Các bộ luật hiện có trong hệ thống:\n" + "\n".join(formatted_laws)
        except Exception as e:
            return f"Lỗi khi lấy danh sách bộ luật: {str(e)}"
            
    return list_available_laws

