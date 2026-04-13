const list = document.getElementById("list");

function formatTime(ts) {
  const d = new Date(ts);
  return d.toLocaleTimeString();
}

function renderItem(item) {
  const div = document.createElement("div");
  div.className = `item ${item.status}`;

  div.innerHTML = `
    <div class="url">${item.url}</div>
    <div class="time">
      ${item.status === "success" ? "Saved" : "Failed"}  ${formatTime(item.time)}
    </div>
  `;

  return div;
}

async function loadHistory() {
  const data = await chrome.storage.local.get(["history"]);
  const history = data.history || [];

  if (history.length === 0) {
    list.innerHTML = "<div>No activity yet</div>";
    return;
  }

  history.forEach(item => {
    list.appendChild(renderItem(item));
  });
}

loadHistory();