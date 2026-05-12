# YouTube Speed Controller

A lightweight Chrome extension that adds fast playback speed controls directly beside YouTube's captions button.

## Features

- Native-feeling `- / speed / +` widget in YouTube's bottom-right player controls.
- One-click and keyboard speed changes from `0.25x` to `10x` in `0.25x` steps.
- Uses YouTube's native shortcuts: `Shift + .` increases speed and `Shift + ,` decreases speed.
- Shows a YouTube-style centered speed overlay whenever playback speed changes.
- Automatically follows YouTube's single-page navigation and reinserts itself when the player changes.
- Remembers the last selected speed and applies it to the next video.
- Hides with YouTube's player controls when the mouse leaves the player.

## Load the extension locally

1. Open Chrome and go to `chrome://extensions`.
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `D:\Projects\youtube-speed-controller`.
5. Open a YouTube video and hover over the player controls.

## Files

- `manifest.json` declares the Manifest V3 extension and YouTube content script.
- `content.js` injects and manages the speed-control widget.
- `styles.css` makes the widget blend with YouTube's player controls.
