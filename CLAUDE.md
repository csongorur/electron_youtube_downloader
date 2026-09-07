# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

- `npm start` — launch the Electron app (`electron .`).
- `npm run package` — build `dist/Grab-darwin-arm64/Grab.app` with `@electron/packager`. Host architecture only; add `--arch=x64` or `--arch=universal` for the others. The bundle is ad-hoc signed, so it runs on this machine but Gatekeeper will stop it on any other Mac until it is signed and notarized with a Developer ID.

No test runner or linter is configured. `npm test` is still the npm placeholder and exits 1; if tests are added, replace that script rather than adding a parallel one.

## Architecture

Three files, one flow: paste a link, press Download, get an MP3 in `~/Downloads`.

- `main.js` — main process. Opens the 800x600 window and owns `ipcMain.handle('grab:download')`, which spawns `yt-dlp -x --audio-format mp3` and streams progress back over `grab:progress`.
- `preload.js` — the only bridge. Exposes `window.grab.download(url)` and `window.grab.onProgress(handler)` via `contextBridge`.
- `index.html` — the whole UI: markup, styles, and renderer script inline. Loaded with `loadFile`; no dev server, no bundler, no build step.
- `build/` — `icon.png` (1024) and `icon.icns`, generated, not hand-drawn. `main.js` calls `app.dock.setIcon` because an unpackaged macOS run otherwise shows Electron's own icon.

`contextIsolation` is on and `nodeIntegration` off, so the renderer cannot `require` Node modules. Anything touching the filesystem, the network, or a child process belongs in `main.js` behind a new `ipcMain.handle` channel and a matching line in `preload.js`. Do not turn on `nodeIntegration` as a shortcut.

The URL is passed to `spawn` as an argv entry, never through a shell, and is re-validated against the YouTube pattern in the main process — the renderer's check is only for the UI state. Keep both properties when changing the download path.

`yt-dlp` and `ffmpeg` must be installed (Homebrew) — they are resolved from the host, not bundled, so a packaged `Grab.app` still needs them present on whatever Mac runs it. A GUI Electron app inherits a bare `PATH`, so `main.js` resolves them from `TOOL_DIRS` and extends `PATH` for the child process; a new external tool needs the same treatment.

## Design

The UI is a deliberate look — an instrument faceplate: warm grey chassis, Futura for the interface, monospace for the link and status, one amber signal colour carried by the lamp, caret, focus ring, and progress rail. Colour is state, not decoration: grey idle, amber ready/working, red invalid/failed, driven by `data-state` on `<body>`. Keep new UI inside that system rather than adding a second accent or a card style.

The app icon is the same system compressed to one mark: a play triangle turned downward, landing on the amber progress meter, on the chassis-grey plate.

Not a git repository — there is no history to consult, and commits are not expected unless the user initializes one.
