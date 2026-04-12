# Evaluation Set

This directory now includes a starter labeled set:

- `eval.json` (12 records)
- positive/negative labels mixed
- metrics aligned with Stage E contracts

You can extend the file with your own annotated results. Record shape:

```json
[
  {
    "ratio": "4:5",
    "label_pass": true,
    "metrics": {
      "identity_similarity": 0.91,
      "deterministic_identity_similarity": 0.73,
      "composition_compliance": 0.84,
      "realism_score": 0.80,
      "artifact_risk": 0.18
    }
  }
]
```

Run calibration:

```bash
node skills/go-photo-studio/scripts/calibrate-thresholds.cjs --input skills/go-photo-studio/references/eval/eval.json --output skills/go-photo-studio/references/verification-thresholds.json
```
