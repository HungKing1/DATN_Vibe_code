import pytest
from unittest.mock import MagicMock, AsyncMock
from rag_backend.application.services.ingestion_service import IngestionService
from rag_backend.domain.exceptions import IngestionError

@pytest.fixture
def ingestion_service():
    mock_vector_db = AsyncMock()
    mock_mongo_db = AsyncMock()
    mock_chunker = AsyncMock()
    mock_embedder = AsyncMock()
    
    service = IngestionService(
        chunking_strategy=mock_chunker,
        embedding_provider=mock_embedder,
        vector_repository=mock_vector_db,
        mongo_reader=mock_mongo_db
    )
    return service, mock_vector_db, mock_mongo_db, mock_chunker

@pytest.mark.asyncio
async def test_ingest_document_success(ingestion_service):
    service, mock_vector_db, mock_mongo_db, mock_chunker = ingestion_service
    
    mock_doc = {
        "so_ky_hieu": "01/2023/QH15",
        "ten_day_du": "Luật abc",
        "articles": [{"content": "Điều 1: ...", "dieu": 1, "path": {}}]
    }
    
    mock_mongo_db.find_by_so_ky_hieu = AsyncMock(return_value=mock_doc)
    mock_mongo_db.get_articles = AsyncMock(return_value=mock_doc["articles"])
    mock_chunker.chunk = AsyncMock(return_value=[MagicMock(legal=MagicMock(embedding_text="text1"))])
    service._embeddings.embed_batch = AsyncMock(return_value=[[0.1, 0.2]])
    mock_vector_db.store_legal_chunks = AsyncMock(return_value=["id1"])
    
    result = await service.ingest_from_mongodb("01/2023/QH15")
    
    assert result.so_ky_hieu == "01/2023/QH15"
    assert result.chunks_stored == 1
    mock_vector_db.store_legal_chunks.assert_called_once()

@pytest.mark.asyncio
async def test_ingest_document_not_found_in_mongo(ingestion_service):
    service, _, mock_mongo_db, _ = ingestion_service
    
    mock_mongo_db.find_by_so_ky_hieu = AsyncMock(return_value=None)
    
    with pytest.raises(IngestionError):
        await service.ingest_from_mongodb("invalid_law")

@pytest.mark.asyncio
async def test_delete_law_success(ingestion_service):
    service, mock_vector_db, _, _ = ingestion_service
    
    mock_vector_db.delete_by_so_ky_hieu = AsyncMock(return_value={"so_ky_hieu": "01/2023/QH15", "deleted": True})
    
    result = await service.delete_law("01/2023/QH15")
    
    assert result["so_ky_hieu"] == "01/2023/QH15"
    assert result["deleted"] is True
    mock_vector_db.delete_by_so_ky_hieu.assert_called_once_with("01/2023/QH15")
