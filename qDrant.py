from qdrant_client import QdrantClient, models
from sentence_transformers import SentenceTransformer

# -----------------------------
# 1. CONNECT TO QDRANT
# -----------------------------
client = QdrantClient(url="http://localhost:6333")
# OR local mode:
# client = QdrantClient(":memory:")

# -----------------------------
# 2. LOAD EMBEDDING MODEL
# -----------------------------
model = SentenceTransformer("all-MiniLM-L6-v2")

# -----------------------------
# 3. CREATE COLLECTION
# -----------------------------
collection_name = "memory"

client.recreate_collection(
    collection_name=collection_name,
    vectors_config=models.VectorParams(
        size=384,  # embedding size
        distance=models.Distance.COSINE
    )
)

# -----------------------------
# 4. INSERT DATA (UPSERT)
# -----------------------------
texts = [
    "User wants lean aesthetic physique",
    "User weighs 75kg",
    "User struggles with protein intake"
]

vectors = model.encode(texts)

points = [
    models.PointStruct(
        id=i,
        vector=vectors[i].tolist(),  # IMPORTANT: convert to list
        payload={"text": texts[i]}
    )
    for i in range(len(texts))
]

client.upsert(
    collection_name=collection_name,
    points=points
)

# -----------------------------
# 5. SEARCH (NEW API)
# -----------------------------
query = "How much protein should I eat?"
query_vector = model.encode(query).tolist()

results = client.query_points(
    collection_name=collection_name,
    query=query_vector,
    limit=3
)

# -----------------------------
# 6. PRINT RESULTS
# -----------------------------
for point in results.points:
    print(point.payload["text"], "| score:", point.score)