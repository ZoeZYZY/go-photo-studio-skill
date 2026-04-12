#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { sanitizeUserConstraints } = require('./lib/sanitize.cjs');

function parseArgs(argv) {
  const requestIdx = argv.indexOf('--request');
  const stageAIdx = argv.indexOf('--stage-a');
  const stageBIdx = argv.indexOf('--stage-b');

  if (requestIdx === -1 || !argv[requestIdx + 1]) {
    throw new Error('Usage: node stage-c-guided-stylization.cjs --request <request.json> --stage-a <stage-a.json> --stage-b <stage-b.json>');
  }
  if (stageAIdx === -1 || !argv[stageAIdx + 1] || stageBIdx === -1 || !argv[stageBIdx + 1]) {
    throw new Error('Both --stage-a and --stage-b are required.');
  }

  return {
    request: argv[requestIdx + 1],
    stageA: argv[stageAIdx + 1],
    stageB: argv[stageBIdx + 1],
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const request = readJson(path.resolve(args.request));
    const stageA = readJson(path.resolve(args.stageA));
    const stageB = readJson(path.resolve(args.stageB));
    const presetData = readJson(path.resolve(__dirname, '../references/presets.json'));

    const preset = (presetData.presets || []).find((p) => p.id === request.preset_id);
    if (!preset) {
      throw new Error('preset_id not found in references/presets.json');
    }

    const identityConfidence = Number(stageB?.identity_anchors?.confidence ?? 0.9);
    const riskFlags = stageA.risk_flags || [];
    const extraGuardrails = [];
    const sanitizedConstraints = sanitizeUserConstraints(request.constraints);
    const retryExtraConstraints = Array.isArray(request.retry_extra_constraints)
      ? request.retry_extra_constraints.filter((x) => typeof x === 'string' && x.trim().length > 0)
      : [];
    if (identityConfidence < 0.7 || riskFlags.includes('fallback_mode')) {
      extraGuardrails.push('no facial feature reshaping');
      extraGuardrails.push('no skin over-smoothing');
      extraGuardrails.push('no eye enlargement');
    }

    const output = {
      version: '1.0.0',
      stage: 'C',
      stage_name: 'guided_stylization',
      input_stage: ['A', 'B'],
      style_payload: {
        system_prompt: 'Identity-preserving portrait generation with strict realism and safety constraints.',
        style_prompt: preset.style_prompt,
        user_constraints: sanitizedConstraints.text || '',
        negative_constraints: [...(preset.negative_constraints || []), ...extraGuardrails, ...retryExtraConstraints],
        identity_anchors: stageB.identity_anchors,
        composition_hint: stageA.composition_layer,
      },
      stage_c_preview_meta: {
        preset_id: preset.id,
        preset_label: preset.label,
        preset_category: preset.category,
        identity_confidence: identityConfidence,
        risk_flags: riskFlags,
        constraints_sanitized: sanitizedConstraints.removed || sanitizedConstraints.reasons.length > 0,
        constraints_sanitization_reasons: sanitizedConstraints.reasons,
      },
      next_stage: 'D',
    };

    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err.message }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
