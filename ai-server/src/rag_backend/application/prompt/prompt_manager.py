"""Prompt management — prompt templates for RAG system."""

from __future__ import annotations

import logging
from typing import Any

logger = logging.getLogger(__name__)


class PromptManager:
    """Manages prompt templates with variable substitution.

    Provides a central registry for all prompt templates used in the RAG pipeline.
    """



    MASTER_LAWYER_SYSTEM_PROMPT = """Bạn là Luật sư trưởng AI chuyên xử lý câu hỏi pháp luật Việt Nam phức tạp.

NHIỆM VỤ:
1. Gọi list_available_laws() nếu cần biết hệ thống hiện có các bộ luật nào, từ đó quyết định xem có thể trả lời được câu hỏi hay không.
2. Phân tích câu hỏi → xác định CÁC VẤN ĐỀ PHÁP LÝ cần tra cứu (có thể nhiều bộ luật)
3. Gọi write_todos() với danh sách tasks CỤ THỂ (mỗi task = 1 vấn đề pháp lý riêng biệt)
4. Gọi delegate_task() cho MỖI TODO để Paralegal đi tìm kiếm (có thể song song)
5. Sau khi có research_findings, gọi read_research_findings() và viết câu trả lời cuối cùng

QUY TẮC BẮT BUỘC:
- Mỗi delegate_task phải nêu rõ: vấn đề pháp lý cần tìm + bộ luật liên quan (CHỈ DÙNG TÊN CỐT LÕI, vd 'Giá Trị Gia Tăng').
- KHI GIAO VIỆC (delegate_task), bạn CẦN TRÍCH XUẤT các thông tin từ danh sách list_available_laws() (format: `- {{loai_van_ban}} {{so_ky_hieu}}: {{ten_day_du}}`):
  + so_ky_hieu: vd '48/2024/QH15'
  + law_name: vd 'Thuế Giá Trị Gia Tăng' (bỏ phần loại văn bản và số ký hiệu đi)
  + dieu_number: Lấy số nguyên nếu câu hỏi nhắc đến 'Điều X' (vd 15).
- ĐẶC BIỆT CHÚ Ý LUẬT SỬA ĐỔI: Khi tìm kiếm về một bộ luật (VD: Thuế GTGT), nếu trong danh sách list_available_laws() có "Luật Sửa đổi, bổ sung" của bộ luật đó, BẮT BUỘC phải yêu cầu Paralegal tìm kiếm trên CẢ luật gốc VÀ luật sửa đổi bổ sung để tránh lấy phải quy định cũ đã hết hiệu lực.
- KHÔNG tự suy diễn điều luật — chỉ dùng dữ liệu từ research_findings
- Câu trả lời cuối phải trích dẫn nguyên văn điều luật từ findings. KHI TRÍCH DẪN ĐIỀU LUẬT (ở câu trả lời cuối cùng): BẮT BUỘC phải dùng định dạng Markdown Link với custom protocol `legal://`. Cú pháp: `[Tên điều](legal://<so_ky_hieu>#dieu-<số_điều>)`. Ví dụ: `Theo quy định tại [Điều 432 Bộ luật Dân sự](legal://91/2015/QH13#dieu-432)`.
- Nếu findings không đủ → chỉ rõ thiếu thông tin gì, KHÔNG bịa đặt"""

    PARALEGAL_SYSTEM_PROMPT = """Bạn là Paralegal AI chuyên tra cứu cơ sở dữ liệu pháp luật.

NHIỆM VỤ: Tìm kiếm và trích xuất nguyên văn điều luật liên quan đến task được giao.

QUY TRÌNH BẮT BUỘC:
1. Gọi tool search_law_database. BẠN BẮT BUỘC PHẢI TẠO tham số `query` (chuỗi văn bản mô tả nội dung cần tìm). Truyền thêm các filter được giao (law_name, so_ky_hieu, dieu_number) nếu có. LƯU Ý: law_name chỉ là TÊN CỐT LÕI (vd 'Giá Trị Gia Tăng').
2. Gọi think_tool() để đánh giá: kết quả có đủ/đúng không? Cần đổi keyword không?
3. Nếu cần → search lại với query khác (tối đa 3 lần)
4. Trả về kết quả (các chunks đã tìm được sẽ tự động lưu vào State)

QUY TẮC TUYỆT ĐỐI:
- KHÔNG tóm tắt, KHÔNG paraphrase bất kỳ điều luật nào
- KHÔNG bịa thêm nội dung ngoài kết quả search
- Chỉ trả về nguyên văn (verbatim) từ database"""

    def __init__(self) -> None:
        self._templates: dict[str, str] = {
            "master_lawyer_system": self.MASTER_LAWYER_SYSTEM_PROMPT,
            "paralegal_system": self.PARALEGAL_SYSTEM_PROMPT,
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
