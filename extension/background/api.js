export async function ingestUrl(url, signal) {
  const res = await fetch("http://127.0.0.1:5000/ingest-webpage", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url }),
    signal,
  });

  const text = await res.text();

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} - ${text}`);
  }

  return text;
}
