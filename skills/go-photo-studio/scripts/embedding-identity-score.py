#!/usr/bin/env python3
"""
Embedding-based local identity similarity scorer.

Primary backend:
- insightface (ArcFace embedding) + cosine similarity

Output JSON:
{
  "embedding_identity_similarity": float,
  "backend": "insightface_arcface"
}
"""

import argparse
import base64
import io
import json
import math
import os
import urllib.request
from typing import Tuple

import numpy as np
from PIL import Image


def load_image_from_uri(uri: str) -> np.ndarray:
    if uri.startswith("data:image/"):
        _, b64 = uri.split(",", 1)
        data = base64.b64decode(b64)
        img = Image.open(io.BytesIO(data)).convert("RGB")
        return np.asarray(img)
    if uri.startswith("http://") or uri.startswith("https://"):
        with urllib.request.urlopen(uri, timeout=20) as resp:
            data = resp.read()
        img = Image.open(io.BytesIO(data)).convert("RGB")
        return np.asarray(img)
    path = uri.replace("file://", "", 1) if uri.startswith("file://") else uri
    path = os.path.abspath(path)
    img = Image.open(path).convert("RGB")
    return np.asarray(img)


def cosine_similarity(a: np.ndarray, b: np.ndarray) -> float:
    denom = float(np.linalg.norm(a) * np.linalg.norm(b))
    if denom <= 1e-12:
        return 0.0
    return float(np.dot(a, b) / denom)


def map_cosine_to_unit_interval(cos: float) -> float:
    # ArcFace cosine is in [-1, 1], map to [0, 1] for threshold compatibility.
    return max(0.0, min(1.0, (cos + 1.0) / 2.0))


def get_insightface_embedding(image_rgb: np.ndarray, app) -> np.ndarray:
    faces = app.get(image_rgb)
    if not faces:
        raise RuntimeError("no_face_detected")

    # Pick the largest detected face.
    def area(face) -> float:
        box = face.bbox
        return float(max(0.0, box[2] - box[0]) * max(0.0, box[3] - box[1]))

    face = sorted(faces, key=area, reverse=True)[0]
    emb = np.asarray(face.embedding, dtype=np.float32)
    if emb.ndim != 1 or emb.size == 0:
        raise RuntimeError("invalid_embedding")
    return emb


def score_with_insightface(source_uri: str, generated_uri: str) -> Tuple[float, str]:
    try:
        from insightface.app import FaceAnalysis
    except Exception as exc:
        raise RuntimeError(f"insightface_import_failed: {exc}") from exc

    # CPU provider for portability in local/CI environments.
    app = FaceAnalysis(name="buffalo_l", providers=["CPUExecutionProvider"])
    app.prepare(ctx_id=0, det_size=(640, 640))

    src = load_image_from_uri(source_uri)
    gen = load_image_from_uri(generated_uri)

    src_emb = get_insightface_embedding(src, app)
    gen_emb = get_insightface_embedding(gen, app)

    cos = cosine_similarity(src_emb, gen_emb)
    score = map_cosine_to_unit_interval(cos)
    return score, "insightface_arcface"


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--source", required=True)
    parser.add_argument("--generated", required=True)
    args = parser.parse_args()

    try:
        score, backend = score_with_insightface(args.source, args.generated)
        print(
            json.dumps(
                {
                    "embedding_identity_similarity": round(float(score), 4),
                    "backend": backend,
                }
            )
        )
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        raise SystemExit(1)


if __name__ == "__main__":
    main()
