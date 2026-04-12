#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : null;
  };
  return {
    presets: get('--presets') || path.resolve(__dirname, '../references/presets.json'),
    output: get('--output') || path.resolve(__dirname, '../references/eval/eval.fixture.112.json'),
    perPreset: Number(get('--per-preset') || 8),
  };
}

function clamp(n) {
  return Number(Math.max(0, Math.min(1, n)).toFixed(3));
}

function jitter(seed, scale) {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  const frac = x - Math.floor(x);
  return (frac - 0.5) * scale;
}

function makeRecord({ presetId, ratio, pass, idx }) {
  const passBase = {
    identity_similarity: 0.89,
    embedding_identity_similarity: 0.74,
    deterministic_identity_similarity: 0.7,
    composition_compliance: 0.84,
    realism_score: 0.8,
    artifact_risk: 0.17,
  };

  const failBase = {
    identity_similarity: 0.74,
    embedding_identity_similarity: 0.61,
    deterministic_identity_similarity: 0.6,
    composition_compliance: 0.67,
    realism_score: 0.65,
    artifact_risk: 0.39,
  };

  const base = pass ? passBase : failBase;
  const seed = idx + ratio.length + presetId.length;

  return {
    preset_id: presetId,
    ratio,
    label_pass: pass,
    metrics: {
      identity_similarity: clamp(base.identity_similarity + jitter(seed + 1, 0.08)),
      embedding_identity_similarity: clamp(base.embedding_identity_similarity + jitter(seed + 2, 0.07)),
      deterministic_identity_similarity: clamp(base.deterministic_identity_similarity + jitter(seed + 3, 0.08)),
      composition_compliance: clamp(base.composition_compliance + jitter(seed + 4, 0.09)),
      realism_score: clamp(base.realism_score + jitter(seed + 5, 0.09)),
      artifact_risk: clamp(base.artifact_risk + jitter(seed + 6, 0.08)),
    },
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const presetData = JSON.parse(fs.readFileSync(path.resolve(args.presets), 'utf8'));
    const presets = presetData.presets || [];
    if (presets.length === 0) throw new Error('No presets found.');

    const ratios = ['4:5', '1:1', '9:16', '2:2'];
    const rows = [];

    let idx = 0;
    for (const preset of presets) {
      for (let i = 0; i < args.perPreset; i += 1) {
        const ratio = ratios[i % ratios.length];
        const pass = i < Math.ceil(args.perPreset * 0.75);
        rows.push(makeRecord({ presetId: preset.id, ratio, pass, idx }));
        idx += 1;
      }
    }

    fs.mkdirSync(path.dirname(path.resolve(args.output)), { recursive: true });
    fs.writeFileSync(path.resolve(args.output), JSON.stringify(rows, null, 2) + '\n');

    process.stdout.write(JSON.stringify({
      ok: true,
      output: path.resolve(args.output),
      records: rows.length,
      presets: presets.length,
      per_preset: args.perPreset,
    }, null, 2) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: err.message }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
