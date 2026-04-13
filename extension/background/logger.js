// ---------------- LOGGER ----------------
export function log(level, message, data = {}) {
  const payload = {
    time: new Date().toISOString(),
    level,
    message,
    ...data,
  };

  if (level === "error") {
    console.error("[EXT]", payload);
  } else if (level === "warn") {
    console.warn("[EXT]", payload);
  } else {
    console.log("[EXT]", payload);
  }
}
