"""
Hermit custom-task pipeline for VeritasESG's local questionnaire autofill.

Calls the REAL, existing endpoint — no parallel/duplicate autofill logic:
    POST {VERITASESG_API_BASE}/api/kb-rag/tasks/autofill-answer

Written against hermit.task.RunOutput (hermit-harness 0.1.0, verified by
reading the installed package directly — the "Pipeline" tutorial text and
the bundled docs/_examples/first_training/pipeline.py example agreed on
the real `run(task, adapter) -> RunOutput` contract).

EVALUATION-ONLY harness. Does not modify the running application and does
not splice adapter content into the real prompt builder yet — see
docs/hermit/architecture-review.md section 8, limitation 2 (no evaluation
has run before this, now superseded for case VE-001 — see the smoke-test
log referenced in that doc).

Auth: requires a VeritasESG JWT for a platform user with access to the
evaluation-fixture project (scripts/seed-hermit-eval-fixture.ts), read
from HERMIT_SERVICE_TOKEN.

Dataset case `input` fields (hermit/datasets/questionnaire_autofill/):
    project_id, question_id, assignment_id  — must reference real rows in
        the seeded evaluation-fixture project (never a real customer's).
    lang   — "en" | "tr"
    mode   — "local" | "general"
"""

from __future__ import annotations

import os
import time
from pathlib import Path

import requests
from hermit.task import RunOutput

API_BASE = os.environ.get("VERITASESG_API_BASE", "http://app:3010")
SERVICE_TOKEN = os.environ.get("HERMIT_SERVICE_TOKEN", "")
REQUEST_TIMEOUT_S = 60


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
        return RunOutput(output=None, extra={"ok": False, "error": "missing project_id/question_id/assignment_id in case input"})

    if not SERVICE_TOKEN:
        return RunOutput(
            output=None,
            extra={
                "ok": False,
                "error": (
                    "HERMIT_SERVICE_TOKEN is not set. Run scripts/seed-hermit-eval-fixture.ts "
                    "(it prints a fresh token) and export it."
                ),
            },
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
        return RunOutput(output=None, wall_s=time.monotonic() - started, extra={"ok": False, "error": f"request failed: {exc}"})
    wall_s = time.monotonic() - started

    if resp.status_code != 200:
        # kb-rag/no-indexed-docs and similar are legitimate domain outcomes
        # (confirmed via a real call against the fixture project, which has
        # no Knowledge Base yet) — not pipeline failures. The judge decides
        # whether a given error_code satisfies a case's expected_behaviour.
        try:
            body = resp.json()
            error_code = body.get("code")
            error_text = body.get("error", resp.text[:500])
        except ValueError:
            error_code = None
            error_text = resp.text[:500]
        return RunOutput(
            output=None,
            wall_s=wall_s,
            extra={
                "ok": False,
                "error": f"HTTP {resp.status_code}: {error_text}",
                "error_code": error_code,
                "adapter_text_present": adapter_text is not None,
            },
        )

    body = resp.json().get("data", {})
    answer = str(body.get("answer", ""))
    return RunOutput(
        output=answer,
        wall_s=wall_s,
        extra={
            "ok": True,
            "chunk_count": int(body.get("chunkCount", 0)),
            "mode": str(body.get("mode", mode)),
            "sources": list(body.get("sources", [])),
            "adapter_text_present": adapter_text is not None,
        },
    )
