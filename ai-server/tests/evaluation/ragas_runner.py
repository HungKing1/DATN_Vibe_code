"""
[LEGACY — KHÔNG CÒN HOẠT ĐỘNG]
=================================
File này dùng RAGPipeline cũ (`container.rag_pipeline()`) đã bị loại bỏ
sau khi hệ thống chuyển sang kiến trúc Multi-Agent (LangGraph).

Thay thế bằng: tests/evaluation/agent_evaluator.py
  → Gọi MultiAgentService.process() thay vì RAGPipeline.run()
  → Dùng LLM-as-a-Judge thuần túy thay vì RAGAS metrics

Prompts tiếng Việt trong prompts/vietnamese_ragas.py vẫn có thể tái sử dụng
làm tham khảo cho LLM Judge prompt.
"""

import asyncio
import json
import logging
from datetime import datetime
from pathlib import Path

from datasets import Dataset

from rag_backend.config.settings import get_settings
from rag_backend.di.container import init_container
from rag_backend.domain.models.query import Query

logger = logging.getLogger(__name__)

async def build_ragas_dataset(golden_file_path: Path, pipeline) -> Dataset:
    """Builds a HuggingFace Dataset object for Ragas from the golden file."""
    if not golden_file_path.exists():
        raise FileNotFoundError(f"Không tìm thấy file Ground Truth: {golden_file_path}")
        
    with open(golden_file_path, "r", encoding="utf-8") as f:
        qa_pairs = json.load(f)
        
    data = {"question": [], "answer": [], "contexts": [], "ground_truth": []}
    
    logger.info(f"Đang chạy {len(qa_pairs)} câu hỏi qua RAG Pipeline...")
    for idx, qa in enumerate(qa_pairs):
        logger.info(f"Đang xử lý câu hỏi {idx + 1}/{len(qa_pairs)}: {qa['question'][:50]}...")
        
        # Gọi hệ thống RAG thực tế
        query = Query(original_text=qa["question"])
        try:
            response = await pipeline.run(query=query)
            
            data["question"].append(qa["question"])
            data["answer"].append(response.answer)
            
            # Trích xuất contexts từ list citations
            # Chú ý: Ragas yêu cầu danh sách các chuỗi text cho 'contexts'
            context_list = [cite.content_snippet for cite in response.citations]
            if not context_list:
                 context_list = ["No context retrieved."]
            data["contexts"].append(context_list)
            
            data["ground_truth"].append(qa["ground_truth"])
            
        except Exception as e:
            logger.error(f"Lỗi khi chạy câu hỏi {idx}: {e}")
            continue
            
    return Dataset.from_dict(data)

async def main():
    logging.basicConfig(level=logging.INFO)
    logger.info("Khởi tạo môi trường đánh giá Ragas...")
    
    # 1. Khởi tạo RAG Pipeline từ DI Container
    settings = get_settings()
    container = init_container(settings)
    pipeline = container.rag_pipeline()
    llm_provider = container.llm_provider()
    embedding_provider = container.embedding_provider()
    
    golden_file = Path("tests/evaluation/data/golden_dataset.json")
    dataset = await build_ragas_dataset(golden_file, pipeline)
    
    if len(dataset) == 0:
        logger.error("Dataset rỗng, hủy đánh giá.")
        return
        
    # 2. Cấu hình Langchain LLM & Embedding cho Ragas
    from ragas.llms import LangchainLLMWrapper
    from ragas.embeddings import LangchainEmbeddingsWrapper
    from ragas import evaluate
    from ragas.metrics import (
        faithfulness,
        answer_relevancy,
        context_precision,
        context_recall
    )
    from .prompts.vietnamese_ragas import (
        VIETNAMESE_FAITHFULNESS_PROMPT,
        VIETNAMESE_ANSWER_RELEVANCY_PROMPT,
        VIETNAMESE_CONTEXT_PRECISION_PROMPT,
        VIETNAMESE_CONTEXT_RECALL_PROMPT
    )
    
    # Wrap LLM và Embedding nội bộ sang chuẩn của Ragas
    if hasattr(llm_provider, "_llm"):
        evaluator_llm = LangchainLLMWrapper(getattr(llm_provider, "_llm"))
    else:
        logger.error("LLM Provider không hỗ trợ _llm. Vui lòng kiểm tra lại Langchain Wrapper.")
        return
        
    try:
        evaluator_embeddings = LangchainEmbeddingsWrapper(getattr(embedding_provider, "_embedding_model"))
    except AttributeError:
        logger.warning("Không lấy được mô hình Embedding để wrap. Một số metric có thể thất bại.")
        evaluator_embeddings = None

    # 3. Override (Ghi đè) Prompt tiếng Việt cho Ragas Metrics
    logger.info("Đang ghi đè Ragas Prompts sang tiếng Việt...")
    # Lưu ý: Tuỳ thuộc vào phiên bản Ragas, cách ghi đè có thể thay đổi.
    # Trong bản ragas>=0.1.7, thuộc tính prompt có thể thiết lập trực tiếp:
    faithfulness.prompt = VIETNAMESE_FAITHFULNESS_PROMPT
    answer_relevancy.prompt = VIETNAMESE_ANSWER_RELEVANCY_PROMPT
    context_precision.prompt = VIETNAMESE_CONTEXT_PRECISION_PROMPT
    context_recall.prompt = VIETNAMESE_CONTEXT_RECALL_PROMPT
    
    # 4. Thực thi chấm điểm
    logger.info("Bắt đầu chấm điểm Ragas (Quá trình này có thể mất vài phút)...")
    metrics_to_run = [faithfulness, answer_relevancy, context_precision, context_recall]
    
    try:
        result = evaluate(
            dataset=dataset,
            metrics=metrics_to_run,
            llm=evaluator_llm,
            embeddings=evaluator_embeddings,
            raise_exceptions=False # Để tránh sập khi một câu call API lỗi
        )
    except Exception as e:
        logger.error(f"Lỗi hệ thống khi đánh giá Ragas: {e}")
        return
        
    # 5. Xuất báo cáo (Report Export)
    logger.info("Chấm điểm hoàn tất. Đang xuất báo cáo...")
    df = result.to_pandas()  # type: ignore
    
    report_dict = {
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "summary_metrics": result.scores if hasattr(result, 'scores') else {},  # type: ignore
        "details": df.to_dict(orient="records")
    }
    
    reports_dir = Path("tests/evaluation/data/reports")
    reports_dir.mkdir(parents=True, exist_ok=True)
    report_path = reports_dir / f"ragas_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
    
    with open(report_path, "w", encoding="utf-8") as f:
        json.dump(report_dict, f, ensure_ascii=False, indent=2)
        
    logger.info(f"Hoàn thành! Đã lưu báo cáo tại: {report_path}")

if __name__ == "__main__":
    asyncio.run(main())
