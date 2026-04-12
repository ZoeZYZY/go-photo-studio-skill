# Progressive Portrait Pipeline

## Goal

Turn a single user photo into a controllable, identity-preserving portrait workflow with explicit stage outputs.

## Stage A: Layer Parse

Purpose:
- Parse the input into logical visual layers for controlled edits.

Outputs:
- `subject_layer`: face + hair + neck + upper shoulder anchor
- `background_layer`: scene/background region
- `light_layer`: coarse lighting and color-cast notes
- `composition_layer`: crop, head ratio, pose direction

Required checks:
- Subject center and head size estimate
- Edge quality risks (halo, cutout artifacts)
- Missing shoulder/torso risk score

## Stage B: Identity Extract

Purpose:
- Extract stable identity anchors that should remain unchanged across style transforms.

Outputs:
- `identity_anchors`: face geometry, age cues, skin texture, ethnic cues
- `forbidden_changes`: list of disallowed manipulations

Required checks:
- Face-shape consistency lock
- Eye/nose/mouth proportion lock
- Age-preservation lock

## Stage C: Guided Stylization

Purpose:
- Apply selected style preset while honoring Stage A/B constraints.

Inputs:
- Preset from `references/presets.json`
- Stage A and Stage B outputs

Outputs:
- `style_payload`: provider-ready prompt payload with explicit constraints
- `stage_c_preview_meta`: metadata for iterative refinement

Required checks:
- No face-swap intent
- No over-retouching intent
- Preset negative constraints attached

## Stage D: Refinement + Export

Purpose:
- Final realism pass and ratio-specific export planning.

Outputs:
- `refinement_notes`: texture/edge/light corrections
- `export_plan`: target ratio (`9:16`, `4:5`, `1:1`, `2:2`), quality profile

Required checks:
- Skin micro-texture preserved
- Natural edge transition
- Ratio framing validity

## Stage E: Verification + Retry Gate

Purpose:
- Compare source and generated image and decide whether to accept or retry.

Outputs:
- `metrics.identity_similarity` in `[0,1]`
- `metrics.composition_compliance` in `[0,1]`
- `metrics.realism_score` in `[0,1]`
- `metrics.artifact_risk` in `[0,1]`
- `pass`: boolean
- `action`: `accept` or `retry_with_stronger_constraints`

Required checks:
- Identity similarity above threshold
- Composition compliance above threshold
- Artifact risk below threshold

Threshold tuning:
- Keep default thresholds in `references/verification-thresholds.json`
- Calibrate by ratio using your internal validation set before production rollout

## Data contract

Each stage should emit JSON and be serializable to disk for auditability.

Suggested handoff object:

```json
{
  "version": "1.0.0",
  "request": {},
  "stage_a": {},
  "stage_b": {},
  "stage_c": {},
  "stage_d": {},
  "stage_e": {}
}
```
