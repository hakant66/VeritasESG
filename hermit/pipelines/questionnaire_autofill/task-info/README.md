# Task: Local Questionnaire Autofill

Evaluates VeritasESG's "local" (RAG-grounded) AI answer suggestion for a
single questionnaire question, via the real `POST
/api/kb-rag/tasks/autofill-answer` endpoint — no simulated or duplicated
autofill logic.

## Prerequisites (not provisioned by this task)

1. A dedicated **evaluation-fixture project**, customer, and Knowledge
   Base in the running VeritasESG database — never a real customer's
   data. Each dataset case's `project_id` / `question_id` /
   `assignment_id` must point to real rows in that fixture project.
2. A `HERMIT_SERVICE_TOKEN` — a real VeritasESG JWT for a platform user
   scoped to read that fixture project only. Not yet provisioned; see
   `docs/hermit/architecture-review.md`, limitation 2.

## What is scored

Per `judge.py` (deterministic only, no LLM judge yet):

- Did the API call succeed at all.
- When the case's evidence is deliberately empty/irrelevant
  (`expected_behaviour: "insufficient_evidence"`): did the system
  correctly say so, instead of inventing an answer.
- Otherwise: did it produce a non-empty answer, and do its cited
  `sources[].documentName` values overlap the case's
  `expected_citations`.
- Basic response-shape validity.

## What an adapter can and cannot do here (yet)

A Hermit adapter for this task is a directory containing `ADAPTER.md`
(learned instruction text). `pipeline.py` reads that file when present
and records whether it was present, but — deliberately, for this
phase — does **not** splice it into the real prompt. Wiring that splice
into `lib/taskLocalAutofillPrompt.ts` is listed as the next slice of
work in the architecture review, not done here.
