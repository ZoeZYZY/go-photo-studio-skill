#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function guessMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.png') return 'image/png';
  if (ext === '.webp') return 'image/webp';
  return 'image/jpeg';
}

async function imageUriToInlineData(imageUri) {
  if (!imageUri || typeof imageUri !== 'string') {
    throw new Error('image_uri must be a non-empty string');
  }

  if (imageUri.startsWith('data:image/')) {
    const match = imageUri.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
    if (!match) {
      throw new Error('Unsupported data URI format');
    }
    return { mimeType: match[1], data: match[2] };
  }

  if (imageUri.startsWith('http://') || imageUri.startsWith('https://')) {
    const res = await fetch(imageUri);
    if (!res.ok) {
      throw new Error(`Failed to download image: ${res.status} ${res.statusText}`);
    }
    const arrayBuffer = await res.arrayBuffer();
    const mimeType = res.headers.get('content-type') || 'image/jpeg';
    const data = Buffer.from(arrayBuffer).toString('base64');
    return { mimeType, data };
  }

  const normalized = imageUri.startsWith('file://') ? imageUri.replace('file://', '') : imageUri;
  const filePath = path.resolve(normalized);
  const bin = fs.readFileSync(filePath);
  return {
    mimeType: guessMimeType(filePath),
    data: bin.toString('base64'),
  };
}

function extractFirstJson(text) {
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) {
    throw new Error('Model did not return JSON content');
  }
  return JSON.parse(match[0]);
}

async function geminiAnalyzeJson({ imageUri, prompt, model = 'gemini-2.5-flash', apiKey }) {
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }

  const inlineData = await imageUriToInlineData(imageUri);
  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    contents: [
      {
        parts: [
          { inlineData },
          { text: prompt },
        ],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('\n').trim();
  if (!text) {
    throw new Error('Gemini response did not include text output');
  }
  return extractFirstJson(text);
}

async function geminiAnalyzeJsonMulti({ imageUris, prompt, model = 'gemini-2.5-flash', apiKey }) {
  if (!apiKey) {
    throw new Error('Missing GEMINI_API_KEY');
  }
  if (!Array.isArray(imageUris) || imageUris.length === 0) {
    throw new Error('imageUris must be a non-empty array');
  }

  const inlineParts = [];
  for (const uri of imageUris) {
    const inlineData = await imageUriToInlineData(uri);
    inlineParts.push({ inlineData });
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(apiKey)}`;
  const body = {
    contents: [
      {
        parts: [...inlineParts, { text: prompt }],
      },
    ],
    generationConfig: {
      temperature: 0.1,
      topP: 0.8,
      responseMimeType: 'application/json',
    },
  };

  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Gemini request failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  const parts = data?.candidates?.[0]?.content?.parts || [];
  const text = parts.map((p) => p.text || '').join('\n').trim();
  if (!text) {
    throw new Error('Gemini response did not include text output');
  }
  return extractFirstJson(text);
}

function normalizeOpenAIText(content) {
  if (typeof content === 'string') return content;
  if (Array.isArray(content)) {
    return content.map((part) => {
      if (typeof part === 'string') return part;
      return part?.text || '';
    }).join('\n').trim();
  }
  return '';
}

async function openAIAnalyzeJsonMulti({ imageUris, prompt, model = 'gpt-4.1-mini', apiKey }) {
  if (!apiKey) {
    throw new Error('Missing OPENAI_API_KEY');
  }

  const images = [];
  for (const uri of imageUris) {
    const inlineData = await imageUriToInlineData(uri);
    images.push({
      type: 'image_url',
      image_url: { url: `data:${inlineData.mimeType};base64,${inlineData.data}` },
    });
  }

  const body = {
    model,
    response_format: { type: 'json_object' },
    messages: [
      { role: 'system', content: 'Return strict JSON only.' },
      { role: 'user', content: [...images, { type: 'text', text: prompt }] },
    ],
    temperature: 0.1,
  };

  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`OpenAI request failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  const raw = normalizeOpenAIText(data?.choices?.[0]?.message?.content);
  if (!raw) {
    throw new Error('OpenAI response did not include text output');
  }

  return extractFirstJson(raw);
}

async function openAIAnalyzeJson(opts) {
  return openAIAnalyzeJsonMulti({ ...opts, imageUris: [opts.imageUri] });
}

async function anthropicAnalyzeJsonMulti({ imageUris, prompt, model = 'claude-3-7-sonnet-latest', apiKey }) {
  if (!apiKey) {
    throw new Error('Missing ANTHROPIC_API_KEY');
  }

  const content = [];
  for (const uri of imageUris) {
    const inlineData = await imageUriToInlineData(uri);
    content.push({
      type: 'image',
      source: {
        type: 'base64',
        media_type: inlineData.mimeType,
        data: inlineData.data,
      },
    });
  }
  content.push({ type: 'text', text: `${prompt}\nReturn strict JSON only.` });

  const body = {
    model,
    max_tokens: 1200,
    temperature: 0.1,
    messages: [
      {
        role: 'user',
        content,
      },
    ],
  };

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': apiKey,
      'anthropic-version': '2023-06-01',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Anthropic request failed: ${res.status} ${res.statusText} - ${text}`);
  }

  const data = await res.json();
  const text = (data?.content || [])
    .map((item) => (item?.type === 'text' ? item.text : ''))
    .join('\n')
    .trim();

  if (!text) {
    throw new Error('Anthropic response did not include text output');
  }

  return extractFirstJson(text);
}

async function anthropicAnalyzeJson(opts) {
  return anthropicAnalyzeJsonMulti({ ...opts, imageUris: [opts.imageUri] });
}

async function analyzeJsonByProvider({ provider = 'gemini', imageUri, prompt, model, apiKey }) {
  if (provider === 'gemini') {
    return geminiAnalyzeJson({ imageUri, prompt, model: model || 'gemini-2.5-flash', apiKey: apiKey || process.env.GEMINI_API_KEY });
  }
  if (provider === 'openai') {
    return openAIAnalyzeJson({ imageUri, prompt, model: model || 'gpt-4.1-mini', apiKey: apiKey || process.env.OPENAI_API_KEY });
  }
  if (provider === 'anthropic') {
    return anthropicAnalyzeJson({ imageUri, prompt, model: model || 'claude-3-7-sonnet-latest', apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  }
  throw new Error(`Unsupported provider: ${provider}. Supported: gemini, openai, anthropic`);
}

async function analyzeJsonMultiByProvider({ provider = 'gemini', imageUris, prompt, model, apiKey }) {
  if (provider === 'gemini') {
    return geminiAnalyzeJsonMulti({ imageUris, prompt, model: model || 'gemini-2.5-flash', apiKey: apiKey || process.env.GEMINI_API_KEY });
  }
  if (provider === 'openai') {
    return openAIAnalyzeJsonMulti({ imageUris, prompt, model: model || 'gpt-4.1-mini', apiKey: apiKey || process.env.OPENAI_API_KEY });
  }
  if (provider === 'anthropic') {
    return anthropicAnalyzeJsonMulti({ imageUris, prompt, model: model || 'claude-3-7-sonnet-latest', apiKey: apiKey || process.env.ANTHROPIC_API_KEY });
  }
  throw new Error(`Unsupported provider: ${provider}. Supported: gemini, openai, anthropic`);
}

module.exports = {
  geminiAnalyzeJson,
  geminiAnalyzeJsonMulti,
  openAIAnalyzeJson,
  openAIAnalyzeJsonMulti,
  anthropicAnalyzeJson,
  anthropicAnalyzeJsonMulti,
  analyzeJsonByProvider,
  analyzeJsonMultiByProvider,
};
