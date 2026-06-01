"""Domain models for Multi-Agent System."""

from typing import Annotated, TypedDict
import operator

from langchain_core.messages import BaseMessage


class ResearchFinding(TypedDict):
    """Raw research findings returned by Paralegal Agent."""

    task_description: str
    law_name: str | None
    query_used: str
    chunks: list[dict]

class ParalegalInput(TypedDict):
    """Input payload for Paralegal node."""
    task_description: str
    law_name: str | None
    tool_call_id: str


class TodoItem(TypedDict):
    """Task item managed by Master Lawyer."""

    task: str
    status: str
    paralegal_id: str | None


class DeepAgentState(TypedDict):
    """State shared across all nodes in the Deep Agent LangGraph."""

    messages: Annotated[list[BaseMessage], operator.add]
    todos: list[TodoItem]
    research_findings: Annotated[list[ResearchFinding], operator.add]
    original_question: str
    final_answer: str | None
    iteration_count: int
    max_iterations: int
