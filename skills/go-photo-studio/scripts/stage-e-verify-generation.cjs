#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const { analyzeJsonMultiByProvider } = require('./lib/vision.cjs');

function parseArgs(argv) {
  const requestIdx = argv.indexOf('--request');
  const generatedIdx = argv.indexOf('--generated');
  const modelIdx = argv.indexOf('--model');
  const providerIdx = argv.indexOf('--provider');
  const thresholdFileIdx = argv.indexOf('--thresholds');

  if (requestIdx === -1 || !argv[requestIdx + 1] || generatedIdx === -1 || !argv[generatedIdx + 1]) {
    throw new Error('Usage: node stage-e-verify-generation.cjs --request <request.json> --generated <image_uri> [--provider gemini] [--model gemini-2.5-flash] [--thresholds <file>]');
  }

  return {
    request: argv[requestIdx + 1],
    generated: argv[generatedIdx + 1],
    provider: providerIdx !== -1 && argv[providerIdx + 1] ? argv[providerIdx + 1] : 'gemini',
    model: modelIdx !== -1 && argv[modelIdx + 1] ? argv[modelIdx + 1] : 'gemini-2.5-flash',
    thresholds: thresholdFileIdx !== -1 && argv[thresholdFileIdx + 1]
      ? argv[thresholdFileIdx + 1]
      : path.resolve(__dirname, '../references/verification-thresholds.json'),
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fallback(reason) {
  return {
    version: '1.0.0',
    stage: 'E',
    stage_name: 'verify_generation',
    verification_mode: 'unavailable',
    reason,
    metrics: {
      identity_similarity: null,
      composition_compliance: null,
      realism_score: null,
      artifact_risk: null,
    },
    pass: false,
    action: 'manual_review_required',
  };
}

function resolveProviderApiKey(provider) {
  if (provider === 'openai') return process.env.OPENAI_API_KEY || '';
  if (provider === 'anthropic') return process.env.ANTHROPIC_API_KEY || '';
  return process.env.GEMINI_API_KEY || '';
}

function loadThresholds(filePath, ratio, presetId) {
  const cfg = readJson(path.resolve(filePath));
  const global = cfg.default || {};
  const ratioProfile = cfg.by_ratio?.[ratio] || {};
  const presetProfile = cfg.by_preset?.[presetId] || {};
  return {
    identity_similarity: presetProfile.identity_similarity ?? ratioProfile.identity_similarity ?? global.identity_similarity ?? 0.82,
    embedding_identity_similarity: presetProfile.embedding_identity_similarity ?? ratioProfile.embedding_identity_similarity ?? global.embedding_identity_similarity ?? 0.68,
    deterministic_identity_similarity: presetProfile.deterministic_identity_similarity ?? ratioProfile.deterministic_identity_similarity ?? global.deterministic_identity_similarity ?? 0.66,
    composition_compliance: presetProfile.composition_compliance ?? ratioProfile.composition_compliance ?? global.composition_compliance ?? 0.75,
    realism_score: presetProfile.realism_score ?? ratioProfile.realism_score ?? global.realism_score ?? 0.72,
    artifact_risk_max: presetProfile.artifact_risk_max ?? ratioProfile.artifact_risk_max ?? global.artifact_risk_max ?? 0.35,
  };
}

function runEmbeddingIdentityScore(sourceUri, generatedUri) {
  const scriptPath = path.resolve(__dirname, 'embedding-identity-score.py');
  try {
    const raw = execFileSync('python3', [scriptPath, '--source', sourceUri, '--generated', generatedUri], { encoding: 'utf8' }).trim();
    const parsed = JSON.parse(raw);
    if (typeof parsed.embedding_identity_similarity === 'number') {
      return parsed.embedding_identity_similarity;
    }
    return null;
  } catch (_err) {
    return null;
  }
}

function runDeterministicIdentityScore(sourceUri, generatedUri) {
  const scriptPath = path.resolve(__dirname, 'deterministic-identity-score.py');
  try {
    const raw = execFileSync('python3', [scriptPath, '--source', sourceUri, '--generated', generatedUri], { encoding: 'utf8' }).trim();
    const parsed = JSON.parse(raw);
    if (typeof parsed.deterministic_identity_similarity === 'number') {
      return parsed.deterministic_identity_similarity;
    }
    return null;
  } catch (_err) {
    return null;
  }
}

function decideAction(metrics, thresholds) {
  const embeddingPass = typeof metrics.embedding_identity_similarity === 'number'
    ? metrics.embedding_identity_similarity >= thresholds.embedding_identity_similarity
    : true;
  const deterministicPass = typeof metrics.deterministic_identity_similarity === 'number'
    ? metrics.deterministic_identity_similarity >= thresholds.deterministic_identity_similarity
    : true;
  const pass = metrics.identity_similarity >= thresholds.identity_similarity
    && embeddingPass
    && metrics.composition_compliance >= thresholds.composition_compliance
    && metrics.realism_score >= thresholds.realism_score
    && metrics.artifact_risk <= thresholds.artifact_risk_max
    && deterministicPass;

  return {
    pass,
    action: pass ? 'accept' : 'retry_with_stronger_constraints',
  };
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const request = readJson(path.resolve(args.request));
    const apiKey = resolveProviderApiKey(args.provider);
    const thresholds = loadThresholds(args.thresholds, request.output_ratio, request.preset_id);

    if (!apiKey) {
      process.stdout.write(JSON.stringify(fallback(`missing_${args.provider}_api_key`), null, 2) + '\n');
      return;
    }

    const prompt = [
      'You receive two images in order: (1) source portrait, (2) generated portrait.',
      'Compare them for identity-preserving professional headshot quality.',
      'Return strict JSON only and nothing else.',
      'Output schema:',
      '{',
      '  "metrics": {',
      '    "identity_similarity": number,',
      '    "composition_compliance": number,',
      '    "realism_score": number,',
      '    "artifact_risk": number',
      '  },',
      '  "notes": string[]',
      '}',
      `Target ratio: ${request.output_ratio}.`,
      'All score values must be normalized to [0, 1].',
    ].join('\n');

    const generatedAnalysis = await analyzeJsonMultiByProvider({
      provider: args.provider,
      imageUris: [request.image_uri, args.generated],
      prompt,
      model: args.model,
      apiKey,
    });

    const metrics = generatedAnalysis.metrics || {};
    metrics.embedding_identity_similarity = runEmbeddingIdentityScore(request.image_uri, args.generated);
    metrics.deterministic_identity_similarity = runDeterministicIdentityScore(request.image_uri, args.generated);
    const decision = decideAction(metrics, thresholds);

    const output = {
      version: '1.0.0',
      stage: 'E',
      stage_name: 'verify_generation',
      verification_mode: 'ai_vision',
      metrics,
      thresholds,
      notes: Array.isArray(generatedAnalysis.notes) ? generatedAnalysis.notes : [],
      pass: decision.pass,
      action: decision.action,
    };

    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify(fallback(`verification_failed: ${err.message}`), null, 2) + '\n');
  }
}

main();
