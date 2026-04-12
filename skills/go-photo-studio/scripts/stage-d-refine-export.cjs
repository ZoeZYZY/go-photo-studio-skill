#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const requestIdx = argv.indexOf('--request');
  const stageCIdx = argv.indexOf('--stage-c');

  if (requestIdx === -1 || !argv[requestIdx + 1] || stageCIdx === -1 || !argv[stageCIdx + 1]) {
    throw new Error('Usage: node stage-d-refine-export.cjs --request <request.json> --stage-c <stage-c.json>');
  }

  return {
    request: argv[requestIdx + 1],
    stageC: argv[stageCIdx + 1],
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function qualityProfile(ratio) {
  if (ratio === '2:2') return 'id_strict';
  if (ratio === '4:5') return 'professional_standard';
  if (ratio === '1:1') return 'social_profile';
  return 'story_master';
}

function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const request = readJson(path.resolve(args.request));
    const stageC = readJson(path.resolve(args.stageC));

    const output = {
      version: '1.0.0',
      stage: 'D',
      stage_name: 'refine_export',
      input_stage: 'C',
      refinement_notes: {
        keep_skin_micro_texture: true,
        avoid_edge_halo: true,
        maintain_natural_blur_transition: true,
      },
      export_plan: {
        output_ratio: request.output_ratio,
        quality_profile: qualityProfile(request.output_ratio),
      },
      final_payload: {
        style_payload: stageC.style_payload,
        export_plan: {
          output_ratio: request.output_ratio,
          quality_profile: qualityProfile(request.output_ratio),
        },
      },
      completed: true,
    };

    process.stdout.write(JSON.stringify(output, null, 2) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ error: err.message }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
