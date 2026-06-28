import { MODULE_ID, SETTINGS, SOCKET_ACTIONS, PRESENTATION_TYPES } from "./constants.js";
import { createPresentationId, imagePathFromDrop, isSupportedImagePath, normalizeImagePath, shortImageName } from "./image-utils.js";
import { createTileFromImage } from "./tile-service.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

export class NarraePresenterApp extends HandlebarsApplicationMixin(ApplicationV2) {
  static DEFAULT_OPTIONS = {
    id: "narrae-presenter-app",
    classes: [MODULE_ID],
    tag: "form",
    window: {
      title: "Narrae Presenter",
      icon: "fas fa-images",
      resizable: true
    },
    position: {
      width: 420,
      height: 620
    },
    actions: {
      createTile: NarraePresenterApp.#onCreateTile,
      showPlayers: NarraePresenterApp.#onShowPlayers,
      showWhiteboard: NarraePresenterApp.#onShowWhiteboard,
      closePresentation: NarraePresenterApp.#onClosePresentation,
      browse: NarraePresenterApp.#onBrowse
    }
  };

  static PARTS = {
    content: {
      template: `modules/${MODULE_ID}/templates/presenter.hbs`
    }
  };

  constructor(options = {}) {
    const saved = game.settings.get(MODULE_ID, SETTINGS.WINDOW_STATE) ?? {};
    super(foundry.utils.mergeObject(options, { position: saved }, { inplace: false }));
    this.imagePath = "";
    this.error = "";
    this.presentations = [];
  }

  async _prepareContext(options) {
    return {
      imagePath: this.imagePath,
      imageName: shortImageName(this.imagePath),
      hasImage: Boolean(this.imagePath),
      error: this.error,
      presentations: this.presentations,
      hasPresentations: this.presentations.length > 0
    };
  }

  _onRender(context, options) {
    super._onRender(context, options);
    const element = this.element;
    const dropzone = element.querySelector("[data-dropzone]");
    const pathInput = element.querySelector("[name='imagePath']");

    dropzone?.addEventListener("dragover", (event) => {
      event.preventDefault();
      dropzone.classList.add("is-dragging");
    });

    dropzone?.addEventListener("dragleave", () => dropzone.classList.remove("is-dragging"));

    dropzone?.addEventListener("drop", async (event) => {
      event.preventDefault();
      dropzone.classList.remove("is-dragging");
      const path = await imagePathFromDrop(event);
      if (!path) {
        this.#setError("Drop non reconnu. Déposez une image Foundry ou saisissez son chemin manuellement.");
        return;
      }
      this.#setImagePath(path);
    });

    pathInput?.addEventListener("change", (event) => this.#setImagePath(event.currentTarget.value));
    pathInput?.addEventListener("input", (event) => {
      this.imagePath = normalizeImagePath(event.currentTarget.value);
      this.error = "";
    });
  }

  setPosition(position = {}) {
    const result = super.setPosition(position);
    this.#persistPosition();
    return result;
  }

  #setImagePath(path) {
    const normalized = normalizeImagePath(path);
    if (!isSupportedImagePath(normalized)) {
      this.#setError("Format non supporté. Utilisez webp, png, jpg, jpeg ou gif.");
      return;
    }
    this.imagePath = normalized;
    this.error = "";
    this.render();
  }

  #setError(message) {
    this.error = message;
    ui.notifications.warn(`Narrae Presenter: ${message}`);
    this.render();
  }

  #requireImage() {
    if (!isSupportedImagePath(this.imagePath)) {
      this.#setError("Choisissez une image avant de lancer cette action.");
      return "";
    }
    return this.imagePath;
  }

  async #persistPosition() {
    const position = this.position ?? {};
    await game.settings.set(MODULE_ID, SETTINGS.WINDOW_STATE, {
      left: position.left,
      top: position.top,
      width: position.width,
      height: position.height
    });
  }

  #addPresentation(type, src) {
    const presentation = {
      id: createPresentationId(),
      type,
      src,
      name: shortImageName(src),
      typeLabel: type === PRESENTATION_TYPES.FULLSCREEN ? "Show Players" : "Whiteboard"
    };
    this.presentations.unshift(presentation);
    return presentation;
  }

  async #emit(action, payload) {
    game.socket.emit(`module.${MODULE_ID}`, { action, ...payload });
  }

  static async #onCreateTile(event, target) {
    const src = this.#requireImage();
    if (!src) return;
    await game.settings.set(MODULE_ID, SETTINGS.LAST_MODE, "tile");
    await createTileFromImage(src);
  }

  static async #onShowPlayers(event, target) {
    const src = this.#requireImage();
    if (!src) return;
    const presentation = this.#addPresentation(PRESENTATION_TYPES.FULLSCREEN, src);
    await game.settings.set(MODULE_ID, SETTINGS.LAST_MODE, "fullscreen");
    await this.#emit(SOCKET_ACTIONS.SHOW_FULLSCREEN, { presentation });
    this.render();
  }

  static async #onShowWhiteboard(event, target) {
    const src = this.#requireImage();
    if (!src) return;
    const presentation = this.#addPresentation(PRESENTATION_TYPES.WHITEBOARD, src);
    presentation.opacity = game.settings.get(MODULE_ID, SETTINGS.WHITEBOARD_OPACITY);
    await game.settings.set(MODULE_ID, SETTINGS.LAST_MODE, "whiteboard");
    await this.#emit(SOCKET_ACTIONS.SHOW_WHITEBOARD, { presentation });
    this.render();
  }

  static async #onClosePresentation(event, target) {
    const id = target.dataset.id;
    if (!id) return;
    this.presentations = this.presentations.filter((presentation) => presentation.id !== id);
    await this.#emit(SOCKET_ACTIONS.CLOSE_PRESENTATION, { id });
    this.render();
  }

  static async #onBrowse() {
    const Picker = foundry.applications?.apps?.FilePicker ?? FilePicker;
    const picker = new Picker({
      type: "image",
      callback: (path) => this.#setImagePath(path)
    });
    picker.render(true);
  }
}
