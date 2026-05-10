import { log } from "./logger.js";
import { normalizeUrl, isRestrictedUrl } from "./utils.js";
import { addToHistory } from "./history.js";
import { ingestUrl } from "./api.js";

// Init menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToWorkspace",
    title: "Add to Workspace",
    contexts: ["page"],
  });
});

// Toast helper
async function sendToast(tabId, message, type = "info") {
  try {
    await chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: { message, type },
    });
  } catch (err) {
    console.warn("[EXT] Toast failed, injecting content script", err);

    // inject script manually (fallback)
    await chrome.scripting.executeScript({
      target: { tabId },
      files: ["content/toast.js"],
    });

    // retry
    await chrome.tabs.sendMessage(tabId, {
      type: "SHOW_TOAST",
      payload: { message, type },
    });
  }
}

// Badge fallback
function showBadge(text) {
  try {
    chrome.action.setBadgeText({ text });
    chrome.action.setBadgeBackgroundColor({ color: "#ff0000" });

    setTimeout(() => {
      chrome.action.setBadgeText({ text: "" });
    }, 2000);
  } catch (e) {
    console.warn("[EXT] Badge failed", e);
  }
}

// Main handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "addToWorkspace") return;

  const tabId = tab?.id;
  const rawUrl = tab?.url;

  log("info", "Click detected", { rawUrl });

  if (!tabId || !rawUrl) {
    log("error", "Missing tabId or URL");

    showBadge("!");
    await addToHistory({
      url: rawUrl,
      status: "error",
      time: Date.now(),
      reason: "Missing tab data",
    });
    return;
  }

  if (isRestrictedUrl(rawUrl)) {
    log("warn", "Restricted URL", { rawUrl });

    showBadge("!");
    await addToHistory({
      url: rawUrl,
      status: "error",
      time: Date.now(),
      reason: "Restricted page",
    });
    return;
  }

  const url = normalizeUrl(rawUrl);

  sendToast(tabId, "Saving...", "info");

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    await ingestUrl(url, controller.signal);

    clearTimeout(timeout);

    sendToast(tabId, "Saved to workspace ✅", "success");

    await addToHistory({
      url,
      status: "success",
      time: Date.now(),
    });
  } catch (err) {
    log("error", "API failed", { err });

    showBadge("!");
    sendToast(tabId, "Failed to save ❌", "error");

    await addToHistory({
      url: rawUrl,
      status: "error",
      time: Date.now(),
      reason: err.message,
    });
  }
});
