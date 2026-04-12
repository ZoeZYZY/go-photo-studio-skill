<div align="center">

# GO Photo Studio Skill

> An identity-preserving portrait generation skill with layered analysis, controllable stylization, quality gates, and retry orchestration.

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Skill](https://img.shields.io/badge/Codex-Skill-7c3aed)](./skills/go-photo-studio/SKILL.md)
[![Pipeline](https://img.shields.io/badge/Pipeline-A%E2%86%92E-0ea5e9)](./skills/go-photo-studio/references/pipeline.md)

**Languages**: [简体中文](./README.md) · [English](./README.en.md) · [日本語](./README.ja.md) · [Español](./README.es.md)

</div>

---

## Overview

GO Photo Studio Skill turns “raw selfie + vague request” into an auditable, reusable, and provider-portable professional portrait workflow.

Skip the studio visit: one avoided session can save roughly a month of token spend. ID photos become low-cost and on-demand, so anyone can build a founder-level professional profile.

Core outcomes:
- Identity integrity
- Controlled style output
- Verifiable quality gate
- Scriptable pipeline reuse

## Method

1. Structured inputs over free-form prompts
2. Five-stage pipeline: A Layer Parse -> B Identity Extract -> C Guided Stylization -> D Export Plan -> E Verify/Retry
3. Dual validation: model-based metrics + deterministic local identity score
4. Constraint sanitization before generation
5. Retry with stronger constraints when quality gate fails

## Public Preset Listing

Source: `skills/go-photo-studio/references/presets.json`

| Preset ID | Label | Category |
| :--- | :--- | :--- |
| `studio-classic` | Studio Classic | professional |
| `tech-founder` | Tech Founder | professional |
| `elite-leadership` | Elite Leadership | professional |
| `creative-studio` | Creative Studio | professional |
| `medical-professional` | Medical Professional | professional |
| `academic-scholar` | Academic Scholar | professional |
| `resume-modern` | Modern Resume | resume |
| `resume-premium` | Premium Resume | resume |
| `resume-creative` | Creative Resume | resume |
| `id-standard` | ID Standard | id |
| `id-schengen` | Schengen Style ID | id |
| `id-blue-premium` | Premium Blue ID | id |
| `casual-outdoor` | Outdoor Natural | casual |
| `casual-cafe` | Casual Cafe | casual |

## Quick Start

```bash
node skills/go-photo-studio/scripts/validate_request.cjs --input request.json
node skills/go-photo-studio/scripts/compose_prompt.cjs --input request.json
node skills/go-photo-studio/scripts/run-pipeline.cjs --request request.json --generated output.png --provider gemini
node skills/go-photo-studio/scripts/calibrate-thresholds.cjs --input skills/go-photo-studio/references/eval/eval.json --output skills/go-photo-studio/references/verification-thresholds.json
```

## Execution Env (NPM Scripts)

```bash
npm run skill:validate:example
npm run skill:compose:example
npm run skill:pipeline:dryrun
npm run skill:e2e:mock
npm run skill:e2e:online:gemini
npm run skill:e2e:online:openai
npm run skill:calibrate
npm run skill:test
```

## Example Cases and Test Data

- Requests:
  - `skills/go-photo-studio/examples/requests/resume-modern.zh.json`
  - `skills/go-photo-studio/examples/requests/id-standard.en.json`
  - `skills/go-photo-studio/examples/requests/invalid-missing-ratio.json`
  - `skills/go-photo-studio/examples/requests/e2e-mock.en.json` (offline e2e chain demo)
  - `skills/go-photo-studio/examples/requests/e2e-online.template.json` (real online e2e template)
- Example output:
  - `skills/go-photo-studio/examples/outputs/compose.resume-modern.zh.json`
- Eval data:
  - `skills/go-photo-studio/references/eval/eval.json`

## Structure

- Skill entry: `skills/go-photo-studio/SKILL.md`
- References: `skills/go-photo-studio/references/`
- Scripts: `skills/go-photo-studio/scripts/`
- Examples: `skills/go-photo-studio/examples/`
- Smoke test: `skills/go-photo-studio/tests/smoke.cjs`
- Architecture: `ARCHITECTURE.md`
- Status: `skills/go-photo-studio/references/status.md`

## Integration Docs

- Claude: `CLAUDE.md`
- IDE agents: `IDE.md`

## CLI Online Generation

- Providers: `gemini`, `openai`
- Script: `skills/go-photo-studio/scripts/generate-with-provider.cjs`
- Used via `run-pipeline --generate-cmd` in `skill:e2e:online:*` scripts.

## Python Dependency Scope

Python is optional and used only for deterministic local identity scoring:

```bash
pip install -r skills/go-photo-studio/scripts/requirements.txt
```

## Honest Remaining Gaps

- `eval.json` is currently starter-scale (12 records), not production-grade statistically.
- `skill:e2e:mock` verifies request->pipeline->output artifact chain, not real model quality.
- `skill:e2e:online:*` is a minimal real generation path; output quality still depends on provider model revision and source image quality.
- README docs are multilingual, but script-level request `language` currently supports `en|zh` only.
- Without API keys, A/B/E run fallback modes suitable for contract testing, not quality benchmarking.
- `person_style_transformer_integration.py` is legacy research code and not part of the public skill runtime path.

## Language Label Note

- GitHub does not use a `Node.js` language label; it classifies code as `JavaScript`/`TypeScript`.
- This repository's core runtime is Node.js scripts (`*.cjs`) plus JSON data.
- `.gitattributes` marks the demo frontend TS/TSX as `linguist-vendored` so language stats better reflect the skill runtime.

## License

MIT. See [LICENSE](./LICENSE).

## Community

- Contributing guide: `CONTRIBUTING.md`
- Code of conduct: `CODE_OF_CONDUCT.md`
- Issue templates: `.github/ISSUE_TEMPLATE/`
- PR template: `.github/pull_request_template.md`
