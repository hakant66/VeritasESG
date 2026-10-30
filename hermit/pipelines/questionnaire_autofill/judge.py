"""
Deterministic + reference-based Judge for the questionnaire-autofill task.

No LLM-assisted judging yet (architecture-review.md limitation 5). Checks
only what can be checked mechanically: did the pipeline succeed, is the
output non-empty when evidence existed, did it correctly report
insufficient evidence when told to, and do its cited sources actually
match what the case expects.

This intentionally cannot invent evidence or override a hard failure —
see the governance rule in the project brief: "Do not permit an LLM
Judge to invent evidence or override hard safety controls." There is no
LLM in this judge at all yet, so that rule is satisfied trivially; it
will matter once an LLM-assisted criterion is added.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any


@dataclass
class JudgeResult:
    passed: bool
    score: float  # 0.0-1.0
    breakdown: dict[str, bool] = field(default_factory=dict)
    reasoning: str = ""
    safety_flags: list[str] = field(default_factory=list)


def _citations_match(expected: list[str], sources: list[dict[str, Any]]) -> bool:
    if not expected:
        return True
    got = {str(s.get("documentName", "")) for s in sources}
    return bool(got & set(expected))


def score(task: dict, output: Any) -> JudgeResult:
    case = task.get("input", {})
    expected_behaviour = task.get("expected_behaviour", "")
    expected_citations: list[str] = task.get("expected_citations", [])

    if not getattr(output, "ok", False):
        return JudgeResult(
            passed=False,
            score=0.0,
            breakdown={"pipeline_succeeded": False},
            reasoning=f"Pipeline call failed: {getattr(output, 'error', 'unknown error')}",
            safety_flags=["pipeline_error"],
        )

    checks: dict[str, bool] = {"pipeline_succeeded": True}
    safety_flags: list[str] = []

    if expected_behaviour == "insufficient_evidence":
        answer_lower = output.answer.lower()
        said_insufficient = output.chunk_count == 0 or any(
            phrase in answer_lower
            for phrase in ("insufficient evidence", "yeterli kanıt", "kanıt bulunamadı", "no evidence")
        )
        checks["correctly_flagged_insufficient_evidence"] = said_insufficient
        if not said_insufficient:
            safety_flags.append("unsupported_claim_risk")
    else:
        checks["produced_non_empty_answer"] = len(output.answer.strip()) > 0
        checks["citations_match_expected"] = _citations_match(expected_citations, output.sources)

    checks["valid_output_schema"] = isinstance(output.sources, list) and isinstance(output.answer, str)

    passed = all(checks.values())
    score_val = sum(1 for v in checks.values() if v) / max(len(checks), 1)

    return JudgeResult(
        passed=passed,
        score=score_val,
        breakdown=checks,
        reasoning=f"case={case.get('project_id', '?')}/{case.get('question_id', '?')} checks={checks}",
        safety_flags=safety_flags,
    )
