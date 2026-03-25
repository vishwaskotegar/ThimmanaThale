"""Text (Sentence Transformers) and image (OpenCLIP) embeddings with lazy-loaded models."""

from __future__ import annotations

from io import BytesIO
from typing import List

import numpy as np
import open_clip
import torch
from PIL import Image
from sentence_transformers import SentenceTransformer

# Defaults match collection dims in qdrant_webpage.py
TEXT_MODEL_NAME = "all-MiniLM-L6-v2"
OPEN_CLIP_MODEL = "ViT-B-32"
OPEN_CLIP_PRETRAINED = "laion2b_s34b_b79k"

_text_model: SentenceTransformer | None = None
_clip_model = None
_clip_preprocess = None
_clip_device: torch.device | None = None


def _get_text_model() -> SentenceTransformer:
    global _text_model
    if _text_model is None:
        _text_model = SentenceTransformer(TEXT_MODEL_NAME)
    return _text_model


def _get_clip():
    global _clip_model, _clip_preprocess, _clip_device
    if _clip_model is None:
        _clip_device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
        _clip_model, _, _clip_preprocess = open_clip.create_model_and_transforms(
            OPEN_CLIP_MODEL,
            pretrained=OPEN_CLIP_PRETRAINED,
        )
        _clip_model.to(_clip_device)
        _clip_model.eval()
    return _clip_model, _clip_preprocess, _clip_device


def embed_text(text: str) -> List[float]:
    if not (text or "").strip():
        raise ValueError("Cannot embed empty text")
    model = _get_text_model()
    vec = model.encode(text, convert_to_numpy=True, normalize_embeddings=True)
    return np.asarray(vec, dtype=np.float32).tolist()


def embed_image_png(png_bytes: bytes) -> List[float]:
    model, preprocess, device = _get_clip()
    image = Image.open(BytesIO(png_bytes)).convert("RGB")
    tensor = preprocess(image).unsqueeze(0).to(device)
    with torch.no_grad():
        feats = model.encode_image(tensor)
        feats = feats / feats.norm(dim=-1, keepdim=True)
    return feats.squeeze(0).cpu().numpy().astype(np.float32).tolist()
