#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : null;
  };

  return {
    history: get('--history') || path.resolve(process.cwd(), '.pipeline-history/runs.ndjson'),
    output: get('--output') || path.resolve(process.cwd(), 'skills/go-photo-studio/monitoring/dashboard.json'),
    markdown: get('--markdown') || path.resolve(process.cwd(), 'skills/go-photo-studio/monitoring/dashboard.md'),
  };
}

function readNdjson(filePath) {
  const abs = path.resolve(filePath);
  if (!fs.existsSync(abs)) return [];
  const lines = fs.readFileSync(abs, 'utf8').split('\n').map((s) => s.trim()).filter(Boolean);
  const rows = [];
  for (const line of lines) {
    try {
      rows.push(JSON.parse(line));
    } catch (_err) {
      // Ignore malformed rows.
    }
  }
  return rows;
}

function avg(nums) {
  if (!nums.length) return 0;
  return nums.reduce((a, b) => a + b, 0) / nums.length;
}

function buildStats(rows) {
  const total = rows.length;
  const accepted = rows.filter((r) => r.accepted === true).length;
  const failed = total - accepted;
  const failureRate = total > 0 ? failed / total : 0;

  const retries = rows.map((r) => Number(r.retries_used || 0)).filter(Number.isFinite);
  const retryRuns = rows.filter((r) => Number(r.retries_used || 0) > 0).length;

  const byProvider = {};
  const byPreset = {};
  for (const row of rows) {
    const provider = row.provider || 'unknown';
    if (!byProvider[provider]) {
      byProvider[provider] = { total_runs: 0, accepted_runs: 0, failed_runs: 0, avg_retries: 0 };
    }
    byProvider[provider].total_runs += 1;
    if (row.accepted) byProvider[provider].accepted_runs += 1;
    else byProvider[provider].failed_runs += 1;

    const preset = row.preset_id || 'unknown';
    if (!byPreset[preset]) {
      byPreset[preset] = { total_runs: 0, accepted_runs: 0, failed_runs: 0, avg_retries: 0 };
    }
    byPreset[preset].total_runs += 1;
    if (row.accepted) byPreset[preset].accepted_runs += 1;
    else byPreset[preset].failed_runs += 1;
  }

  for (const [provider, stat] of Object.entries(byProvider)) {
    const providerRetries = rows
      .filter((r) => (r.provider || 'unknown') === provider)
      .map((r) => Number(r.retries_used || 0))
      .filter(Number.isFinite);
    stat.avg_retries = Number(avg(providerRetries).toFixed(3));
    stat.failure_rate = stat.total_runs > 0 ? Number((stat.failed_runs / stat.total_runs).toFixed(4)) : 0;
  }
  for (const [preset, stat] of Object.entries(byPreset)) {
    const presetRetries = rows
      .filter((r) => (r.preset_id || 'unknown') === preset)
      .map((r) => Number(r.retries_used || 0))
      .filter(Number.isFinite);
    stat.avg_retries = Number(avg(presetRetries).toFixed(3));
    stat.failure_rate = stat.total_runs > 0 ? Number((stat.failed_runs / stat.total_runs).toFixed(4)) : 0;
  }

  const recent = rows.slice(-20);

  return {
    generated_at: new Date().toISOString(),
    totals: {
      total_runs: total,
      accepted_runs: accepted,
      failed_runs: failed,
      failure_rate: Number(failureRate.toFixed(4)),
      retry_runs: retryRuns,
      avg_retries: Number(avg(retries).toFixed(3)),
    },
    by_provider: byProvider,
    by_preset: byPreset,
    recent_runs: recent,
  };
}

function toMarkdown(stats) {
  const t = stats.totals;
  const providers = Object.entries(stats.by_provider)
    .map(([name, s]) => `| ${name} | ${s.total_runs} | ${s.failed_runs} | ${s.failure_rate} | ${s.avg_retries} |`)
    .join('\n');
  const presets = Object.entries(stats.by_preset)
    .sort((a, b) => b[1].total_runs - a[1].total_runs)
    .slice(0, 15)
    .map(([name, s]) => `| ${name} | ${s.total_runs} | ${s.failed_runs} | ${s.failure_rate} | ${s.avg_retries} |`)
    .join('\n');

  return [
    '# Generation Quality Dashboard',
    '',
    `Updated: ${stats.generated_at}`,
    '',
    '## Global Metrics',
    '',
    `- Total runs: ${t.total_runs}`,
    `- Failed runs: ${t.failed_runs}`,
    `- Failure rate: ${t.failure_rate}`,
    `- Runs with retries: ${t.retry_runs}`,
    `- Average retries: ${t.avg_retries}`,
    '',
    '## Provider Breakdown',
    '',
    '| Provider | Total runs | Failed runs | Failure rate | Avg retries |',
    '| :--- | ---: | ---: | ---: | ---: |',
    providers || '| (none) | 0 | 0 | 0 | 0 |',
    '',
    '## Preset Breakdown (Top 15 by run volume)',
    '',
    '| Preset | Total runs | Failed runs | Failure rate | Avg retries |',
    '| :--- | ---: | ---: | ---: | ---: |',
    presets || '| (none) | 0 | 0 | 0 | 0 |',
    '',
    '## Notes',
    '',
    '- This dashboard is generated from `.pipeline-history/runs.ndjson`.',
    '- If no API keys are configured, many runs will be dry/fallback and may skew failure rate.',
  ].join('\n');
}

function writeFile(filePath, content) {
  const abs = path.resolve(filePath);
  fs.mkdirSync(path.dirname(abs), { recursive: true });
  fs.writeFileSync(abs, content);
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const rows = readNdjson(args.history);
    const stats = buildStats(rows);

    writeFile(args.output, JSON.stringify(stats, null, 2) + '\n');
    writeFile(args.markdown, toMarkdown(stats) + '\n');

    process.stdout.write(JSON.stringify({
      ok: true,
      history: path.resolve(args.history),
      output: path.resolve(args.output),
      markdown: path.resolve(args.markdown),
      total_runs: stats.totals.total_runs,
    }, null, 2) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: err.message }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
