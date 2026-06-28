import { MODULE_ID, SOCKET_NAME } from "./constants.js";
import { registerSettings } from "./settings.js";
import { NarraePresenterApp } from "./presenter-app.js";
import { handleSocketMessage } from "./player-presentations.js";

let presenterApp;

Hooks.once("init", () => {
  registerSettings();
});

Hooks.once("ready", () => {
  game.socket.on(SOCKET_NAME, handleSocketMessage);
});

Hooks.on("getSceneControlButtons", (controls) => {
  if (!game.user.isGM) return;

  const button = {
    name: "narrae-presenter",
    title: "Narrae Presenter",
    icon: "fas fa-images",
    button: true,
    onClick: openPresenter
  };

  const tokenControls = Array.isArray(controls)
    ? controls.find((control) => control.name === "tokens")
    : controls.tokens;

  if (tokenControls?.tools) {
    if (Array.isArray(tokenControls.tools)) tokenControls.tools.push(button);
    else tokenControls.tools["narrae-presenter"] = button;
  }
});

export function openPresenter() {
  if (!presenterApp) presenterApp = new NarraePresenterApp();
  presenterApp.render(true);
}
