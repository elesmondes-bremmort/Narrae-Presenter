import { MODULE_ID, SETTINGS } from "./constants.js";

export function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.WINDOW_STATE, {
    name: "Narrae Presenter window state",
    scope: "client",
    config: false,
    type: Object,
    default: {}
  });

  game.settings.register(MODULE_ID, SETTINGS.LAST_MODE, {
    name: "Last Narrae Presenter mode",
    scope: "client",
    config: false,
    type: String,
    default: ""
  });

  game.settings.register(MODULE_ID, SETTINGS.WHITEBOARD_OPACITY, {
    name: "Whiteboard opacity",
    hint: "Default opacity for floating player whiteboards.",
    scope: "world",
    config: true,
    type: Number,
    range: {
      min: 0.5,
      max: 1,
      step: 0.01
    },
    default: 0.92
  });
}
