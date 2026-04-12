#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { analyzeJsonByProvider } = require('./lib/vision.cjs');

function parseArgs(argv) {
  const inputIdx = argv.indexOf('--input');
  const modeIdx = argv.indexOf('--mode');
  const modelIdx = argv.indexOf('--model');
  const providerIdx = argv.indexOf('--provider');

  if (inputIdx === -1 || !argv[inputIdx + 1]) {
    throw new Error('Usage: node stage-a-layer-parse.cjs --input <request.json> [--mode ai|heuristic] [--provider gemini] [--model gemini-2.5-flash]');
  }

  return {
    input: argv[inputIdx + 1],
    mode: modeIdx !== -1 && argv[modeIdx + 1] ? argv[modeIdx + 1] : 'ai',
    provider: providerIdx !== -1 && argv[providerIdx + 1] ? argv[providerIdx + 1] : 'gemini',
    model: modelIdx !== -1 && argv[modelIdx + 1] ? argv[modelIdx + 1] : 'gemini-2.5-flash',
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fallbackOutput(request, reason) {
  return {
    version: '1.1.0',
    stage: 'A',
    stage_name: 'layer_parse',
    analysis_mode: 'heuristic_fallback',
    fallback_reason: reason,
    input: {
      image_uri: request.image_uri,
      output_ratio: request.output_ratio,
    },
    subject_layer: {
      has_face_anchor: true,
      estimated_head_ratio: 0.4,
      pose_direction: 'frontal_or_near_frontal',
    },
    background_layer: {
      type: 'unknown',
      clutter_risk: 'medium',
    },
    light_layer: {
      color_cast: 'unknown',
      harsh_shadow_risk: 'medium',
    },
    composition_layer: {
      crop_tightness: 'unknown',
      shoulder_completion_required: true,
    },
    risk_flags: ['coarse_estimation_only', 'fallback_mode'],
    next_stage: 'B',
  };
}

async function aiOutput(request, provider, model, apiKey) {
  const prompt = [
    'Analyze this portrait image and return JSON only.',
    'No markdown, no explanation.',
    'Output schema:',
    '{',
    '  "subject_layer": { "has_face_anchor": boolean, "estimated_head_ratio": number, "pose_direction": "frontal|three_quarter|profile|unknown" },',
    '  "background_layer": { "type": "plain|office|outdoor|unknown", "clutter_risk": "low|medium|high" },',
    '  "light_layer": { "color_cast": "neutral|warm|cool|mixed|unknown", "harsh_shadow_risk": "low|medium|high" },',
    '  "composition_layer": { "crop_tightness": "loose|balanced|tight|unknown", "shoulder_completion_required": boolean },',
    '  "risk_flags": string[]',
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
    stage: 'A',
    stage_name: 'layer_parse',
    analysis_mode: 'ai_vision',
    input: {
      image_uri: request.image_uri,
      output_ratio: request.output_ratio,
    },
    subject_layer: analyzed.subject_layer,
    background_layer: analyzed.background_layer,
    light_layer: analyzed.light_layer,
    composition_layer: analyzed.composition_layer,
    risk_flags: Array.isArray(analyzed.risk_flags) ? analyzed.risk_flags : [],
    next_stage: 'B',
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
    const request = readJson(path.resolve(args.input));

    if (args.mode === 'heuristic') {
      process.stdout.write(JSON.stringify(fallbackOutput(request, 'forced_heuristic_mode'), null, 2) + '\n');
      return;
    }

    const apiKey = resolveProviderApiKey(args.provider);
    if (!apiKey) {
      process.stdout.write(JSON.stringify(fallbackOutput(request, `missing_${args.provider}_api_key`), null, 2) + '\n');
      return;
    }

    try {
      const output = await aiOutput(request, args.provider, args.model, apiKey);
      process.stdout.write(JSON.stringify(output, null, 2) + '\n');
    } catch (err) {
      process.stdout.write(JSON.stringify(fallbackOutput(request, `ai_analysis_failed: ${err.message}`), null, 2) + '\n');
    }
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err.message }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
