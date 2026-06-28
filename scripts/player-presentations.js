import { MODULE_ID, PRESENTATION_TYPES, SOCKET_ACTIONS } from "./constants.js";
import { shortImageName } from "./image-utils.js";

const fullscreenNodes = new Map();
const whiteboardNodes = new Map();

export function handleSocketMessage(message) {
  if (!message || game.user.isGM) return;

  switch (message.action) {
    case SOCKET_ACTIONS.SHOW_FULLSCREEN:
      showFullscreen(message.presentation);
      break;
    case SOCKET_ACTIONS.SHOW_WHITEBOARD:
      showWhiteboard(message.presentation);
      break;
    case SOCKET_ACTIONS.CLOSE_PRESENTATION:
      closePresentation(message.id);
      break;
  }
}

function showFullscreen(presentation) {
  if (!presentation?.id || !presentation?.src) return;
  closePresentation(presentation.id);

  const node = document.createElement("div");
  node.className = `${MODULE_ID}-fullscreen`;
  node.dataset.presentationId = presentation.id;
  node.innerHTML = `
    <div class="${MODULE_ID}-fullscreen__frame">
      <button type="button" class="${MODULE_ID}-close" aria-label="Close presentation">
        <i class="fas fa-times"></i>
      </button>
      <img src="${foundry.utils.escapeHTML(presentation.src)}" alt="${foundry.utils.escapeHTML(shortImageName(presentation.src))}">
    </div>
  `;

  node.querySelector("button").addEventListener("click", () => closePresentation(presentation.id));
  const keyHandler = (event) => {
    if (event.key === "Escape") closePresentation(presentation.id);
  };
  node._narraeKeyHandler = keyHandler;
  document.addEventListener("keydown", keyHandler);

  document.body.appendChild(node);
  fullscreenNodes.set(presentation.id, node);
}

function showWhiteboard(presentation) {
  if (!presentation?.id || !presentation?.src) return;
  closePresentation(presentation.id);

  const opacity = Number.isFinite(presentation.opacity) ? presentation.opacity : 0.92;
  const node = document.createElement("section");
  node.className = `${MODULE_ID}-whiteboard`;
  node.dataset.presentationId = presentation.id;
  node.style.opacity = String(opacity);
  node.style.left = "12vw";
  node.style.top = "12vh";
  node.innerHTML = `
    <header class="${MODULE_ID}-whiteboard__header">
      <span>${foundry.utils.escapeHTML(shortImageName(presentation.src))}</span>
      <button type="button" class="${MODULE_ID}-close" aria-label="Close whiteboard">
        <i class="fas fa-times"></i>
      </button>
    </header>
    <div class="${MODULE_ID}-whiteboard__body">
      <img src="${foundry.utils.escapeHTML(presentation.src)}" alt="${foundry.utils.escapeHTML(shortImageName(presentation.src))}">
    </div>
  `;

  node.querySelector("button").addEventListener("click", () => closePresentation(presentation.id));
  makeDraggable(node, node.querySelector(`.${MODULE_ID}-whiteboard__header`));

  document.body.appendChild(node);
  whiteboardNodes.set(presentation.id, node);
}

function closePresentation(id) {
  const fullscreen = fullscreenNodes.get(id);
  if (fullscreen) {
    document.removeEventListener("keydown", fullscreen._narraeKeyHandler);
    fullscreen.remove();
    fullscreenNodes.delete(id);
  }

  const whiteboard = whiteboardNodes.get(id);
  if (whiteboard) {
    whiteboard.remove();
    whiteboardNodes.delete(id);
  }
}

function makeDraggable(node, handle) {
  let drag = null;

  handle.addEventListener("pointerdown", (event) => {
    if (event.target.closest("button")) return;
    const rect = node.getBoundingClientRect();
    drag = {
      startX: event.clientX,
      startY: event.clientY,
      left: rect.left,
      top: rect.top
    };
    handle.setPointerCapture(event.pointerId);
  });

  handle.addEventListener("pointermove", (event) => {
    if (!drag) return;
    node.style.left = `${Math.max(0, drag.left + event.clientX - drag.startX)}px`;
    node.style.top = `${Math.max(0, drag.top + event.clientY - drag.startY)}px`;
  });

  handle.addEventListener("pointerup", (event) => {
    drag = null;
    try {
      handle.releasePointerCapture(event.pointerId);
    } catch {
      // Pointer capture may already be released by the browser.
    }
  });
}
