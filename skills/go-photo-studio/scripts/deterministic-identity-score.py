#!/usr/bin/env python3
"""
Deterministic local identity similarity scorer.
- No remote model calls
- Uses center-crop perceptual hashes + grayscale histogram overlap
Output JSON: {"deterministic_identity_similarity": float}
"""

import argparse
import base64
import io
import json
import os
import urllib.request
from PIL import Image


def load_image_from_uri(uri: str) -> Image.Image:
    if uri.startswith("data:image/"):
        _, b64 = uri.split(",", 1)
        data = base64.b64decode(b64)
        return Image.open(io.BytesIO(data)).convert("RGB")
    if uri.startswith("http://") or uri.startswith("https://"):
        with urllib.request.urlopen(uri, timeout=15) as resp:
            data = resp.read()
        return Image.open(io.BytesIO(data)).convert("RGB")
    if uri.startswith("file://"):
        path = uri.replace("file://", "", 1)
    else:
        path = uri
    path = os.path.abspath(path)
    return Image.open(path).convert("RGB")


def center_crop(img: Image.Image, ratio: float = 0.72) -> Image.Image:
    w, h = img.size
    side = int(min(w, h) * ratio)
    side = max(side, 16)
    x0 = (w - side) // 2
    y0 = (h - side) // 2
    return img.crop((x0, y0, x0 + side, y0 + side))


def ahash(img: Image.Image, size: int = 16) -> int:
    g = img.convert("L").resize((size, size), Image.Resampling.BILINEAR)
    px = list(g.tobytes())
    mean = sum(px) / len(px)
    bits = 0
    for i, v in enumerate(px):
        if v >= mean:
            bits |= 1 << i
    return bits


def dhash(img: Image.Image, size: int = 16) -> int:
    g = img.convert("L").resize((size + 1, size), Image.Resampling.BILINEAR)
    px = list(g.tobytes())
    bits = 0
    for y in range(size):
        row = y * (size + 1)
        for x in range(size):
            if px[row + x] >= px[row + x + 1]:
                bits |= 1 << (y * size + x)
    return bits


def hamming_similarity(a: int, b: int, bits: int) -> float:
    d = (a ^ b).bit_count()
    return max(0.0, 1.0 - (d / bits))


def grayscale_hist_similarity(a: Image.Image, b: Image.Image, bins: int = 32) -> float:
    ga = a.convert("L").resize((128, 128), Image.Resampling.BILINEAR)
    gb = b.convert("L").resize((128, 128), Image.Resampling.BILINEAR)
    ha = ga.histogram()
    hb = gb.histogram()

    step = 256 // bins
    ba = [sum(ha[i:i + step]) for i in range(0, 256, step)]
    bb = [sum(hb[i:i + step]) for i in range(0, 256, step)]

    suma = float(sum(ba)) or 1.0
    sumb = float(sum(bb)) or 1.0
    ba = [x / suma for x in ba]
    bb = [x / sumb for x in bb]

    overlap = sum(min(x, y) for x, y in zip(ba, bb))
    return max(0.0, min(1.0, overlap))


def score_identity(src: Image.Image, gen: Image.Image) -> float:
    src_c = center_crop(src)
    gen_c = center_crop(gen)

    a1 = ahash(src_c)
    a2 = ahash(gen_c)
    d1 = dhash(src_c)
    d2 = dhash(gen_c)

    sim_a = hamming_similarity(a1, a2, 16 * 16)
    sim_d = hamming_similarity(d1, d2, 16 * 16)
    sim_h = grayscale_hist_similarity(src_c, gen_c)

    score = 0.45 * sim_a + 0.35 * sim_d + 0.20 * sim_h
    return max(0.0, min(1.0, score))


def main() -> None:
    p = argparse.ArgumentParser()
    p.add_argument("--source", required=True)
    p.add_argument("--generated", required=True)
    args = p.parse_args()

    try:
        src = load_image_from_uri(args.source)
        gen = load_image_from_uri(args.generated)
        score = score_identity(src, gen)
        print(json.dumps({"deterministic_identity_similarity": round(score, 4)}))
    except Exception as e:
        print(json.dumps({"error": str(e)}))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
