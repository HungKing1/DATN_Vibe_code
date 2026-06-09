import pytest
from unittest.mock import AsyncMock, MagicMock
from langchain_core.messages import HumanMessage, ToolMessage
from langgraph.types import Send
from rag_backend.domain.exceptions import QueryPipelineError
from rag_backend.application.services.multi_agent_service import MultiAgentService

@pytest.fixture
def multi_agent_service():
    master_agent_mock = MagicMock()
    paralegal_factory_mock = MagicMock()
    service = MultiAgentService(master_agent_mock, paralegal_factory_mock)
    return service

@pytest.mark.asyncio
async def test_run_success():
    mock_graph = AsyncMock()
    mock_graph.ainvoke.return_value = {
        "messages": [MagicMock(content="Đây là câu trả lời")],
        "todos": ["todo1", "todo2"],
        "research_findings": ["finding1"],
        "iteration_count": 2
    }
    
    service = MultiAgentService(MagicMock(), MagicMock())
    service._graph = mock_graph
    
    result = await service.run("Quyền công dân là gì?")
    
    assert result["answer"] == "Đây là câu trả lời"
    assert result["todos_executed"] == ["todo1", "todo2"]
    assert result["research_findings"] == ["finding1"]
    assert result["iterations"] == 2

@pytest.mark.asyncio
async def test_run_raises_query_pipeline_error():
    mock_graph = AsyncMock()
    mock_graph.ainvoke.side_effect = Exception("Some internal error")
    
    service = MultiAgentService(MagicMock(), MagicMock())
    service._graph = mock_graph
    
    with pytest.raises(QueryPipelineError) as exc:
        await service.run("Hỏi gì đó")
    
    assert "Multi-agent pipeline failed" in str(exc.value)

def test_route_after_master_max_iterations(multi_agent_service):
    state = {
        "messages": [HumanMessage(content="Hello")],
        "iteration_count": 10,
        "max_iterations": 10
    }
    result = multi_agent_service._route_after_master(state)
    assert result == "__end__"

def test_route_after_master_no_tool_calls(multi_agent_service):
    msg = MagicMock()
    msg.tool_calls = []
    state = {
        "messages": [msg],
        "iteration_count": 1,
        "max_iterations": 10
    }
    result = multi_agent_service._route_after_master(state)
    assert result == "__end__"

def test_route_after_master_delegate_task(multi_agent_service):
    msg = MagicMock()
    msg.tool_calls = [{"name": "delegate_task", "args": {"description": "test"}, "id": "tc1"}]
    state = {
        "messages": [msg],
        "iteration_count": 1,
        "max_iterations": 10
    }
    
    result = multi_agent_service._route_after_master(state)
    
    assert isinstance(result, list)
    assert len(result) == 1
    assert isinstance(result[0], Send)
    assert result[0].node == "paralegal"
    assert result[0].arg["tool_call_id"] == "tc1"

def test_route_after_master_simple_tools(multi_agent_service):
    msg = MagicMock()
    msg.tool_calls = [{"name": "write_todos", "args": {"todos": []}, "id": "tc1"}]
    state = {
        "messages": [msg],
        "iteration_count": 1,
        "max_iterations": 10
    }
    
    result = multi_agent_service._route_after_master(state)
    assert result == "master_tools"

@pytest.mark.asyncio
async def test_run_extracts_list_content():
    mock_graph = AsyncMock()
    mock_graph.ainvoke.return_value = {
        "messages": [MagicMock(content=[{"type": "text", "text": "Phần 1"}, {"type": "text", "text": "Phần 2"}])],
        "todos": [],
        "research_findings": [],
        "iteration_count": 1
    }
    
    service = MultiAgentService(MagicMock(), MagicMock())
    service._graph = mock_graph
    
    result = await service.run("Test list content")
    assert result["answer"] == "Phần 1 Phần 2"
