# Architecture

## Scope split

This repository has two layers:

1. **Core skill runtime (source of truth)**
- Location: `skills/go-photo-studio/`
- Includes: stage scripts (`stage-a` to `stage-e`), `run-pipeline.cjs`, presets, thresholds, eval set.
- This is the reusable open-source skill package for Codex/Claude/IDE agents.

2. **Frontend demo app**
- Location: `src/`, `components/`
- Purpose: interactive demo UI for trying style presets and provider calls.
- It is not the contract source for pipeline behavior.

## Execution contracts

Primary contracts are CLI-first:
- `validate_request.cjs`
- `compose_prompt.cjs`
- `run-pipeline.cjs`
- `stage-*.cjs`

If UI behavior differs from CLI behavior, CLI contracts are authoritative.

## Python boundary

Python is optional and only used by deterministic local scoring:
- Script: `skills/go-photo-studio/scripts/deterministic-identity-score.py`
- Dependencies: `skills/go-photo-studio/scripts/requirements.txt`

No Python is required for request validation, prompt composition, or stage orchestration itself.

## Online vs offline modes

- **Offline / no API key**: Stage A/B/E use fallback modes; pipeline still outputs structured artifacts for integration testing.
- **Online / with API key**: Stage A/B/E use provider vision APIs for analysis/verification.

## End-to-end mock path

For reproducible local E2E without external model calls:
- Request: `skills/go-photo-studio/examples/requests/e2e-mock.en.json`
- Generator stub: `skills/go-photo-studio/scripts/mock-generate.cjs`
- Command: `npm run skill:e2e:mock`
