#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const outIdx = argv.indexOf('--output');
  if (outIdx === -1 || !argv[outIdx + 1]) {
    throw new Error('Usage: node mock-generate.cjs --output <output.png>');
  }
  return { output: argv[outIdx + 1] };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath = path.resolve(args.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  // 1x1 PNG (white pixel), used for offline e2e flow verification.
  const base64 = 'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wm5j4QAAAAASUVORK5CYII=';
  fs.writeFileSync(outputPath, Buffer.from(base64, 'base64'));

  process.stdout.write(JSON.stringify({ ok: true, output: outputPath }, null, 2) + '\n');
}

try {
  main();
} catch (err) {
  process.stdout.write(JSON.stringify({ ok: false, error: err.message }, null, 2) + '\n');
  process.exit(1);
}
