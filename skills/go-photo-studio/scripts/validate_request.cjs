#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function readJson(filePath) {
  const raw = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(raw);
}

function parseArgs(argv) {
  const inputIdx = argv.indexOf('--input');
  if (inputIdx === -1 || !argv[inputIdx + 1]) {
    throw new Error('Usage: node validate_request.cjs --input <request.json>');
  }
  return { input: argv[inputIdx + 1] };
}

function validate(request, presets) {
  const errors = [];

  if (!request.image_uri || typeof request.image_uri !== 'string') {
    errors.push('`image_uri` is required and must be a string.');
  }

  if (!request.preset_id || typeof request.preset_id !== 'string') {
    errors.push('`preset_id` is required and must be a string.');
  }

  if (!request.output_ratio || !['9:16', '4:5', '1:1', '2:2'].includes(request.output_ratio)) {
    errors.push('`output_ratio` must be one of 9:16, 4:5, 1:1, 2:2.');
  }

  if (!request.language || !['en', 'zh'].includes(request.language)) {
    errors.push('`language` must be `en` or `zh`.');
  }

  if (request.preset_id) {
    const exists = presets.some((p) => p.id === request.preset_id);
    if (!exists) {
      errors.push('`preset_id` not found in references/presets.json.');
    }
  }

  return errors;
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const request = readJson(path.resolve(args.input));
    const presetData = readJson(path.resolve(__dirname, '../references/presets.json'));

    const errors = validate(request, presetData.presets || []);
    if (errors.length > 0) {
      process.stdout.write(JSON.stringify({ ok: false, errors }, null, 2) + '\n');
      process.exit(1);
    }

    process.stdout.write(JSON.stringify({ ok: true }, null, 2) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, errors: [err.message] }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
