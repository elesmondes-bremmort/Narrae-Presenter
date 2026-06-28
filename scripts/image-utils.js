import { IMAGE_EXTENSIONS } from "./constants.js";

export function isSupportedImagePath(path) {
  if (!path || typeof path !== "string") return false;
  const cleanPath = path.split("?")[0].split("#")[0].toLowerCase();
  return IMAGE_EXTENSIONS.some((extension) => cleanPath.endsWith(`.${extension}`));
}

export function shortImageName(path) {
  if (!path) return "";
  const last = path.split(/[\\/]/).pop() ?? path;
  return decodeURIComponent(last).replace(/\?.*$/, "");
}

export function normalizeImagePath(path) {
  const value = String(path ?? "")
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\/g, "/");

  if (/^https?:\/\//i.test(value)) {
    try {
      const url = new URL(value);
      if (url.origin === window.location.origin) {
        const path = `${url.pathname}${url.search}${url.hash}`;
        if (/^\/(?:worlds|modules|systems|uploads|assets|user)\//i.test(path)) return path.slice(1);
        return path;
      }
      return url.href;
    } catch {
      return value;
    }
  }

  return value;
}

export function createPresentationId() {
  return foundry.utils.randomID(16);
}

export async function getImageDimensions(src) {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.naturalWidth, height: image.naturalHeight });
    image.onerror = () => resolve({ width: 800, height: 600 });
    image.src = src;
  });
}

export function fitDimensions(width, height, maxWidth = 800, maxHeight = 600) {
  if (!width || !height) return { width: maxWidth, height: Math.round(maxWidth * 0.75) };
  const scale = Math.min(maxWidth / width, maxHeight / height, 1);
  return {
    width: Math.max(64, Math.round(width * scale)),
    height: Math.max(64, Math.round(height * scale))
  };
}

export async function extractImagePathFromDrop(event) {
  const transfer = event.dataTransfer;
  if (!transfer) return { path: "", error: unrecognizedDropMessage() };

  debugDropPayload(transfer);

  const files = Array.from(transfer.files ?? []);
  const localImage = files.find((file) => file.type?.startsWith("image/"));
  if (localImage) {
    return {
      path: "",
      error: "Image locale détectée. L'upload automatique arrive au prochain patch ; utilisez pour l'instant Origin Vault ou un asset déjà uploadé."
    };
  }

  const jsonPayload = getTransferData(transfer, "application/json");
  if (jsonPayload) {
    try {
      const data = JSON.parse(jsonPayload);
      const found = await imagePathFromData(data);
      if (found) return { path: found, error: "" };
    } catch {
      // Some modules expose JSON-like data in text fields instead.
    }
  }

  for (const type of ["text/plain", "text/uri-list", "text"]) {
    const raw = getTransferData(transfer, type);
    const found = findImagePathInText(raw);
    if (found) return { path: found, error: "" };

    if (raw?.trim().startsWith("{")) {
      try {
        const data = JSON.parse(raw);
        const nested = await imagePathFromData(data);
        if (nested) return { path: nested, error: "" };
      } catch {
        // Keep trying the other payload formats.
      }
    }
  }

  const html = getTransferData(transfer, "text/html");
  const htmlPath = findImagePathInHtml(html);
  if (htmlPath) return { path: htmlPath, error: "" };

  for (const type of Array.from(transfer.types ?? [])) {
    if (["application/json", "text/plain", "text/uri-list", "text", "text/html"].includes(type)) continue;
    const raw = getTransferData(transfer, type);
    const found = findImagePathInText(raw);
    if (found) return { path: found, error: "" };

    if (raw?.trim().startsWith("{") || raw?.trim().startsWith("[")) {
      try {
        const data = JSON.parse(raw);
        const nested = await imagePathFromData(data);
        if (nested) return { path: nested, error: "" };
      } catch {
        // Ignore unreadable custom drag payloads.
      }
    }
  }

  return { path: "", error: unrecognizedDropMessage() };
}

export async function imagePathFromDrop(event) {
  return (await extractImagePathFromDrop(event)).path;
}

function debugDropPayload(transfer) {
  if (!game.user.isGM) return;

  const types = Array.from(transfer.types ?? []);
  const requestedTypes = ["text/plain", "text/uri-list", "text/html", "application/json", "text"];
  const allTypes = Array.from(new Set([...requestedTypes, ...types]));

  console.groupCollapsed("[Narrae Presenter] drop payload");
  console.log("types", types);

  for (const type of allTypes) {
    try {
      const value = transfer.getData(type);
      console.log(type, value || "<empty>");
    } catch {
      console.log(type, "<unavailable>");
    }
  }

  if (transfer.files?.length) {
    console.log(
      "files",
      Array.from(transfer.files).map((file) => ({ name: file.name, type: file.type, size: file.size }))
    );
  }

  console.groupEnd();
}

function getTransferData(transfer, type) {
  try {
    return transfer.getData(type);
  } catch {
    return "";
  }
}

function unrecognizedDropMessage() {
  return "Drop non reconnu. Ouvrez la console F12 et envoyez le groupe [Narrae Presenter] drop payload pour diagnostic.";
}

async function imagePathFromData(data) {
  if (typeof data === "string") return findImagePathInText(data);
  if (!data || typeof data !== "object") return "";

  const candidates = collectCandidatePaths(data);
  for (const candidate of candidates) {
    const normalized = normalizeImagePath(candidate);
    if (isSupportedImagePath(normalized)) return normalized;
  }

  if (data.uuid) {
    try {
      const document = await fromUuid(data.uuid);
      const documentCandidates = collectCandidatePaths(document);
      for (const candidate of documentCandidates) {
        const normalized = normalizeImagePath(candidate);
        if (isSupportedImagePath(normalized)) return normalized;
      }
    } catch {
      return "";
    }
  }

  return "";
}

function collectCandidatePaths(source) {
  const candidates = [];
  const queue = [source];
  const seen = new WeakSet();

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;
    if (seen.has(current)) continue;
    seen.add(current);

    for (const value of Object.values(current)) {
      if (typeof value === "string") {
        const found = findImagePathInText(value);
        if (found) candidates.push(found);
      } else if (value && typeof value === "object") queue.push(value);
    }
  }

  return candidates;
}

function findImagePathInHtml(html) {
  if (!html) return "";
  const srcMatch = html.match(/<img\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/i);
  if (srcMatch?.[1]) {
    const path = normalizeImagePath(decodeHtmlEntities(srcMatch[1]));
    if (isSupportedImagePath(path)) return path;
  }

  return findImagePathInText(decodeHtmlEntities(html));
}

function findImagePathInText(text) {
  if (!text || typeof text !== "string") return "";
  const decoded = decodeHtmlEntities(text);
  const patterns = [
    /https?:\/\/[^\s"'<>]+\.(?:webp|png|jpe?g|gif)(?:[?#][^\s"'<>]*)?/i,
    /(?:worlds|modules|systems|uploads|assets|user)\/[^\s"'<>]+\.(?:webp|png|jpe?g|gif)(?:[?#][^\s"'<>]*)?/i,
    /\/(?:worlds|modules|systems|uploads|assets|user)\/[^\s"'<>]+\.(?:webp|png|jpe?g|gif)(?:[?#][^\s"'<>]*)?/i,
    /[^\s"'<>]+\.(?:webp|png|jpe?g|gif)(?:[?#][^\s"'<>]*)?/i
  ];

  for (const pattern of patterns) {
    const match = decoded.match(pattern);
    if (!match?.[0]) continue;

    const path = normalizeImagePath(match[0].replace(/[),.;]+$/, ""));
    if (isSupportedImagePath(path)) return path;
  }

  return "";
}

function decodeHtmlEntities(value) {
  const textarea = document.createElement("textarea");
  textarea.innerHTML = value;
  return textarea.value;
}
