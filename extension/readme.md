# 🧩 Add to Workspace – Chrome Extension

A lightweight Chrome extension that lets users quickly save webpages to their workspace using a right-click action, with visual feedback and activity tracking.

---

## 🚀 Features

- **Right-click → Add to Workspace**
- Sends current page URL to backend API
- Shows **toast UI feedback** on supported pages
- Handles **restricted pages gracefully**
- Maintains a **history of recent actions (max 20)**
- Displays history in a **popup UI**

---

## 🧠 How It Works

1. User right-clicks on any webpage
2. Selects **“Add to Workspace”**
3. Extension:
   - Validates URL
   - Sends POST request to backend:

     ```
     http://127.0.0.1:5000/ingest-webpage
     ```

   - Shows feedback:
     - ✅ Toast (on normal pages)
     - ⚠️ Badge fallback (restricted pages)

4. Action is stored in history (success/error)

---

## 📁 Project Structure

```
extension/
 ├── manifest.json
 ├── background/
 │    ├── index.js        # main logic (event handling)
 │    ├── api.js          # API calls
 │    ├── history.js      # storage logic
 │    ├── logger.js       # logging utility
 │    ├── utils.js        # helpers (URL handling, checks)
 │
 ├── content/
 │    └── toast.js        # UI toast renderer
 │
 ├── popup/
 │    ├── popup.html      # UI layout
 │    ├── popup.js        # history rendering
 │    └── popup.css       # styles
```

---

## ⚙️ Installation (Development)

1. Open Chrome:

   ```
   chrome://extensions
   ```

2. Enable **Developer Mode**
3. Click **Load unpacked**
4. Select the extension folder

---

## 🔐 Permissions

```json
"permissions": ["contextMenus", "scripting", "storage"],
"host_permissions": [
  "<all_urls>",
  "http://127.0.0.1:5000/*"
]
```

- `contextMenus` → adds right-click option
- `scripting` → injects toast UI
- `storage` → saves history
- `host_permissions` → allows API calls

---

## 📊 History Behavior

- Stores up to **20 most recent actions**
- Each entry includes:
  - URL
  - status (`success` / `error`)
  - timestamp
  - error reason (if any)

👉 Duplicate URLs are **allowed** (each attempt is tracked)

---

## ⚠️ Limitations

- Does not run on restricted pages:
  - `chrome://`
  - `edge://`
  - Chrome Web Store

- Toast UI not available on restricted pages
- Backend must be running locally

---

## 🧪 Testing

1. Open any website (e.g. https://google.com)
2. Right-click → **Add to Workspace**
3. Verify:
   - Toast appears (on supported pages)
   - Backend receives request

4. Click extension icon:
   - Check history list
   - Verify success/error entries

---

## 🐞 Troubleshooting

### Popup not working

- Ensure `"default_popup"` path is correct in manifest
- Check popup console (right click → Inspect)

### No toast showing

- Check content script is loaded
- Verify page is not restricted

### API errors

- Confirm backend is running at `127.0.0.1:5000`
- Confirm Qdrant container is running.
- Check logs in service worker console

---

## 🧠 Summary

This extension provides a **fast, reliable way to capture webpages**, with:

- Immediate feedback
- Robust error handling
- Persistent history tracking
