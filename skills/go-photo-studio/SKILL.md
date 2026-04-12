---
name: go-photo-studio
description: Build identity-preserving professional headshot prompts and provider-ready generation payloads from a single photo input. Use when users ask to transform selfies into professional portraits, resume photos, or ID-style images with strict realism and safety constraints.
---

# GO Photo Studio Skill

## When to use

Use this skill when the user wants:
- Professional headshot generation from selfie photos
- Resume/profile/ID-photo styling with realistic skin texture
- Strict identity-preserving prompt construction
- Reusable prompt payloads that can be sent to Gemini/OpenAI/Anthropic adapters

Do not use this skill for:
- Face swapping with celebrities
- Deepfake or impersonation requests
- Illegal identity document forgery

## Inputs

Expect a JSON request with:
- `image_uri`: local file path, URL, or data URI to the source photo
- `preset_id`: style preset ID from `references/presets.json`
- `output_ratio`: one of `9:16`, `4:5`, `1:1`, `2:2`
- `language`: `en` or `zh`
- Optional `constraints`: additional user constraints

## Workflow

1. Validate input with `scripts/validate_request.cjs`.
2. Compose standardized prompt payload with `scripts/compose_prompt.cjs`.
3. Pass payload to the chosen provider adapter in the host project.
4. Return both:
- Provider-ready prompt fields
- Human-readable explanation of chosen preset and safety boundaries

## Progressive Pipeline (Recommended)

Use this when you need layer parsing, identity extraction, and staged refinement.

1. Stage A: Layer parse
```bash
node skills/go-photo-studio/scripts/stage-a-layer-parse.cjs --input request.json --provider gemini > stage-a.json
```

2. Stage B: Identity extract
```bash
node skills/go-photo-studio/scripts/stage-b-identity-extract.cjs --input stage-a.json --request request.json --provider gemini > stage-b.json
```

3. Stage C: Guided stylization
```bash
node skills/go-photo-studio/scripts/stage-c-guided-stylization.cjs --request request.json --stage-a stage-a.json --stage-b stage-b.json > stage-c.json
```

4. Stage D: Refinement and export plan
```bash
node skills/go-photo-studio/scripts/stage-d-refine-export.cjs --request request.json --stage-c stage-c.json > stage-d.json
```

5. Stage E: Verify generated image and decide retry
```bash
node skills/go-photo-studio/scripts/stage-e-verify-generation.cjs --request request.json --generated output.png --provider gemini --thresholds skills/go-photo-studio/references/verification-thresholds.json > stage-e.json
```

If `stage-e.json` returns `pass: false`, retry generation with stronger negative constraints before accepting output.

## Commands

Validate:
```bash
node skills/go-photo-studio/scripts/validate_request.cjs --input request.json
```

Compose payload:
```bash
node skills/go-photo-studio/scripts/compose_prompt.cjs --input request.json
```

Run end-to-end with retry gate:
```bash
node skills/go-photo-studio/scripts/run-pipeline.cjs --request request.json --generated output.png --provider gemini
```

For automatic retries with regenerated outputs, pass `--generate-cmd`:
```bash
node skills/go-photo-studio/scripts/run-pipeline.cjs --request request.json --provider gemini --generate-cmd "your_generator --request {request} --stage-c {stage_c} --stage-d {stage_d} --output {output}"
```

Minimal built-in generator for real provider-backed runs:
```bash
node skills/go-photo-studio/scripts/generate-with-provider.cjs --request request.json --stage-c stage-c.json --stage-d stage-d.json --provider gemini --output output.png
```

Supported `--provider` values: `gemini`, `openai`, `anthropic`.

Calibrate thresholds from labeled eval records:
```bash
node skills/go-photo-studio/scripts/calibrate-thresholds.cjs --input skills/go-photo-studio/references/eval/eval.json --output skills/go-photo-studio/references/verification-thresholds.json
```

## Output contract

The composed payload must include:
- `system_prompt`: identity and realism rules
- `style_prompt`: preset-driven style constraints
- `negative_constraints`: forbidden outcomes
- `metadata`: preset, category, ratio, language, version

## References

- Presets: `references/presets.json`
- Policy boundaries: `references/policy.md`
- Integration notes: `references/integration.md`
- Pipeline spec: `references/pipeline.md`
- Verification thresholds: `references/verification-thresholds.json`
- Status tracker: `references/status.md`
- Eval dataset/template: `references/eval/eval.json` and `references/eval/README.md`
- Example requests/outputs: `examples/`
- Smoke tests: `tests/smoke.cjs`
- Architecture split: `../../ARCHITECTURE.md`
- Optional Python deps for deterministic score: `scripts/requirements.txt`
