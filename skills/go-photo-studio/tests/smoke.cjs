#!/usr/bin/env node

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '../../..');
const scriptsDir = path.resolve(root, 'skills/go-photo-studio/scripts');
const examplesDir = path.resolve(root, 'skills/go-photo-studio/examples');
const evalFile = path.resolve(root, 'skills/go-photo-studio/references/eval/eval.json');
const tmpDir = path.resolve(root, '.tmp-skill-smoke');

function runNode(scriptPath, args) {
  const run = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: root,
    encoding: 'utf8',
  });

  let json = null;
  const raw = (run.stdout || '').trim();
  if (raw) {
    try {
      json = JSON.parse(raw);
    } catch (_err) {
      // Keep json as null; caller can inspect stdout when needed.
    }
  }

  return {
    code: run.status,
    stdout: run.stdout,
    stderr: run.stderr,
    json,
  };
}

function ensureCleanDir(dir) {
  fs.rmSync(dir, { recursive: true, force: true });
  fs.mkdirSync(dir, { recursive: true });
}

function main() {
  ensureCleanDir(tmpDir);

  const validRequest = path.resolve(examplesDir, 'requests/resume-modern.zh.json');
  const invalidRequest = path.resolve(examplesDir, 'requests/invalid-missing-ratio.json');

  const validateOk = runNode(path.resolve(scriptsDir, 'validate_request.cjs'), ['--input', validRequest]);
  assert.strictEqual(validateOk.code, 0, `validate_request should pass for valid request: ${validateOk.stdout}\n${validateOk.stderr}`);
  assert.ok(validateOk.json && validateOk.json.ok === true, 'validate_request response should be { ok: true }');

  const validateFail = runNode(path.resolve(scriptsDir, 'validate_request.cjs'), ['--input', invalidRequest]);
  assert.notStrictEqual(validateFail.code, 0, 'validate_request should fail for invalid request');
  assert.ok(validateFail.json && validateFail.json.ok === false, 'invalid validation should return { ok: false }');

  const compose = runNode(path.resolve(scriptsDir, 'compose_prompt.cjs'), ['--input', validRequest]);
  assert.strictEqual(compose.code, 0, `compose_prompt should pass: ${compose.stdout}\n${compose.stderr}`);
  assert.ok(compose.json && compose.json.style_prompt, 'compose_prompt should include style_prompt');
  assert.ok(Array.isArray(compose.json.negative_constraints), 'compose_prompt should include negative_constraints array');

  const composedFixture = path.resolve(examplesDir, 'outputs/compose.resume-modern.zh.json');
  fs.writeFileSync(composedFixture, JSON.stringify(compose.json, null, 2) + '\n');

  const calibratedOutput = path.resolve(tmpDir, 'verification-thresholds.calibrated.json');
  const calibrate = runNode(path.resolve(scriptsDir, 'calibrate-thresholds.cjs'), ['--input', evalFile, '--output', calibratedOutput]);
  assert.strictEqual(calibrate.code, 0, `calibrate-thresholds should pass: ${calibrate.stdout}\n${calibrate.stderr}`);
  assert.ok(fs.existsSync(calibratedOutput), 'calibration output file should exist');

  const pipeline = runNode(path.resolve(scriptsDir, 'run-pipeline.cjs'), [
    '--request', validRequest,
    '--provider', 'gemini',
    '--outdir', tmpDir,
  ]);
  assert.strictEqual(pipeline.code, 0, `run-pipeline should exit 0 in dry run mode: ${pipeline.stdout}\n${pipeline.stderr}`);
  assert.ok(pipeline.json && Array.isArray(pipeline.json.attempts), 'run-pipeline should return attempts array');
  assert.ok(pipeline.json.attempts.length >= 1, 'run-pipeline should have at least one attempt');

  const summaryFile = path.resolve(tmpDir, 'pipeline-summary.json');
  assert.ok(fs.existsSync(summaryFile), 'pipeline summary should be generated');

  process.stdout.write(JSON.stringify({
    ok: true,
    tests: [
      'validate_request(valid)',
      'validate_request(invalid)',
      'compose_prompt',
      'calibrate_thresholds',
      'run_pipeline_dry_run'
    ],
    artifacts: {
      composedFixture,
      calibratedOutput,
      summaryFile,
    },
  }, null, 2) + '\n');
}

try {
  main();
} catch (err) {
  process.stdout.write(JSON.stringify({ ok: false, error: err.message }, null, 2) + '\n');
  process.exit(1);
}
