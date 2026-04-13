// Create right-click menu
chrome.runtime.onInstalled.addListener(() => {
  chrome.contextMenus.create({
    id: "addToWorkspace",
    title: "Add to Workspace",
    contexts: ["page"]
  });
});

async function showToast(tabId, message, isError = false) {
  try {
    await chrome.scripting.executeScript({
      target: { tabId },
      func: (msg, isErr) => {
        const existing = document.getElementById("workspace-toast");
        if (existing) existing.remove();

        const toast = document.createElement("div");
        toast.id = "workspace-toast";
        toast.innerText = msg;

        Object.assign(toast.style, {
          position: "fixed",
          bottom: "20px",
          right: "20px",
          background: isErr ? "#ff4444" : "#1f1f1f",
          color: "white",
          padding: "12px 16px",
          borderRadius: "8px",
          fontSize: "14px",
          zIndex: "999999",
          boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
          opacity: "0",
          transform: "translateY(10px)",
          transition: "all 0.3s ease"
        });

        document.body.appendChild(toast);

        // Animate in
        setTimeout(() => {
          toast.style.opacity = "1";
          toast.style.transform = "translateY(0)";
        }, 10);

        // Remove after 2.5s
        setTimeout(() => {
          toast.style.opacity = "0";
          toast.style.transform = "translateY(10px)";
          setTimeout(() => toast.remove(), 300);
        }, 2500);
      },
      args: [message, isError]
    });
  } catch (e) {
    console.warn("Toast failed (restricted page)");
  }
}



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
    await showToast(tabId, "Invalid Tab! ❌", true);
    // await chrome.scripting.executeScript({
    //     target: { tabId },
    //     func: () => alert("❌ Invalid Tab!")
    //   });
    return;
  }

  try {
    // Call your API
    const res = await fetch("http://127.0.0.1:5000/ingest-webpage", {
      signal: AbortSignal.timeout(10000),
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ url })
    });

    const text = await res.text();
    if (!res.ok) throw new Error(`API failed: ${text}`);

    // // ✅ Notification (always works)
    // notify("Saved ✅", "Page added to workspace");

    // ✅ Alert (only on normal pages)
    
    await showToast(tabId, "Saved to workspace ✅");
      // await chrome.scripting.executeScript({
      //   target: { tabId },
      //   func: () => alert("✅ Page added to workspace")
      // });
    

  } catch (err) {
    console.error("ERROR:", err);

    // notify("Error ❌", "Failed to save page");
    await chrome.scripting.executeScript({
        target: { tabId },
        func: () => alert("❌ Failed to save page")
      });
    
  }
});