import pytest
from fastapi.testclient import TestClient
from unittest.mock import AsyncMock, MagicMock

from rag_backend.main import app
from rag_backend.presentation.controllers.agent_controller import AgentController
from rag_backend.presentation.controllers.ingestion_controller import IngestionController

# We must bypass the lifespan event connecting to Weaviate.
# The easiest way is to mock init_container in main.py, or just mock the VectorRepository's initialize_schema.
# Since FastAPI's TestClient runs lifespan, we use a fixture to patch init_container.

@pytest.fixture(autouse=True)
def mock_container(mocker):
    mock_vector_repo = MagicMock()
    mock_vector_repo.initialize_schema = AsyncMock()
    mock_vector_repo.close = AsyncMock()

    mock_ingestion_controller = MagicMock(spec=IngestionController)
    mock_ingestion_controller.ingest_law = AsyncMock()

    mock_agent_controller = MagicMock(spec=AgentController)
    mock_agent_controller.query_agent = AsyncMock()

    # Mock the DI container
    mock_container_instance = MagicMock()
    mock_container_instance.vector_repository.return_value = mock_vector_repo
    mock_container_instance.ingestion_controller.return_value = mock_ingestion_controller
    mock_container_instance.agent_controller.return_value = mock_agent_controller

    mocker.patch("rag_backend.main.init_container", return_value=mock_container_instance)
    
    return mock_container_instance

@pytest.fixture
def client():
    with TestClient(app) as client:
        yield client

def test_query_agent_success(client, mock_container):
    mock_agent_ctrl = mock_container.agent_controller()
    # It must return an object or dict that satisfies AgentQueryResponse
    from rag_backend.presentation.schemas.agent_schemas import AgentQueryResponse
    mock_agent_ctrl.query_agent.return_value = AgentQueryResponse(
        answer="Quyền công dân là...", 
        iterations=1,
        todos_executed=[],
        research_findings=[]
    )

    response = client.post("/api/v1/query/agent/", json={"question": "Quyền công dân là gì?"})
    
    assert response.status_code == 200
    assert response.json()["answer"] == "Quyền công dân là..."

def test_query_agent_validation_error(client):
    response = client.post("/api/v1/query/agent/", json={"wrong_field": "test"})
    assert response.status_code == 422

def test_ingest_mongodb_success(client, mock_container):
    mock_ingest_ctrl = mock_container.ingestion_controller()
    from rag_backend.presentation.schemas.ingestion_schemas import IngestionResultDto
    mock_ingest_ctrl.ingest_law.return_value = IngestionResultDto(
        so_ky_hieu="01/2013/QH13", 
        ten_day_du="Hiến pháp",
        chunks_stored=10, 
        details={}
    )

    response = client.post("/api/v1/ingestion/laws", json={"so_ky_hieu": "01/2013/QH13"})
    
    assert response.status_code == 200
    assert response.json()["so_ky_hieu"] == "01/2013/QH13"

def test_ingest_mongodb_validation_error(client):
    response = client.post("/api/v1/ingestion/laws", json={})
    assert response.status_code == 422
