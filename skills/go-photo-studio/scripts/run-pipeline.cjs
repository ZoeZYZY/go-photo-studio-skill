#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execFileSync, execSync } = require('child_process');

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : null;
  };

  const request = get('--request');
  if (!request) {
    throw new Error('Usage: node run-pipeline.cjs --request <request.json> [--outdir <dir>] [--provider gemini] [--model gemini-2.5-flash] [--thresholds <file>] [--max-retries 2] [--generated <image_uri>] [--generate-cmd "cmd with {request} {stage_c} {stage_d} {output}"]');
  }

  return {
    request,
    outdir: get('--outdir') || path.resolve(process.cwd(), '.pipeline-out'),
    provider: get('--provider') || 'gemini',
    model: get('--model') || 'gemini-2.5-flash',
    thresholds: get('--thresholds') || path.resolve(__dirname, '../references/verification-thresholds.json'),
    maxRetries: Number(get('--max-retries') || 2),
    generated: get('--generated'),
    generateCmd: get('--generate-cmd'),
  };
}

function runJsonScript(scriptPath, args) {
  const raw = execFileSync(process.execPath, [scriptPath, ...args], { encoding: 'utf8' }).trim();
  return JSON.parse(raw);
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2) + '\n');
}

function applyTemplate(cmd, vars) {
  return cmd
    .replaceAll('{request}', vars.request)
    .replaceAll('{stage_c}', vars.stageC)
    .replaceAll('{stage_d}', vars.stageD)
    .replaceAll('{output}', vars.output);
}

function runGenerateCommand(generateCmd, vars) {
  const rendered = applyTemplate(generateCmd, vars);
  execSync(rendered, { stdio: 'inherit' });
  if (fs.existsSync(vars.output)) {
    return vars.output;
  }
  return null;
}

function retryConstraintPack(attempt) {
  if (attempt <= 0) return [];
  if (attempt === 1) {
    return ['strict identity lock', 'no facial geometry change'];
  }
  if (attempt === 2) {
    return ['no skin retouching effect', 'no eye shape modification', 'keep original age cues'];
  }
  return ['preserve all original facial proportions', 'forbid stylized face rendering'];
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    fs.mkdirSync(args.outdir, { recursive: true });

    const requestPath = path.resolve(args.request);
    const baseRequest = JSON.parse(fs.readFileSync(requestPath, 'utf8'));

    const validate = runJsonScript(path.resolve(__dirname, 'validate_request.cjs'), ['--input', requestPath]);
    if (!validate.ok) {
      throw new Error(`request validation failed: ${JSON.stringify(validate.errors || [])}`);
    }

    const stageA = runJsonScript(path.resolve(__dirname, 'stage-a-layer-parse.cjs'), ['--input', requestPath, '--provider', args.provider, '--model', args.model]);
    const stageAPath = path.join(args.outdir, 'stage-a.json');
    writeJson(stageAPath, stageA);

    const stageB = runJsonScript(path.resolve(__dirname, 'stage-b-identity-extract.cjs'), ['--input', stageAPath, '--request', requestPath, '--provider', args.provider, '--model', args.model]);
    const stageBPath = path.join(args.outdir, 'stage-b.json');
    writeJson(stageBPath, stageB);

    let final = {
      accepted: false,
      attempts: [],
    };

    for (let attempt = 0; attempt <= args.maxRetries; attempt += 1) {
      const reqAttempt = {
        ...baseRequest,
        retry_extra_constraints: retryConstraintPack(attempt),
      };
      const reqAttemptPath = path.join(args.outdir, `request-attempt-${attempt}.json`);
      writeJson(reqAttemptPath, reqAttempt);

      const stageC = runJsonScript(path.resolve(__dirname, 'stage-c-guided-stylization.cjs'), ['--request', reqAttemptPath, '--stage-a', stageAPath, '--stage-b', stageBPath]);
      const stageCPath = path.join(args.outdir, `stage-c-attempt-${attempt}.json`);
      writeJson(stageCPath, stageC);

      const stageD = runJsonScript(path.resolve(__dirname, 'stage-d-refine-export.cjs'), ['--request', reqAttemptPath, '--stage-c', stageCPath]);
      const stageDPath = path.join(args.outdir, `stage-d-attempt-${attempt}.json`);
      writeJson(stageDPath, stageD);

      let generatedUri = attempt === 0 ? args.generated : null;
      if (!generatedUri && args.generateCmd) {
        const outputImagePath = path.join(args.outdir, `generated-attempt-${attempt}.png`);
        generatedUri = runGenerateCommand(args.generateCmd, {
          request: reqAttemptPath,
          stageC: stageCPath,
          stageD: stageDPath,
          output: outputImagePath,
        });
      }

      if (!generatedUri) {
        final.attempts.push({ attempt, stage_c: stageCPath, stage_d: stageDPath, verification: null, note: 'no_generated_image_provided' });
        break;
      }

      const verify = runJsonScript(path.resolve(__dirname, 'stage-e-verify-generation.cjs'), [
        '--request', reqAttemptPath,
        '--generated', generatedUri,
        '--provider', args.provider,
        '--model', args.model,
        '--thresholds', args.thresholds,
      ]);
      const verifyPath = path.join(args.outdir, `stage-e-attempt-${attempt}.json`);
      writeJson(verifyPath, verify);

      final.attempts.push({
        attempt,
        generated: generatedUri,
        stage_c: stageCPath,
        stage_d: stageDPath,
        verification: verifyPath,
      });

      if (verify.pass) {
        final.accepted = true;
        final.accepted_attempt = attempt;
        break;
      }

      if (!args.generateCmd) {
        final.attempts[final.attempts.length - 1].note = 'retry_requested_but_generate_cmd_not_provided';
        break;
      }
    }

    writeJson(path.join(args.outdir, 'pipeline-summary.json'), final);
    process.stdout.write(JSON.stringify(final, null, 2) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err.message }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
