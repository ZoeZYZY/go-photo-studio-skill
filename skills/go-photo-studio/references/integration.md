# Integration Notes

## Provider-agnostic flow
1. Validate request JSON.
2. Build prompt payload with this skill.
3. Map payload to target provider API fields.

## Suggested adapter shape

```ts
type ProviderRequest = {
  imageUri: string;
  systemPrompt: string;
  userPrompt: string;
  stylePrompt: string;
  negativeConstraints: string[];
};
```

## Mapping tips
- Gemini: image in multimodal part + combined prompt text
- OpenAI: image input + system/user text blocks
- Anthropic: image attachment + instruction text

Keep this skill as the single source of prompt rules so provider switching does not change behavior.

## Provider abstraction

Vision analysis scripts accept `--provider` and currently support:
- `gemini`
- `openai`
- `anthropic`

Provider-specific env keys:
- `GEMINI_API_KEY`
- `OPENAI_API_KEY`
- `ANTHROPIC_API_KEY`

Future providers can still be added behind `scripts/lib/vision.cjs` without changing stage contracts.

## Retry orchestration

Use `scripts/run-pipeline.cjs` to run Stage A-E and apply verification-gated retries.
