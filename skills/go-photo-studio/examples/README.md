# Examples

This folder provides runnable sample requests and expected artifacts.

## Request samples

- `requests/resume-modern.zh.json`: Chinese resume portrait request.
- `requests/id-standard.en.json`: English ID-style request.
- `requests/invalid-missing-ratio.json`: Negative case for validation tests.
- `requests/e2e-mock.en.json`: Data-URI based offline e2e pipeline demo request.

## Output samples

- `outputs/compose.resume-modern.zh.json`: Example output from `compose_prompt.cjs`.

## Reproduce

```bash
node skills/go-photo-studio/scripts/validate_request.cjs --input skills/go-photo-studio/examples/requests/resume-modern.zh.json
node skills/go-photo-studio/scripts/compose_prompt.cjs --input skills/go-photo-studio/examples/requests/resume-modern.zh.json > skills/go-photo-studio/examples/outputs/compose.resume-modern.zh.json
node skills/go-photo-studio/scripts/run-pipeline.cjs --request skills/go-photo-studio/examples/requests/e2e-mock.en.json --provider gemini --outdir .pipeline-out --max-retries 0 --generate-cmd "node skills/go-photo-studio/scripts/mock-generate.cjs --output {output}"
```

## Note

`image_uri` in these request files points to placeholder paths for contract demonstration.
Use real local files, URLs, or data URIs when running full generation and verification.
