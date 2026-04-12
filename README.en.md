<div align="center">

# GO Photo Studio Skill

> An identity-preserving portrait generation skill with layered analysis, controllable stylization, quality gates, and retry orchestration.

[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Skill](https://img.shields.io/badge/Codex-Skill-7c3aed)](./skills/go-photo-studio/SKILL.md)
[![Pipeline](https://img.shields.io/badge/Pipeline-A%E2%86%92E-0ea5e9)](./skills/go-photo-studio/references/pipeline.md)

**Languages**: [简体中文](./README.md) · [English](./README.en.md)

</div>

---

## Overview

GO Photo Studio Skill turns “raw selfie + vague request” into an auditable, reusable, and provider-portable professional portrait workflow.

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
| `resume-modern` | Modern Resume | resume |
| `id-standard` | ID Standard | id |

## Quick Start

```bash
node skills/go-photo-studio/scripts/validate_request.cjs --input request.json
node skills/go-photo-studio/scripts/compose_prompt.cjs --input request.json
node skills/go-photo-studio/scripts/run-pipeline.cjs --request request.json --generated output.png --provider gemini
```

## License

MIT. See [LICENSE](./LICENSE).
