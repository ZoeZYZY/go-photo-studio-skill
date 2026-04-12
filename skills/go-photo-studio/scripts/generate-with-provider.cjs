#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function parseArgs(argv) {
  const get = (flag) => {
    const idx = argv.indexOf(flag);
    return idx !== -1 && argv[idx + 1] ? argv[idx + 1] : null;
  };

  const request = get('--request');
  const stageC = get('--stage-c');
  const stageD = get('--stage-d');
  const output = get('--output');

  if (!request || !stageC || !stageD || !output) {
    throw new Error('Usage: node generate-with-provider.cjs --request <request.json> --stage-c <stage-c.json> --stage-d <stage-d.json> --output <output.png> [--provider gemini|openai] [--model <model>]');
  }

  return {
    request,
    stageC,
    stageD,
    output,
    provider: (get('--provider') || process.env.AI_PROVIDER || 'gemini').toLowerCase(),
    model: get('--model') || null,
  };
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(path.resolve(filePath), 'utf8'));
}

function ensureDirFor(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function imageUriToInlineData(imageUri) {
  if (!imageUri || typeof imageUri !== 'string') {
    throw new Error('request.image_uri must be a non-empty string');
  }

  if (imageUri.startsWith('data:image/')) {
    const match = imageUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) throw new Error('Unsupported data URI format');
    return { mimeType: match[1], data: match[2] };
  }

  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    const res = await fetch(imageUri);
    if (!res.ok) throw new Error(`Failed to download source image: ${res.status} ${res.statusText}`);
    const ab = await res.arrayBuffer();
    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    return { mimeType, data: Buffer.from(ab).toString('base64') };
  }

  const normalized = imageUri.startsWith('file://') ? imageUri.replace('file://', '') : imageUri;
  const filePath = path.resolve(normalized);
  const bin = fs.readFileSync(filePath);
  return { mimeType: guessMimeType(filePath), data: bin.toString('base64') };
}

function buildPrompt(stageC, stageD) {
  const constraints = Array.isArray(stageC?.constraints) ? stageC.constraints : [];
  const avoid = Array.isArray(stageD?.final_negative_constraints) ? stageD.final_negative_constraints : [];

  const lines = [
    'You are an advanced AI portrait engine focused on strict identity preservation.',
    'Generate one professional portrait image only.',
    '',
    'STYLE OBJECTIVE:',
    String(stageC?.style_objective || 'professional_headshot'),
    '',
    'IDENTITY LOCK RULES:',
    '- Keep exact facial geometry and age cues.',
    '- Keep skin micro-texture realistic; no plastic smoothing.',
    '- No face swap, no impersonation, no ethnicity shift.',
    '',
    'COMPOSITION TARGET:',
    String(stageD?.export_plan?.framing || 'head_and_shoulders'),
    String(stageD?.export_plan?.lighting || 'soft_studio'),
    '',
    'CONSTRAINTS:'
  ];

  for (const item of constraints) {
    lines.push(`- ${item}`);
  }

  if (avoid.length > 0) {
    lines.push('', 'FORBIDDEN:');
    for (const item of avoid) {
      lines.push(`- ${item}`);
    }
  }

  return lines.join('\n');
}

async function generateWithOpenAI({ imageInline, prompt, model }) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error('OPENAI_API_KEY is required for provider=openai');

  const blob = new Blob([Buffer.from(imageInline.data, 'base64')], { type: imageInline.mimeType });
  const form = new FormData();
  form.append('model', model || 'gpt-image-1');
  form.append('image', blob, 'source-image');
  form.append('prompt', prompt);
  form.append('size', '1024x1024');

  const res = await fetch('https://api.openai.com/v1/images/edits', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}` },
    body: form,
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI image generation failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  const b64 = data?.data?.[0]?.b64_json;
  if (!b64) throw new Error('OpenAI response missing b64_json image');

  return { data: b64, mimeType: 'image/png' };
}

async function generateWithGemini({ imageInline, prompt, model }) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) throw new Error('GEMINI_API_KEY is required for provider=gemini');

  const useModel = model || 'gemini-2.5-flash-image';
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${useModel}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        parts: [
          { inlineData: imageInline },
          { text: prompt },
        ],
      },
    ],
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini image generation failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const imagePart = parts.find((p) => p?.inlineData?.data);
  if (!imagePart?.inlineData?.data) {
    throw new Error('Gemini response missing inline image data');
  }

  return {
    data: imagePart.inlineData.data,
    mimeType: imagePart.inlineData.mimeType || 'image/png',
  };
}

function writeImageOutput(outPath, imageData) {
  ensureDirFor(outPath);
  fs.writeFileSync(path.resolve(outPath), Buffer.from(imageData.data, 'base64'));
}

async function main() {
  try {
    const args = parseArgs(process.argv.slice(2));
    const request = readJson(args.request);
    const stageC = readJson(args.stageC);
    const stageD = readJson(args.stageD);

    const imageInline = await imageUriToInlineData(request.image_uri);
    const prompt = buildPrompt(stageC, stageD);

    let result;
    if (args.provider === 'openai') {
      result = await generateWithOpenAI({ imageInline, prompt, model: args.model });
    } else if (args.provider === 'gemini') {
      result = await generateWithGemini({ imageInline, prompt, model: args.model });
    } else {
      throw new Error(`Unsupported provider for generation: ${args.provider}. Supported: gemini, openai`);
    }

    writeImageOutput(args.output, result);

    process.stdout.write(JSON.stringify({
      ok: true,
      provider: args.provider,
      output: path.resolve(args.output),
      mimeType: result.mimeType,
    }, null, 2) + '\n');
  } catch (err) {
    process.stdout.write(JSON.stringify({ ok: false, error: err.message }, null, 2) + '\n');
    process.exit(1);
  }
}

main();
