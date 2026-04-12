# Evaluation Set Template

Prepare a JSON file with records shaped like:

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

Then run calibration:

```bash
node skills/go-photo-studio/scripts/calibrate-thresholds.cjs --input eval.json --output skills/go-photo-studio/references/verification-thresholds.json
```
