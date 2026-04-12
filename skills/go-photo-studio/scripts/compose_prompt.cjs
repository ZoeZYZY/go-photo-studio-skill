#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { sanitizeUserConstraints } = require('./lib/sanitize.cjs');

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function parseArgs(argv) {
  const inputIdx = argv.indexOf('--input');
  if (inputIdx === -1 || !argv[inputIdx + 1]) {
    throw new Error('Usage: node compose_prompt.cjs --input <request.json>');
  }
  return { input: argv[inputIdx + 1] };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const request = readJson(path.resolve(args.input));
    const presetData = readJson(path.resolve(__dirname, '../references/presets.json'));
    const preset = (presetData.presets || []).find((p) => p.id === request.preset_id);

    if (!preset) {
      throw new Error('preset_id not found. Run validate_request.cjs first.');
    }

    const systemPrompt = [
      'You are an identity-preserving portrait generation assistant.',
      'Preserve facial geometry, age cues, skin micro-texture, and ethnicity.',
      'Do not perform face swap, impersonation, or deceptive transformations.'
    ].join(' ');

    const sanitizedConstraints = sanitizeUserConstraints(request.constraints);

    const userPrompt = [
      `Apply preset: ${preset.label}.`,
      `Output ratio: ${request.output_ratio}.`,
      sanitizedConstraints.text ? `Additional constraints: ${sanitizedConstraints.text}.` : ''
    ].filter(Boolean).join(' ');

    const output = {
      image_uri: request.image_uri,
      system_prompt: systemPrompt,
      style_prompt: preset.style_prompt,
      user_prompt: userPrompt,
      negative_constraints: preset.negative_constraints || [],
      metadata: {
        skill: 'go-photo-studio',
        version: presetData.version || '1.0.0',
        preset_id: preset.id,
        preset_category: preset.category,
        language: request.language,
        output_ratio: request.output_ratio,
        constraints_sanitized: sanitizedConstraints.removed || sanitizedConstraints.reasons.length > 0,
        constraints_sanitization_reasons: sanitizedConstraints.reasons,
      },
    };

    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err.message }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
