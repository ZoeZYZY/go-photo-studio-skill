# Skill Status

Updated: 2026-04-12
Public repository: https://github.com/ZoeZYZY/go-photo-studio-skill

## Completed
- Stage A/B upgraded to AI-vision-first with provider switch support (`gemini`, `openai`, `anthropic`) and fallback mode.
- Stage E verification gate added with configurable thresholds and pass/retry decision.
- End-to-end orchestrator `run-pipeline.cjs` added with retry loop and summary output.
- Constraint sanitization added to prevent prompt-injection style user constraints.
- Frontend generation now includes post-generation quality gate with one automatic retry under stronger constraints.
- Deterministic local identity metric added (`deterministic-identity-score.py`) and integrated into Stage E decisions.
- Threshold calibration workflow added (`calibrate-thresholds.cjs` + eval template).
- Starter labeled eval dataset committed (`references/eval/eval.json`).
- Runnable examples committed (`examples/requests/*` + `examples/outputs/*`).
- Smoke test added for CLI contracts (`tests/smoke.cjs`).
- NPM execution scripts added (`skill:*`) for local reproducibility.
- Architecture boundary doc added (`ARCHITECTURE.md`) to clarify CLI runtime vs frontend demo.
- Mock end-to-end chain demo added (`skill:e2e:mock` + `scripts/mock-generate.cjs`).
- Python dependency boundary clarified (`scripts/requirements.txt` for deterministic scorer only).

## Current Risk Assessment
- High risk: downgraded from RED to YELLOW (core safeguards exist but rely on model quality and key availability).
- Medium risk: partially mitigated; remaining issues are mainly calibration and production integration depth.

## Remaining Gaps
- Dataset is still starter-scale and should be expanded with real-world samples and reviewer agreement checks.
- Deterministic metric currently hash/histogram-based and should be upgraded to embedding-based scoring for production-grade identity checks.
- Frontend provider runtime supports `gemini/openai`; anthropic is analysis-only in current UI path.
- Script-level i18n currently supports `language=en|zh`; docs are multilingual but runtime locale support is narrower.

## Next Priority
1. Expand `eval.json` from starter set to benchmark-grade dataset with per-style stratification.
2. Add deterministic identity similarity scorer (embedding-based) for Stage E.
3. Align frontend runtime with provider adapters used by scripts.
