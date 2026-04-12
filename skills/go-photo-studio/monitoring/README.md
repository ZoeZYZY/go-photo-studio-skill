# Monitoring Dashboard

This folder stores generated quality monitoring artifacts.

## Generated files

- `dashboard.json`: machine-readable aggregate metrics.
- `dashboard.md`: human-readable summary for quick review.

## Build command

```bash
npm run skill:dashboard
```

## Data source

- `.pipeline-history/runs.ndjson`
- Appended automatically by `skills/go-photo-studio/scripts/run-pipeline.cjs`
