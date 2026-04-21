"""Data Transfer Objects for evaluation and reflection in the Reflection RAG pipeline."""

from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field

from rag_backend.domain.models.query import RAGResponse


# ── Evaluation ──────────────────────────────────────────────


class EvaluationResult(BaseModel):
    """Result of evaluating a RAG answer against quality metrics.

    LLM-scored metrics (0–1): groundedness, relevance, citations_matched.
    Locally computed: answer_length, latency, length_score, latency_score.
    Composite: final_score (weighted average).
    """

    groundedness: float = Field(ge=0.0, le=1.0, description="Is answer grounded in context?")
    relevance: float = Field(ge=0.0, le=1.0, description="Does answer match the question?")
    citations_matched: float = Field(
        ge=0.0, le=1.0, description="Are citations aligned with context?"
    )
    answer_length: int = Field(ge=0, description="Character count of the answer")
    latency: float = Field(ge=0.0, description="Total response time in seconds")
    length_score: float = Field(ge=0.0, le=1.0, description="Normalized length score")
    latency_score: float = Field(ge=0.0, le=1.0, description="Normalized latency score")
    final_score: float = Field(ge=0.0, le=1.0, description="Weighted composite score")
    reasoning: str = Field(default="", description="LLM reasoning for the evaluation")


# ── Reflection ──────────────────────────────────────────────


class ReflectionAction(str, Enum):
    """Allowed corrective actions from the reflection agent."""

    REWRITE_QUERY = "REWRITE_QUERY"
    SEARCH_MORE = "SEARCH_MORE"
    REGENERATE = "REGENERATE"
    STOP = "STOP"


class ReflectionDecision(BaseModel):
    """Decision output from the reflection agent.

    Tells the pipeline which corrective action to take and provides
    optional parameters (improved query, new top_k).
    """

    action: ReflectionAction
    improved_query: str | None = None
    new_top_k: int | None = None
    reasoning: str = ""


# ── Extended RAG Response ───────────────────────────────────


class ReflectionRAGResponse(RAGResponse):
    """RAG response extended with reflection-loop metadata.

    Inherits all fields from RAGResponse and adds evaluation results,
    iteration count, and the full history of reflection decisions.
    """

    evaluation: EvaluationResult | None = None
    iteration_count: int = 1
    reflection_history: list[ReflectionDecision] = Field(default_factory=list)
