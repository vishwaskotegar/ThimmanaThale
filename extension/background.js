// ---------------- INIT ----------------
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToWorkspace",
    title: "Add to Workspace",
    contexts: ["page"],
  });
});

// ---------------- LOGGER ----------------
function log(level, message, data = {}) {
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

// ---------------- URL HELPERS ----------------
function normalizeUrl(url) {
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  return "https://" + url;
}

function isRestrictedUrl(url) {
  if (!url) return true;

  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://") ||
    url.includes("chrome.google.com/webstore")
  );
}

// ---------------- BADGE FALLBACK ----------------
function showBadge(tabId, text, color = "#ff0000") {
  try {
    chrome.action.setBadgeText({ text, tabId });
    chrome.action.setBadgeBackgroundColor({ color, tabId });

    setTimeout(() => {
      chrome.action.setBadgeText({ text: "", tabId });
    }, 2000);
  } catch (e) {
    console.warn("Badge failed", e);
  }
}

// ---------------- HISTORY ----------------
async function addToHistory(entry) {
  try {
    const data = await chrome.storage.local.get(["history"]);
    const history = data.history || [];

    history.unshift(entry); // newest first

    // keep last 20 items
    const trimmed = history.slice(0, 20);

    await chrome.storage.local.set({ history: trimmed });
  } catch (err) {
    console.error("History save failed", err);
  }
}

// ---------------- TOAST UI ----------------
async function showToast(tabId, opts) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (opts) => {
        const { message, type = "info", duration = 2500 } = opts;

        const existing = document.getElementById("__ws_toast__");
        if (existing) existing.remove();

        let container = document.getElementById("__ws_toast_container__");
        if (!container) {
          container = document.createElement("div");
          container.id = "__ws_toast_container__";

          Object.assign(container.style, {
            position: "fixed",
            bottom: "20px",
            right: "20px",
            zIndex: "2147483647",
            display: "flex",
            flexDirection: "column",
            gap: "10px",
            pointerEvents: "none",
          });

          document.body.appendChild(container);
        }

        const isDark = window.matchMedia(
          "(prefers-color-scheme: dark)",
        ).matches;

        const bg =
          type === "error" ? "#ff4d4f" : isDark ? "#1f1f1f" : "#ffffff";

        const color = isDark ? "#fff" : "#000";

        const toast = document.createElement("div");
        toast.id = "__ws_toast__";
        toast.innerText = message;

        Object.assign(toast.style, {
          minWidth: "220px",
          maxWidth: "320px",
          padding: "12px 16px",
          borderRadius: "10px",
          fontSize: "14px",
          fontFamily: "system-ui, sans-serif",
          background: bg,
          color: color,
          boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
          opacity: "0",
          transform: "translateY(12px)",
          transition: "all 0.25s ease",
          pointerEvents: "auto",
          border: isDark ? "1px solid #333" : "1px solid #eee",
        });

        container.appendChild(toast);

        requestAnimationFrame(() => {
          toast.style.opacity = "1";
          toast.style.transform = "translateY(0)";
        });

        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(12px)";
          setTimeout(() => toast.remove(), 250);
        }, duration);
      },
      args: [opts],
    });
  } catch (err) {
    console.warn("Toast injection failed", err);
  }
}

// ---------------- USER FEEDBACK WRAPPER ----------------
async function notifyUser(tabId, url, message, type = "error") {
  if (tabId && url && !isRestrictedUrl(url)) {
    await showToast(tabId, { message, type });
  } else {
    showBadge(tabId, "!", "#ff0000");
  }
}

// ---------------- MAIN HANDLER ----------------
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "addToWorkspace") return;

  const tabId = tab?.id;
  const rawUrl = tab?.url;

  log("info", "Click detected", { rawUrl });

  // ❌ Missing data
  if (!tabId || !rawUrl) {
    log("error", "Missing tabId or URL", { tab });

    await notifyUser(tabId, rawUrl, "Unable to read page ❌");
    await addToHistory({
      url: rawUrl,
      status: "error",
      time: Date.now(),
      reason: "Missing tabId or URL",
    });
    return;
  }

  // ❌ Restricted pages
  if (isRestrictedUrl(rawUrl)) {
    log("warn", "Restricted URL blocked", { rawUrl });

    await notifyUser(tabId, rawUrl, "Cannot run on this page ⚠️");
    await addToHistory({
      url: rawUrl,
      status: "error",
      time: Date.now(),
      reason: "Cannot run on this page ⚠️" + rawUrl,
    });
    return;
  }

  const url = normalizeUrl(rawUrl);

  if (!url) {
    log("error", "URL normalization failed", { rawUrl });

    await notifyUser(tabId, rawUrl, "Invalid URL ❌");
    await addToHistory({
      url: rawUrl,
      status: "error",
      time: Date.now(),
      reason: "Invalid URL ❌" + rawUrl,
    });
    return;
  }

  // ⏳ Loading state
  await showToast(tabId, {
    message: "Saving to workspace...",
    type: "info",
    duration: 1000,
  });

  try {
    const controller = new AbortController();

    const timeout = setTimeout(() => {
      controller.abort();
      log("error", "Request timeout", { url });
    }, 8000);

    const res = await fetch("http://127.0.0.1:5000/ingest-webpage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ url }),
      signal: controller.signal,
    });

    clearTimeout(timeout);

    const text = await res.text();

    log("info", "API response", {
      status: res.status,
      body: text,
    });

    if (!res.ok) {
      throw new Error(`HTTP ${res.status} - ${text}`);
    }

    // ✅ Success
    await showToast(tabId, {
      message: "Saved to workspace ✅",
      type: "success",
    });
    await addToHistory({
      url,
      status: "success",
      time: Date.now(),
    });
  } catch (err) {
    log("error", "API call failed", {
      error: err.message,
      stack: err.stack,
      url,
    });

    let message = "Failed to save ❌";

    if (err.name === "AbortError") {
      message = "Request timed out ⏳";
    }

    await notifyUser(tabId, url, message, "error");
    await addToHistory({
    url: rawUrl,
    status: "error",
    time: Date.now(),
    reason: message || "Unknown error"
    });
  }
});
