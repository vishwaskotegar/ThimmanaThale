(function () {
  function showToast({ message, type = "info", duration = 2500 }) {
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
      });

      document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.innerText = message;

    Object.assign(toast.style, {
      padding: "12px 16px",
      borderRadius: "8px",
      background: type === "error" ? "#ff4d4f" : "#1f1f1f",
      color: "#fff",
      marginTop: "8px",
      fontSize: "14px",
      boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
    });

    container.appendChild(toast);

    setTimeout(() => toast.remove(), duration);
  }

  chrome.runtime.onMessage.addListener((msg) => {
    if (msg.type === "SHOW_TOAST") {
      showToast(msg.payload);
    }
  });
})();
