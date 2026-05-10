// ---------------- URL HELPERS ----------------
export function normalizeUrl(url) {
  if (!url) return null;

  if (url.startsWith("http://") || url.startsWith("https://")) {
    return url;
  }

  if (url.startsWith("www.")) {
    return "https://" + url;
  }

  return null; // reject unknown formats
}

export function isRestrictedUrl(url) {
  if (!url) return true;

  return (
    url.startsWith("chrome://") ||
    url.startsWith("edge://") ||
    url.startsWith("about:") ||
    url.startsWith("chrome-extension://") ||
    url.includes("chrome.google.com/webstore")
  );
}
