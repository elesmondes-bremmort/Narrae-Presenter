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
  return String(path ?? "").trim().replace(/^["']|["']$/g, "");
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

export async function imagePathFromDrop(event) {
  const transfer = event.dataTransfer;
  if (!transfer) return "";

  const directTypes = ["text/uri-list", "text/plain"];
  for (const type of directTypes) {
    const value = normalizeImagePath(transfer.getData(type));
    if (isSupportedImagePath(value)) return value;
  }

  const jsonTypes = ["application/json", "text/plain"];
  for (const type of jsonTypes) {
    const raw = transfer.getData(type);
    if (!raw) continue;

    try {
      const data = JSON.parse(raw);
      const found = await imagePathFromData(data);
      if (found) return found;
    } catch {
      // Non-JSON text/plain drops are common and already handled above.
    }
  }

  const files = Array.from(transfer.files ?? []);
  const imageFile = files.find((file) => file.type?.startsWith("image/"));
  if (imageFile?.path && isSupportedImagePath(imageFile.path)) return imageFile.path;

  return "";
}

async function imagePathFromData(data) {
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
  const keys = new Set([
    "src",
    "path",
    "url",
    "img",
    "image",
    "thumb",
    "thumbnail",
    "file",
    "filePath",
    "filepath",
    "assetPath",
    "source"
  ]);

  while (queue.length) {
    const current = queue.shift();
    if (!current || typeof current !== "object") continue;

    for (const [key, value] of Object.entries(current)) {
      if (typeof value === "string") {
        if (keys.has(key) || isSupportedImagePath(value)) candidates.push(value);
      } else if (value && typeof value === "object") queue.push(value);
    }
  }

  return candidates;
}
