"""Schemas for Agent API."""

from pydantic import BaseModel, Field


class AgentQueryRequest(BaseModel):
    """Request schema for Agent query."""

    question: str = Field(..., description="User's legal question.")


class AgentQueryResponse(BaseModel):
    """Response schema for Agent query."""

    answer: str
    todos_executed: list[dict]
    research_findings: list[dict]
    iterations: int
    laws_consulted: list[str] = Field(default_factory=list)
