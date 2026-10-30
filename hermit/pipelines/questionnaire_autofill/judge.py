"""
Deterministic + reference-based Judge for the questionnaire-autofill task.

Written against hermit.task.JudgeResult (score: float, feedback: str,
extra: dict) — verified by reading the installed hermit-harness 0.1.0
package directly, not assumed.

No LLM-assisted judging yet (architecture-review.md limitation 5). Checks
only what can be checked mechanically: did the pipeline succeed, is the
output non-empty when evidence existed, did it correctly report
insufficient evidence when told to (including via the real API's non-200
`kb-rag/no-indexed-docs` error, discovered by an actual call, not assumed
from the docs), and do its cited sources match what the case expects.

This cannot invent evidence or override a hard failure — see the project
brief's governance rule. There is no LLM in this judge at all yet, so that
rule is satisfied trivially; it will matter once an LLM-assisted criterion
is added.
"""

from __future__ import annotations

from typing import Any

from hermit.task import JudgeResult, RunOutput

# Error codes the real endpoint returns (as a non-200 HTTP error, not a 200
# answer) that legitimately mean "insufficient evidence" rather than a
# pipeline/system failure. Confirmed by a real call against the seeded
# evaluation-fixture project (which has no Knowledge Base yet).
INSUFFICIENT_EVIDENCE_ERROR_CODES = {"kb-rag/no-indexed-docs"}


def _citations_match(expected: list[str], sources: list[dict[str, Any]]) -> bool:
    if not expected:
        return True
    got = {str(s.get("documentName", "")) for s in sources}
    return bool(got & set(expected))


def score(task: dict, output: RunOutput) -> JudgeResult:
    case = task.get("input", {})
    expected_behaviour = task.get("expected_behaviour", "")
    expected_citations: list[str] = task.get("expected_citations", [])
    extra = output.extra or {}

    if not extra.get("ok", False):
        error_code = extra.get("error_code")
        if expected_behaviour == "insufficient_evidence" and error_code in INSUFFICIENT_EVIDENCE_ERROR_CODES:
            return JudgeResult(
                score=1.0,
                feedback=f"API returned {error_code}, which correctly signals no evidence was available.",
                extra={"pipeline_succeeded": True, "correctly_flagged_insufficient_evidence": True},
            )
        return JudgeResult(
            score=0.0,
            feedback=f"Pipeline call failed: {extra.get('error', 'unknown error')}",
            extra={"pipeline_succeeded": False, "safety_flags": ["pipeline_error"]},
        )

    checks: dict[str, bool] = {"pipeline_succeeded": True}
    safety_flags: list[str] = []
    answer = str(output.output or "")

    if expected_behaviour == "insufficient_evidence":
        answer_lower = answer.lower()
        said_insufficient = extra.get("chunk_count", 0) == 0 or any(
            phrase in answer_lower
            for phrase in ("insufficient evidence", "yeterli kanıt", "kanıt bulunamadı", "no evidence")
        )
        checks["correctly_flagged_insufficient_evidence"] = said_insufficient
        if not said_insufficient:
            safety_flags.append("unsupported_claim_risk")
    else:
        checks["produced_non_empty_answer"] = len(answer.strip()) > 0
        checks["citations_match_expected"] = _citations_match(expected_citations, extra.get("sources", []))

    checks["valid_output_schema"] = isinstance(extra.get("sources", []), list) and isinstance(answer, str)

    score_val = sum(1 for v in checks.values() if v) / max(len(checks), 1)

    return JudgeResult(
        score=score_val,
        feedback=f"case={case.get('project_id', '?')}/{case.get('question_id', '?')} checks={checks}",
        extra={**checks, "safety_flags": safety_flags},
    )
