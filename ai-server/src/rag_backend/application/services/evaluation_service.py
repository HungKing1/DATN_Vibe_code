"""Evaluation service — scores RAG answers on quality metrics.

Computes:
  • LLM-scored: groundedness, relevance, citations_matched  (via evaluation prompt)
  • Local:       answer_length, latency
  • Normalised:  length_score, latency_score
  • Composite:   final_score  (weighted average)
"""

from __future__ import annotations

import json
import logging
import re

from rag_backend.application.dto.evaluation_dto import EvaluationResult
from rag_backend.application.prompt.prompt_manager import PromptManager
from rag_backend.domain.interfaces.llm_provider import LLMProvider

logger = logging.getLogger(__name__)

# ── Score weights ───────────────────────────────────────────

WEIGHT_GROUNDEDNESS = 0.3
WEIGHT_RELEVANCE = 0.3
WEIGHT_CITATIONS = 0.2
WEIGHT_LENGTH = 0.1
WEIGHT_LATENCY = 0.1

# ── Normalisation thresholds ────────────────────────────────

# Length: answers shorter than MIN or longer than MAX are penalised.
LENGTH_MIN_CHARS = 100
LENGTH_IDEAL_MIN = 200
LENGTH_IDEAL_MAX = 2000
LENGTH_MAX_CHARS = 3000

# Latency: <FAST_S → 1.0, >SLOW_S → 0.0, linear between.
LATENCY_FAST_S = 2.0
LATENCY_SLOW_S = 5.0


class EvaluationService:
    """Evaluates a RAG answer against quality metrics.

    Uses the configured LLMProvider to score groundedness, relevance,
    and citation quality.  Local metrics (length, latency) are computed
    without an LLM call.
    """

    def __init__(
        self,
        llm_provider: LLMProvider,
        prompt_manager: PromptManager,
        *,
        score_threshold: float = 0.75,
        groundedness_threshold: float = 0.7,
        relevance_threshold: float = 0.7,
    ) -> None:
        self._llm = llm_provider
        self._prompts = prompt_manager
        self._score_threshold = score_threshold
        self._groundedness_threshold = groundedness_threshold
        self._relevance_threshold = relevance_threshold

    # ── Public API ──────────────────────────────────────────

    async def evaluate(
        self,
        question: str,
        context: str,
        answer: str,
        latency: float,
    ) -> EvaluationResult:
        """Run full evaluation and return an ``EvaluationResult``."""

        # 1. LLM-scored metrics
        llm_scores = await self._llm_evaluate(question, context, answer)

        groundedness = llm_scores.get("groundedness", 0.5)
        relevance = llm_scores.get("relevance", 0.5)
        citations_matched = llm_scores.get("citations_matched", 0.5)
        reasoning = llm_scores.get("reasoning", "")

        # 2. Local metrics
        answer_length = len(answer)
        length_score = self._compute_length_score(answer_length)
        latency_score = self._compute_latency_score(latency)

        # 3. Composite score
        final_score = (
            WEIGHT_GROUNDEDNESS * groundedness
            + WEIGHT_RELEVANCE * relevance
            + WEIGHT_CITATIONS * citations_matched
            + WEIGHT_LENGTH * length_score
            + WEIGHT_LATENCY * latency_score
        )

        result = EvaluationResult(
            groundedness=groundedness,
            relevance=relevance,
            citations_matched=citations_matched,
            answer_length=answer_length,
            latency=round(latency, 3),
            length_score=round(length_score, 3),
            latency_score=round(latency_score, 3),
            final_score=round(final_score, 3),
            reasoning=reasoning,
        )

        logger.info(
            "Evaluation — final=%.3f ground=%.2f rel=%.2f cite=%.2f len=%d lat=%.2fs",
            result.final_score,
            result.groundedness,
            result.relevance,
            result.citations_matched,
            result.answer_length,
            result.latency,
        )

        return result

    def should_reflect(self, evaluation: EvaluationResult) -> bool:
        """Decide whether the reflection loop should trigger."""
        if evaluation.final_score < self._score_threshold:
            return True
        if evaluation.groundedness < self._groundedness_threshold:
            return True
        if evaluation.relevance < self._relevance_threshold:
            return True
        return False

    # ── LLM evaluation ──────────────────────────────────────

    async def _llm_evaluate(
        self,
        question: str,
        context: str,
        answer: str,
    ) -> dict:
        """Call the LLM to score groundedness, relevance, and citations."""
        prompt = self._prompts.get_prompt(
            "evaluation",
            question=question,
            context=context,
            answer=answer,
        )

        generation = await self._llm.generate(
            prompt=prompt,
            temperature=0.0,  # deterministic scoring
        )

        return self._parse_json(generation.text)

    # ── Local scoring helpers ───────────────────────────────

    @staticmethod
    def _compute_length_score(char_count: int) -> float:
        """Score answer length; penalise too-short or too-long answers.

        Returns a float in [0, 1].
        """
        if char_count <= 0:
            return 0.0
        if char_count < LENGTH_MIN_CHARS:
            return char_count / LENGTH_MIN_CHARS * 0.5  # harsh penalty
        if char_count < LENGTH_IDEAL_MIN:
            # linear ramp from 0.5 → 1.0
            return 0.5 + 0.5 * (char_count - LENGTH_MIN_CHARS) / (
                LENGTH_IDEAL_MIN - LENGTH_MIN_CHARS
            )
        if char_count <= LENGTH_IDEAL_MAX:
            return 1.0  # sweet spot
        if char_count <= LENGTH_MAX_CHARS:
            # linear decay from 1.0 → 0.5
            return 1.0 - 0.5 * (char_count - LENGTH_IDEAL_MAX) / (
                LENGTH_MAX_CHARS - LENGTH_IDEAL_MAX
            )
        return 0.5  # very long but not zero

    @staticmethod
    def _compute_latency_score(latency_s: float) -> float:
        """Normalise latency: fast → 1.0, slow → 0.0."""
        if latency_s <= LATENCY_FAST_S:
            return 1.0
        if latency_s >= LATENCY_SLOW_S:
            return 0.0
        return 1.0 - (latency_s - LATENCY_FAST_S) / (LATENCY_SLOW_S - LATENCY_FAST_S)

    # ── JSON parsing ────────────────────────────────────────

    @staticmethod
    def _parse_json(text: str) -> dict:
        """Extract the first JSON object from LLM output."""
        # Try direct parse first
        try:
            return json.loads(text)
        except json.JSONDecodeError:
            pass

        # Try extracting from markdown code fences
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                pass

        # Try finding first { ... } block
        match = re.search(r"\{[^{}]*\}", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(0))
            except json.JSONDecodeError:
                pass

        logger.warning("Failed to parse evaluation JSON from LLM output: %s", text[:200])
        return {
            "groundedness": 0.5,
            "relevance": 0.5,
            "citations_matched": 0.5,
            "reasoning": "Failed to parse LLM evaluation output.",
        }
