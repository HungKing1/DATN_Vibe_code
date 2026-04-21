"""Reflection service — decides corrective actions when RAG answer quality is low.

Analyses evaluation metrics and determines the best next step:
  • REWRITE_QUERY   — relevance is low, query needs improvement
  • SEARCH_MORE     — groundedness or citations low, need more context
  • REGENERATE      — answer too short or poorly written with same context
  • STOP            — latency too high or no clear improvement path
"""

from __future__ import annotations

import json
import logging
import re

from rag_backend.application.dto.evaluation_dto import (
    EvaluationResult,
    ReflectionAction,
    ReflectionDecision,
)
from rag_backend.application.prompt.prompt_manager import PromptManager
from rag_backend.domain.interfaces.llm_provider import LLMProvider

logger = logging.getLogger(__name__)


class ReflectionService:
    """Reflection agent that analyses evaluation results and decides corrective actions.

    Uses the configured LLMProvider to reason about which metric is weakest
    and which action is most likely to improve the answer quality.
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
        prompt_manager: PromptManager,
    ) -> None:
        self._llm = llm_provider
        self._prompts = prompt_manager

    async def reflect(
        self,
        question: str,
        answer: str,
        context: str,
        evaluation: EvaluationResult,
    ) -> ReflectionDecision:
        """Analyse evaluation metrics and return a corrective action.

        Args:
            question: The user's original (or rewritten) question.
            answer: The generated answer being evaluated.
            context: The retrieved context used for generation.
            evaluation: Evaluation metrics from ``EvaluationService``.

        Returns:
            A ``ReflectionDecision`` with the chosen action and parameters.
        """
        # Format evaluation as a readable block for the LLM
        evaluation_text = (
            f"groundedness: {evaluation.groundedness:.2f}\n"
            f"relevance: {evaluation.relevance:.2f}\n"
            f"citations_matched: {evaluation.citations_matched:.2f}\n"
            f"answer_length: {evaluation.answer_length}\n"
            f"length_score: {evaluation.length_score:.2f}\n"
            f"latency: {evaluation.latency:.2f}s\n"
            f"latency_score: {evaluation.latency_score:.2f}\n"
            f"final_score: {evaluation.final_score:.2f}\n"
            f"reasoning: {evaluation.reasoning}"
        )

        prompt = self._prompts.get_prompt(
            "reflection",
            question=question,
            answer=answer,
            context=context,
            evaluation=evaluation_text,
        )

        generation = await self._llm.generate(
            prompt=prompt,
            temperature=0.0,  # deterministic decision-making
        )

        decision = self._parse_decision(generation.text, evaluation)

        logger.info(
            "Reflection decision: action=%s query=%s top_k=%s | %s",
            decision.action.value,
            decision.improved_query[:60] if decision.improved_query else None,
            decision.new_top_k,
            decision.reasoning[:100],
        )

        return decision

    # ── Parsing ─────────────────────────────────────────────

    def _parse_decision(
        self,
        llm_output: str,
        evaluation: EvaluationResult,
    ) -> ReflectionDecision:
        """Parse LLM output into a ``ReflectionDecision``.

        Falls back to rule-based logic if the LLM output can't be parsed.
        """
        parsed = self._extract_json(llm_output)

        if parsed:
            action_str = parsed.get("action", "STOP").upper()
            try:
                action = ReflectionAction(action_str)
            except ValueError:
                action = ReflectionAction.STOP

            return ReflectionDecision(
                action=action,
                improved_query=parsed.get("improved_query"),
                new_top_k=parsed.get("new_top_k"),
                reasoning=parsed.get("reasoning", ""),
            )

        # Fallback: rule-based decision from metrics
        logger.warning("LLM reflection parse failed — using rule-based fallback.")
        return self._rule_based_decision(evaluation)

    @staticmethod
    def _rule_based_decision(evaluation: EvaluationResult) -> ReflectionDecision:
        """Deterministic fallback when LLM output cannot be parsed."""
        # High latency → stop to avoid wasting more time
        if evaluation.latency_score < 0.3:
            return ReflectionDecision(
                action=ReflectionAction.STOP,
                reasoning="Latency is too high; stopping to avoid further delay.",
            )

        # Relevance is the weakest → rewrite query
        if evaluation.relevance < 0.7:
            return ReflectionDecision(
                action=ReflectionAction.REWRITE_QUERY,
                reasoning=f"Relevance is low ({evaluation.relevance:.2f}); rewriting query.",
            )

        # Groundedness is weak → search more
        if evaluation.groundedness < 0.7:
            return ReflectionDecision(
                action=ReflectionAction.SEARCH_MORE,
                reasoning=(
                    f"Groundedness is low ({evaluation.groundedness:.2f}); "
                    "retrieving more documents."
                ),
            )

        # Citations weak → search more
        if evaluation.citations_matched < 0.7:
            return ReflectionDecision(
                action=ReflectionAction.SEARCH_MORE,
                reasoning=(
                    f"Citations score is low ({evaluation.citations_matched:.2f}); "
                    "retrieving more documents."
                ),
            )

        # Answer too short → regenerate
        if evaluation.length_score < 0.6:
            return ReflectionDecision(
                action=ReflectionAction.REGENERATE,
                reasoning=f"Answer is too short ({evaluation.answer_length} chars); regenerating.",
            )

        # Default: stop
        return ReflectionDecision(
            action=ReflectionAction.STOP,
            reasoning="No clear improvement path identified; stopping.",
        )

    @staticmethod
    def _extract_json(text: str) -> dict | None:
        """Extract the first JSON object from LLM output."""
        # Try direct parse
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try markdown code fences
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Try first { ... }
        match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

        return None
