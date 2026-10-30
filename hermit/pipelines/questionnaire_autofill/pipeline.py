"""
Hermit custom-task pipeline for VeritasESG's local questionnaire autofill.

Calls the REAL, existing endpoint — no parallel/duplicate autofill logic:
    POST {VERITASESG_API_BASE}/api/kb-rag/tasks/autofill-answer

This is an EVALUATION-ONLY harness. It does not modify the running
application and does not inject adapter content into the real prompt
builder yet (that wiring does not exist — see
docs/hermit/architecture-review.md section 8, limitation 2). If an
adapter is present, its text is recorded alongside the result for
later analysis, not applied.

Auth: requires a VeritasESG JWT for a platform user with access to the
evaluation fixture project, read from HERMIT_SERVICE_TOKEN. No such
token has been provisioned yet (architecture-review.md limitation 2)
— this file is written against the verified real contract but has not
been exercised against a live Hermit install.

Dataset case `input` fields (see hermit/datasets/questionnaire_autofill/):
    project_id, question_id, assignment_id  — must reference real rows
        in a dedicated, seeded evaluation-fixture project (never a real
        customer's project). Provisioning that fixture project is a
        prerequisite for running this pipeline, not done by this file.
    lang   — "en" | "tr"
    mode   — "local" | "general"
"""

from __future__ import annotations

import os
import time
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import requests

API_BASE = os.environ.get("VERITASESG_API_BASE", "http://app:3010")
SERVICE_TOKEN = os.environ.get("HERMIT_SERVICE_TOKEN", "")
REQUEST_TIMEOUT_S = 60


@dataclass
class RunOutput:
    """Matches Hermit's documented pipeline return contract."""

    ok: bool
    answer: str = ""
    chunk_count: int = 0
    mode: str = "local"
    sources: list[dict[str, Any]] = field(default_factory=list)
    error: str | None = None
    latency_ms: int = 0
    adapter_text_present: bool = False


def _read_adapter_text(adapter: Path | None) -> str | None:
    """Adapter is a directory of learned text files (e.g. ADAPTER.md); see
    the Hermit quickstart demo. Reading only — not applied to the real
    prompt yet (see module docstring)."""
    if adapter is None:
        return None
    candidate = adapter / "ADAPTER.md"
    if candidate.exists():
        return candidate.read_text(encoding="utf-8")
    return None


def run(task: dict, adapter: Path | None) -> RunOutput:
    case_input = task.get("input", {})
    project_id = str(case_input.get("project_id", "")).strip()
    question_id = str(case_input.get("question_id", "")).strip()
    assignment_id = str(case_input.get("assignment_id", "")).strip()
    lang = case_input.get("lang", "en")
    mode = case_input.get("mode", "local")

    if not (project_id and question_id and assignment_id):
        return RunOutput(ok=False, error="missing project_id/question_id/assignment_id in case input")

    if not SERVICE_TOKEN:
        return RunOutput(
            ok=False,
            error=(
                "HERMIT_SERVICE_TOKEN is not set. A scoped-down evaluation "
                "service account must be provisioned before this pipeline "
                "can call the real autofill endpoint — see "
                "docs/hermit/architecture-review.md limitation 2."
            ),
        )

    adapter_text = _read_adapter_text(adapter)

    started = time.monotonic()
    try:
        resp = requests.post(
            f"{API_BASE}/api/kb-rag/tasks/autofill-answer",
            json={
                "projectId": project_id,
                "questionId": question_id,
                "assignmentId": assignment_id,
                "lang": lang,
                "mode": mode,
            },
            headers={"Authorization": f"Bearer {SERVICE_TOKEN}"},
            timeout=REQUEST_TIMEOUT_S,
        )
    except requests.RequestException as exc:
        return RunOutput(ok=False, error=f"request failed: {exc}")
    latency_ms = int((time.monotonic() - started) * 1000)

    if resp.status_code != 200:
        return RunOutput(
            ok=False,
            error=f"HTTP {resp.status_code}: {resp.text[:500]}",
            latency_ms=latency_ms,
            adapter_text_present=adapter_text is not None,
        )

    body = resp.json().get("data", {})
    return RunOutput(
        ok=True,
        answer=str(body.get("answer", "")),
        chunk_count=int(body.get("chunkCount", 0)),
        mode=str(body.get("mode", mode)),
        sources=list(body.get("sources", [])),
        latency_ms=latency_ms,
        adapter_text_present=adapter_text is not None,
    )
