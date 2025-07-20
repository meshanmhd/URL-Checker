function showPopup(isUnsafe, url) {
  const popup = document.createElement("div");
  popup.className = `alert ${isUnsafe ? "alert-error" : "alert-success"}`;

  popup.innerHTML = `
    <div class="icon">${isUnsafe ? "⛔" : "✔️"}</div>
    <div class="text">
      <strong>${isUnsafe ? "Error:" : "Success:"}</strong>
      ${isUnsafe ? " This site may be unsafe." : " This site is verified safe."}
    </div>
    <button class="close">&times;</button>
  `;

  document.body.appendChild(popup);

  popup.querySelector(".close").addEventListener("click", () => {
    popup.classList.add("fade-out");
    setTimeout(() => popup.remove(), 300);
  });

  setTimeout(() => {
    popup.classList.add("fade-out");
    setTimeout(() => popup.remove(), 300);
  }, 6000);
}

// Styles
const style = document.createElement("style");
style.textContent = `
  .alert {
    position: fixed;
    top: 20px;
    right: 20px;
    display: flex;
    align-items: center;
    padding: 12px 18px;
    border-radius: 10px;
    backdrop-filter: blur(8px);
    background-color: rgba(255, 255, 255, 0.7);
    box-shadow: 0 6px 18px rgba(0,0,0,0.15);
    font-family: 'Segoe UI', sans-serif;
    color: #222;
    gap: 10px;
    border: 1px solid transparent;
    min-width: 280px;
    z-index: 99999;
    animation: fade-in 0.3s ease;
  }

  .alert .icon {
    font-size: 20px;
  }

  .alert .text {
    flex-grow: 1;
    font-size: 14px;
  }

  .alert .text strong {
    font-weight: 600;
  }

  .alert .close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: #555;
    line-height: 1;
  }

  .alert-success {
    border-color: #b0e6b0;
    background-color: rgba(200, 255, 200, 0.6);
  }

  .alert-error {
    border-color: #f5bcbc;
    background-color: rgba(255, 200, 200, 0.6);
  }

  @keyframes fade-in {
    from { opacity: 0; transform: translateY(-10px); }
    to { opacity: 1; transform: translateY(0); }
  }

  .fade-out {
    opacity: 0;
    transition: opacity 0.3s ease;
  }
`;
document.head.appendChild(style);

chrome.runtime.onMessage.addListener((request) => {
  if (request.action === "showSiteStatus") {
    showPopup(request.unsafe, request.url);
  }
});
