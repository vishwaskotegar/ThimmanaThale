// ---------------- HISTORY ----------------
export async function addToHistory(entry) {
  try {
    const { history = [] } = await chrome.storage.local.get("history");

    // ✅ DO NOT REMOVE DUPLICATES
    const updated = [entry, ...history];

    // keep last 20 events
    const trimmed = updated.slice(0, 20);

    await chrome.storage.local.set({ history: trimmed });
  } catch (err) {
    console.error("[EXT] History save failed", err);
  }
}
