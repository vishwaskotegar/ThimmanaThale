"""Two Qdrant targets (separate URLs optional): text embeddings vs image (OpenCLIP) embeddings."""

from __future__ import annotations

import os
import uuid
from typing import Any, Dict, List, Optional

from qdrant_client import QdrantClient, models

# Default: same server, two collections = two logical "DBs". Override URLs to split physically.
DEFAULT_URL = "http://localhost:6333"

TEXT_QDRANT_URL = os.environ.get("QDRANT_TEXT_URL", DEFAULT_URL)
IMAGE_QDRANT_URL = os.environ.get("QDRANT_IMAGE_URL", DEFAULT_URL)

TEXT_COLLECTION = os.environ.get("QDRANT_TEXT_COLLECTION", "webpage_text")
IMAGE_COLLECTION = os.environ.get("QDRANT_IMAGE_COLLECTION", "webpage_image")

TEXT_VECTOR_SIZE = 384  # all-MiniLM-L6-v2
IMAGE_VECTOR_SIZE = 512  # OpenCLIP ViT-B-32


def _client_for(url: str) -> QdrantClient:
    return QdrantClient(url=url)


def _collection_names(client: QdrantClient) -> set:
    return {c.name for c in client.get_collections().collections}


def ensure_text_collection(client: QdrantClient) -> None:
    if TEXT_COLLECTION not in _collection_names(client):
        client.create_collection(
            collection_name=TEXT_COLLECTION,
            vectors_config=models.VectorParams(
                size=TEXT_VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )


def ensure_image_collection(client: QdrantClient) -> None:
    if IMAGE_COLLECTION not in _collection_names(client):
        client.create_collection(
            collection_name=IMAGE_COLLECTION,
            vectors_config=models.VectorParams(
                size=IMAGE_VECTOR_SIZE,
                distance=models.Distance.COSINE,
            ),
        )


def upsert_webpage_text(
    url: str,
    text: str,
    vector: List[float],
    *,
    title: Optional[str] = None,
    client: Optional[QdrantClient] = None,
) -> str:
    qdrant = client or _client_for(TEXT_QDRANT_URL)
    ensure_text_collection(qdrant)
    point_id = str(uuid.uuid4())
    payload: Dict[str, Any] = {"url": url, "text": text}
    if title is not None:
        payload["title"] = title
    qdrant.upsert(
        collection_name=TEXT_COLLECTION,
        points=[
            models.PointStruct(id=point_id, vector=vector, payload=payload),
        ],
    )
    return point_id


def upsert_webpage_image(
    url: str,
    vector: List[float],
    *,
    title: Optional[str] = None,
    client: Optional[QdrantClient] = None,
) -> str:
    qdrant = client or _client_for(IMAGE_QDRANT_URL)
    ensure_image_collection(qdrant)
    point_id = str(uuid.uuid4())
    payload: Dict[str, Any] = {"url": url, "kind": "screenshot_png"}
    if title is not None:
        payload["title"] = title
    qdrant.upsert(
        collection_name=IMAGE_COLLECTION,
        points=[
            models.PointStruct(id=point_id, vector=vector, payload=payload),
        ],
    )
    return point_id
