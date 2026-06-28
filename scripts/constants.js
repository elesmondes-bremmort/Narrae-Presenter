export const MODULE_ID = "narrae-presenter";
export const SOCKET_NAME = `module.${MODULE_ID}`;

export const SOCKET_ACTIONS = {
  SHOW_FULLSCREEN: "show-fullscreen",
  SHOW_WHITEBOARD: "show-whiteboard",
  CLOSE_PRESENTATION: "close-presentation"
};

export const PRESENTATION_TYPES = {
  FULLSCREEN: "fullscreen",
  WHITEBOARD: "whiteboard"
};

export const SETTINGS = {
  WINDOW_STATE: "windowState",
  LAST_MODE: "lastMode",
  WHITEBOARD_OPACITY: "whiteboardOpacity"
};

export const IMAGE_EXTENSIONS = ["webp", "png", "jpg", "jpeg", "gif"];
