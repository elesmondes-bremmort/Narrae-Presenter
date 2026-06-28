import { getImageDimensions, fitDimensions } from "./image-utils.js";

export async function createTileFromImage(src) {
  if (!canvas?.ready || !canvas.scene) {
    ui.notifications.warn("Narrae Presenter: aucune scène active n'est prête.");
    return;
  }

  const sourceDimensions = await getImageDimensions(src);
  const dimensions = fitDimensions(sourceDimensions.width, sourceDimensions.height, 900, 700);
  const center = getViewCenter();

  const tileData = {
    x: Math.round(center.x - dimensions.width / 2),
    y: Math.round(center.y - dimensions.height / 2),
    width: dimensions.width,
    height: dimensions.height,
    texture: { src }
  };

  await canvas.scene.createEmbeddedDocuments("Tile", [tileData]);
  ui.notifications.info("Narrae Presenter: tile créée sur la scène active.");
}

function getViewCenter() {
  try {
    if (typeof canvas.canvasCoordinatesFromClient === "function") {
      return canvas.canvasCoordinatesFromClient({
        clientX: window.innerWidth / 2,
        clientY: window.innerHeight / 2
      });
    }
  } catch {
    // Fall back to the stage pivot below.
  }

  return {
    x: canvas.stage?.pivot?.x ?? canvas.dimensions?.width / 2 ?? 0,
    y: canvas.stage?.pivot?.y ?? canvas.dimensions?.height / 2 ?? 0
  };
}
