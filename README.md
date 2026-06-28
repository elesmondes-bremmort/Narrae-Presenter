# Narrae Presenter

Narrae Presenter is a Foundry VTT v13 module for GMs who need to present images independently from the canvas, dynamic vision, and fog of war.

Version: `0.1.2`

## Features

- GM-only launcher in the scene controls.
- Main resizable presenter window with remembered position and size.
- Image drag and drop from Foundry-compatible data, with flexible support for Origin Vault-style payloads when they expose an image path.
- Manual image path entry and Foundry FilePicker browsing.
- Create a classic Tile on the active scene.
- Show a fullscreen player overlay via Foundry sockets.
- Show one or more floating, draggable, resizable player whiteboards via Foundry sockets.
- Active presentation list in the GM panel with "close for all" controls.

## Installation

Place this folder in Foundry's `Data/modules/narrae-presenter` directory, then enable **Narrae Presenter** in your world.

## Proposed Commit Message

`fix: capture Origin Vault drops inside presenter window`
