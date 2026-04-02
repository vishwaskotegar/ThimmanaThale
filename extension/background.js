// Create right-click menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToWorkspace",
    title: "Add to Workspace",
    contexts: ["page"]
  });
});

// Notification helper
// function notify(title, message) {
//   try {
//     chrome.notifications.create({
//       type: "basic",
//       iconUrl: "https://cdn-icons-png.flaticon.com/128/190/190411.png",
//       title,
//       message
//     });
//   } catch (e) {
//     console.error("Notification error:", e);
//   }
// }

// Check restricted pages
function isRestrictedUrl(url) {
  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:")
  );
}

// Main handler
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId !== "addToWorkspace") return;

  const url = tab?.url;
  const tabId = tab?.id;

  if (!url || !tabId) {
    notify("Error ❌", "Invalid tab");
    return;
  }

  try {
    // Call your API
    const res = await fetch("http://127.0.0.1:5000/ingest-webpage", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    if (!res.ok) throw new Error("API failed");

    // // ✅ Notification (always works)
    // notify("Saved ✅", "Page added to workspace");

    // ✅ Alert (only on normal pages)
    if (!isRestrictedUrl(url)) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => alert("✅ Page added to workspace")
      });
    }

  } catch (err) {
    console.error("ERROR:", err);

    // notify("Error ❌", "Failed to save page");

    if (!isRestrictedUrl(url)) {
      await chrome.scripting.executeScript({
        target: { tabId },
        func: () => alert("❌ Failed to save page")
      });
    }
  }
});