#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const inputIdx = argv.indexOf('--input');
  const outputIdx = argv.indexOf('--output');
  if (inputIdx === -1 || !argv[inputIdx + 1]) {
    throw new Error('Usage: node calibrate-thresholds.cjs --input <eval.json> [--output <thresholds.json>]');
  }
  return {
    input: argv[inputIdx + 1],
    output: outputIdx !== -1 && argv[outputIdx + 1]
      ? argv[outputIdx + 1]
      : path.resolve(__dirname, '../references/verification-thresholds.json'),
  };
}

function q(values, quantile) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.max(0, Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * quantile)));
  return sorted[idx];
}

function collect(records) {
  const positives = records.filter((r) => r.label_pass === true);
  const byRatio = {};

  const metricsFor = (rows, key) => rows
    .map((r) => Number(r?.metrics?.[key]))
    .filter((n) => Number.isFinite(n));

  const makeProfile = (rows) => {
    const id = metricsFor(rows, 'identity_similarity');
    const emb = metricsFor(rows, 'embedding_identity_similarity');
    const det = metricsFor(rows, 'deterministic_identity_similarity');
    const comp = metricsFor(rows, 'composition_compliance');
    const real = metricsFor(rows, 'realism_score');
    const art = metricsFor(rows, 'artifact_risk');

    return {
      identity_similarity: q(id, 0.2),
      embedding_identity_similarity: q(emb, 0.2),
      deterministic_identity_similarity: q(det, 0.2),
      composition_compliance: q(comp, 0.2),
      realism_score: q(real, 0.2),
      artifact_risk_max: q(art, 0.8),
    };
  };

  const defaultProfile = makeProfile(positives);

  const ratios = [...new Set(records.map((r) => r.ratio).filter(Boolean))];
  for (const ratio of ratios) {
    const pos = positives.filter((r) => r.ratio === ratio);
    if (pos.length >= 3) {
      byRatio[ratio] = makeProfile(pos);
    }
  }

  return { default: defaultProfile, by_ratio: byRatio };
}

function withFallbacks(profile, fallback) {
  return {
    identity_similarity: profile.identity_similarity ?? fallback.identity_similarity,
    embedding_identity_similarity: profile.embedding_identity_similarity ?? fallback.embedding_identity_similarity,
    deterministic_identity_similarity: profile.deterministic_identity_similarity ?? fallback.deterministic_identity_similarity,
    composition_compliance: profile.composition_compliance ?? fallback.composition_compliance,
    realism_score: profile.realism_score ?? fallback.realism_score,
    artifact_risk_max: profile.artifact_risk_max ?? fallback.artifact_risk_max,
  };
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const records = JSON.parse(fs.readFileSync(path.resolve(args.input), 'utf8'));
    if (!Array.isArray(records) || records.length === 0) {
      throw new Error('input must be a non-empty JSON array');
    }

    const raw = collect(records);
    const fallback = {
      identity_similarity: 0.82,
      embedding_identity_similarity: 0.68,
      deterministic_identity_similarity: 0.66,
      composition_compliance: 0.75,
      realism_score: 0.72,
      artifact_risk_max: 0.35,
    };

    const out = {
      default: withFallbacks(raw.default || {}, fallback),
      by_ratio: {},
      calibrated_from: {
        records: records.length,
        positives: records.filter((r) => r.label_pass === true).length,
      },
    };

    for (const [ratio, profile] of Object.entries(raw.by_ratio || {})) {
      out.by_ratio[ratio] = withFallbacks(profile, out.default);
    }

    fs.writeFileSync(path.resolve(args.output), JSON.stringify(out, null, 2) + '\n');
    process.stdout.write(JSON.stringify({ ok: true, output: path.resolve(args.output) }, null, 2) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: err.message }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
