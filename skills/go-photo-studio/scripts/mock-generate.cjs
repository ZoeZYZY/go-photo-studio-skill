#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

function parseArgs(argv) {
  const outIdx = argv.indexOf('--output');
  if (outIdx === -1 || !argv[outIdx + 1]) {
    throw new Error('Usage: node mock-generate.cjs --output <output.png>');
  }
  return { output: argv[outIdx + 1] };
}

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c ^= buf[i];
    for (let j = 0; j < 8; j += 1) {
      c = (c >>> 1) ^ ((c & 1) ? 0xedb88320 : 0);
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

function pngChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);
  const crcBuf = Buffer.alloc(4);
  const crc = crc32(Buffer.concat([typeBuf, data]));
  crcBuf.writeUInt32BE(crc, 0);
  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function makeFixturePortrait(width, height) {
  const rgba = Buffer.alloc(width * height * 4);

  const bgTop = [243, 246, 252];
  const bgBottom = [225, 232, 244];

  const cx = width * 0.5;
  const headCy = height * 0.34;
  const headRx = width * 0.16;
  const headRy = height * 0.2;
  const shoulderCy = height * 0.68;
  const shoulderRx = width * 0.34;
  const shoulderRy = height * 0.2;

  function setPixel(x, y, r, g, b, a = 255) {
    const idx = (y * width + x) * 4;
    rgba[idx] = r;
    rgba[idx + 1] = g;
    rgba[idx + 2] = b;
    rgba[idx + 3] = a;
  }

  for (let y = 0; y < height; y += 1) {
    const t = y / (height - 1);
    const rBg = Math.round(bgTop[0] * (1 - t) + bgBottom[0] * t);
    const gBg = Math.round(bgTop[1] * (1 - t) + bgBottom[1] * t);
    const bBg = Math.round(bgTop[2] * (1 - t) + bgBottom[2] * t);
    for (let x = 0; x < width; x += 1) {
      const dxHead = (x - cx) / headRx;
      const dyHead = (y - headCy) / headRy;
      const inHead = dxHead * dxHead + dyHead * dyHead <= 1;

      const dxShoulder = (x - cx) / shoulderRx;
      const dyShoulder = (y - shoulderCy) / shoulderRy;
      const inShoulder = dxShoulder * dxShoulder + dyShoulder * dyShoulder <= 1 && y > headCy;

      const vignetteX = (x - cx) / (width * 0.7);
      const vignetteY = (y - height * 0.52) / (height * 0.75);
      const vignette = Math.max(0, 1 - (vignetteX * vignetteX + vignetteY * vignetteY));

      let r = rBg;
      let g = gBg;
      let b = bBg;

      if (inShoulder) {
        r = Math.round(38 + 22 * vignette);
        g = Math.round(55 + 20 * vignette);
        b = Math.round(82 + 18 * vignette);
      }

      if (inHead) {
        const skinNoise = ((x * 17 + y * 29) % 11) - 5;
        r = Math.max(0, Math.min(255, 205 + skinNoise));
        g = Math.max(0, Math.min(255, 170 + Math.floor(skinNoise * 0.7)));
        b = Math.max(0, Math.min(255, 146 + Math.floor(skinNoise * 0.5)));
      }

      const eyeY = headCy - headRy * 0.1;
      const eyeOffsetX = headRx * 0.35;
      const eyeR = Math.max(2, Math.floor(width * 0.01));
      const leftEye = (x - (cx - eyeOffsetX)) ** 2 + (y - eyeY) ** 2 <= eyeR ** 2;
      const rightEye = (x - (cx + eyeOffsetX)) ** 2 + (y - eyeY) ** 2 <= eyeR ** 2;
      if (leftEye || rightEye) {
        r = 45;
        g = 45;
        b = 45;
      }

      setPixel(x, y, r, g, b, 255);
    }
  }

  return rgba;
}

function encodePng(width, height, rgba) {
  const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 6; // color type RGBA
  ihdr[10] = 0; // compression
  ihdr[11] = 0; // filter
  ihdr[12] = 0; // interlace

  const row = width * 4;
  const raw = Buffer.alloc((row + 1) * height);
  for (let y = 0; y < height; y += 1) {
    const dst = y * (row + 1);
    raw[dst] = 0; // no filter
    rgba.copy(raw, dst + 1, y * row, y * row + row);
  }

  const compressed = zlib.deflateSync(raw, { level: 9 });
  const out = Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
  return out;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath = path.resolve(args.output);
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });

  const width = 768;
  const height = 1024;
  const rgba = makeFixturePortrait(width, height);
  const png = encodePng(width, height, rgba);
  fs.writeFileSync(outputPath, png);

  process.stdout.write(JSON.stringify({
    ok: true,
    output: outputPath,
    fixture: { width, height, type: 'portrait-fixture-png' },
  }, null, 2) + '\n');
}

try {
  main();
} catch (err) {
  process.stdout.write(JSON.stringify({ ok: false, error: err.message }, null, 2) + '\n');
  process.exit(1);
}
