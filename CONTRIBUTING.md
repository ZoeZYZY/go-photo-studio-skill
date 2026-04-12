# Contributing Guide

Thanks for contributing to GO Photo Studio Skill.

## Project Scope

This project focuses on identity-preserving professional portrait workflows:
- structured presets
- staged pipeline (A->E)
- verification gate and retry policy
- provider-portable script contracts

Out of scope:
- face swap
- impersonation / deepfake behavior
- deceptive identity document forgery

## Local Setup

```bash
npm install
npm run lint
npm run skill:test
```

Optional calibration run:

```bash
npm run skill:calibrate
```

## Branch and PR Workflow

1. Create a feature branch from `main`.
2. Keep PRs small and focused.
3. Run required checks locally.
4. Open PR using `.github/pull_request_template.md`.

## Commit Style

Prefer concise conventional prefixes:
- `feat:` new behavior
- `fix:` bug fix
- `chore:` maintenance/docs/tooling
- `refactor:` internal structure changes
- `test:` tests and fixtures

## Required Checks Before PR

- `npm run lint` passes
- `npm run skill:test` passes
- docs updated when behavior/contracts change
- examples updated when request/output contract changes

## File-Level Guidelines

- Script contracts: `skills/go-photo-studio/scripts/`
- Preset data: `skills/go-photo-studio/references/presets.json`
- Thresholds: `skills/go-photo-studio/references/verification-thresholds.json`
- Eval set: `skills/go-photo-studio/references/eval/eval.json`

If you change any of the above, include rationale in PR notes.

## Security and Secrets

Do not commit real API keys.
Use `.env.example` for required variable names only.

## Community

- Bugs/features: open GitHub Issues
- Open-ended questions: GitHub Discussions
