# Adaption Labs Benchmark Suite (Synthetic Data)

## Purpose
This directory contains synthetic benchmark datasets used to evaluate HealthLens AI's deterministic reference range evaluator, missing-field handling, and qualitative test-rejection logic.

## Ethical & Medical Disclaimers
* **Synthetic Only:** These records are artificially created software testing fixtures. They do not represent real patients, genuine clinical records, or medical evidence.
* **Non-Clinical:** This data is never used to formulate clinical guidelines, diagnostic criteria, or medical treatments.
* **Separation of Concerns:** Benchmark cases are strictly isolated from user-uploaded PDFs and the core PDF processing pipeline.

## Provenance
* **Dataset File:** `benchmark_cases.json`
* **Target Integration:** Adaption Labs Adaptive Data (`datasets.invent` API)
* **Status:** Scaffolding & offline fallback mode active pending `ADAPTION_API_KEY` configuration.
* **Live Regeneration:** When `ADAPTION_API_KEY` is added to `backend/.env`, run `npm run adaption:generate` to generate and download fresh synthetic batches directly from Adaption Labs.
