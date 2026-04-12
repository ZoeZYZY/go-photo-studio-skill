#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { analyzeJsonByProvider } = require('./lib/vision.cjs');

function parseArgs(argv) {
  const inputIdx = argv.indexOf('--input');
  const requestIdx = argv.indexOf('--request');
  const modeIdx = argv.indexOf('--mode');
  const modelIdx = argv.indexOf('--model');
  const providerIdx = argv.indexOf('--provider');

  if (inputIdx === -1 || !argv[inputIdx + 1]) {
    throw new Error('Usage: node stage-b-identity-extract.cjs --input <stage-a.json> [--request <request.json>] [--mode ai|heuristic] [--provider gemini] [--model gemini-2.5-flash]');
  }

  return {
    input: argv[inputIdx + 1],
    request: requestIdx !== -1 && argv[requestIdx + 1] ? argv[requestIdx + 1] : null,
    mode: modeIdx !== -1 && argv[modeIdx + 1] ? argv[modeIdx + 1] : 'ai',
    provider: providerIdx !== -1 && argv[providerIdx + 1] ? argv[providerIdx + 1] : 'gemini',
    model: modelIdx !== -1 && argv[modelIdx + 1] ? argv[modelIdx + 1] : 'gemini-2.5-flash',
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fallbackOutput(stageA, reason) {
  return {
    version: '1.1.0',
    stage: 'B',
    stage_name: 'identity_extract',
    analysis_mode: 'heuristic_fallback',
    fallback_reason: reason,
    input_stage: 'A',
    identity_anchors: {
      face_geometry_lock: true,
      age_cue_lock: true,
      skin_texture_lock: true,
      ethnicity_lock: true,
      confidence: 0.55,
    },
    forbidden_changes: [
      'face_swap',
      'de-aging',
      'ethnicity_shift',
      'plastic_skin_smoothing',
    ],
    inherited_risk_flags: stageA.risk_flags || [],
    next_stage: 'C',
  };
}

async function aiOutput(stageA, request, provider, model, apiKey) {
  const prompt = [
    'Analyze this face image for identity-preserving transformation.',
    'Return strict JSON only with no markdown.',
    'Output schema:',
    '{',
    '  "identity_anchors": {',
    '    "face_geometry_lock": boolean,',
    '    "age_cue_lock": boolean,',
    '    "skin_texture_lock": boolean,',
    '    "ethnicity_lock": boolean,',
    '    "confidence": number',
    '  },',
    '  "forbidden_changes": string[]',
    '}',
  ].join('\n');

  const analyzed = await analyzeJsonByProvider({
    provider,
    imageUri: request.image_uri,
    prompt,
    model,
    apiKey,
  });

  return {
    version: '1.1.0',
    stage: 'B',
    stage_name: 'identity_extract',
    analysis_mode: 'ai_vision',
    input_stage: 'A',
    identity_anchors: analyzed.identity_anchors,
    forbidden_changes: Array.isArray(analyzed.forbidden_changes)
      ? analyzed.forbidden_changes
      : ['face_swap', 'de-aging', 'ethnicity_shift', 'plastic_skin_smoothing'],
    inherited_risk_flags: stageA.risk_flags || [],
    next_stage: 'C',
  };
}

function resolveProviderApiKey(provider) {
  if (provider === 'openai') return process.env.OPENAI_API_KEY || '';
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY || '';
  return process.env.GEMINI_API_KEY || '';
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const stageA = readJson(path.resolve(args.input));

    if (args.mode === 'heuristic') {
      process.stdout.write(JSON.stringify(fallbackOutput(stageA, 'forced_heuristic_mode'), null, 2) + '\n');
      return;
    }

    if (!args.request) {
      process.stdout.write(JSON.stringify(fallbackOutput(stageA, 'request_missing_for_ai_mode'), null, 2) + '\n');
      return;
    }

    const request = readJson(path.resolve(args.request));
    const apiKey = resolveProviderApiKey(args.provider);

    if (!apiKey) {
      process.stdout.write(JSON.stringify(fallbackOutput(stageA, `missing_${args.provider}_api_key`), null, 2) + '\n');
      return;
    }

    try {
      const output = await aiOutput(stageA, request, args.provider, args.model, apiKey);
      process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    } catch (err) {
      process.stdout.write(JSON.stringify(fallbackOutput(stageA, `ai_analysis_failed: ${err.message}`), null, 2) + '\n');
    }
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err.message }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
