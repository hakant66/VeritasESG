"""
Minimal internal control API for the Hermit evaluation worker.

NOT YET CALLED by the Express app — no `/api/admin/ai-quality/*`
evaluation-run endpoint exists yet (see docs/hermit/architecture-review.md,
limitation 6: the "Evaluation runs" admin UI section is not built).
This file exists so the `hermit-worker` container has something to run
when an operator starts it, and so the real request/response shape can be
nailed down in the next slice of work — it is deliberately small.

Internal-only: this service should never be exposed outside the Docker
network. docker-compose.yml does not publish a host port for it.
"""

from __future__ import annotations

import subprocess

from fastapi import FastAPI
from pydantic import BaseModel

app = FastAPI(title="VeritasESG Hermit Worker (internal)")


@app.get("/health")
def health():
    return {"ok": True}


class EvaluateRequest(BaseModel):
    config_path: str
    adapter: str = "none"


@app.post("/evaluate")
def evaluate(req: EvaluateRequest):
    """Runs `hermit eval` and returns its raw stdout/stderr/exit code.

    UNVERIFIED: hermit-harness's actual CLI output format has not been
    inspected yet (would require a real `hermit check` run first, which
    itself needs the service-auth decision in architecture-review.md
    limitation 2). Parsing/persisting structured results into
    AiEvaluationRun/AiEvaluationResult is the next slice of work, not
    done here.
    """
    result = subprocess.run(
        ["hermit", "eval", "--config", req.config_path, "--adapter", req.adapter],
        capture_output=True,
        text=True,
        timeout=1800,
    )
    return {
        "exit_code": result.returncode,
        "stdout": result.stdout[-10000:],
        "stderr": result.stderr[-10000:],
    }
