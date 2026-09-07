# Grab

One field. One button. An MP3 in your Downloads folder.

Grab is a small Electron app for macOS that does exactly one thing: you paste a
YouTube link, you press Download, and the audio lands in `~/Downloads` as an
MP3. No queue, no settings pane, no format matrix, no account. If you wanted a
media centre, this is the wrong window.

```
┌──────────────────────────────────────────────────────────┐
│ ● grab                                Ready to download  │
├──────────────────────────────────────────────────────────┤
│                                                          │
│      ┌────────────────────────────────────────────┐      │
│      │ https://youtube.com/watch?v=…              │      │
│      │ ──────────────────────────────────         │      │
│      └────────────────────────────────────────────┘      │
│      Saves an MP3 to your Downloads folder  [ Download ] │
│                                                          │
└──────────────────────────────────────────────────────────┘
```

## The lamp

The little dot next to the wordmark is the whole status system. Colour is state,
never decoration:

| Lamp  | State      | What it means                          |
| ----- | ---------- | -------------------------------------- |
| grey  | `idle`     | Waiting for a link                     |
| amber | `ready`    | The link parses, the button is live    |
| amber | `working`  | yt-dlp is running, the rail is filling |
| red   | `invalid`  | That link is not from YouTube          |
| red   | `error`    | Something went wrong; read the status  |

The status line spells out the same thing in words, so the app is still usable
if amber and red look alike to you.

## Before the first run

Grab does not bundle the heavy lifting. It borrows it:

```sh
brew install yt-dlp ffmpeg
```

`yt-dlp` fetches the stream, `ffmpeg` turns it into an MP3. Both are resolved
from the host machine at download time, so a packaged `Grab.app` still needs
them installed wherever it runs. If `yt-dlp` is missing, the app says so in
plain words instead of failing quietly.

## Running it

```sh
npm install
npm start
```

## Packaging it

```sh
npm run package
```

That writes `dist/Grab-darwin-arm64/Grab.app` for the architecture you are
sitting on. Add `--arch=x64` or `--arch=universal` for the others. The bundle is
ad-hoc signed: it opens on this Mac, and Gatekeeper stops it on every other one
until it is signed and notarized with a Developer ID.

## Three files, one flow

- **`main.js`** — the main process. Opens the 800×600 window and owns
  `ipcMain.handle('grab:download')`, which spawns
  `yt-dlp -x --audio-format mp3` and streams progress back over `grab:progress`.
- **`preload.js`** — the entire bridge, nine lines of it. The renderer gets
  `window.grab.download(url)` and `window.grab.onProgress(handler)`. Nothing
  else.
- **`index.html`** — markup, styles and renderer script in one file. Loaded with
  `loadFile`. No dev server, no bundler, no build step.

`build/` holds the generated icon: a play triangle turned downward, landing on
the amber meter, on the chassis-grey plate. `main.js` sets the Dock icon by hand
because an unpackaged macOS run otherwise shows Electron's face instead.

## The two rules

**The renderer stays sealed.** `contextIsolation` is on, `nodeIntegration` is
off, and the renderer cannot `require` anything. Filesystem, network, child
processes — all of it lives in `main.js` behind an `ipcMain.handle` channel with
a matching line in `preload.js`. Turning on `nodeIntegration` to save five
minutes is not a shortcut, it is a hole.

**The link never meets a shell.** The URL is handed to `spawn` as an argv entry
and re-validated against the YouTube pattern in the main process. The
renderer's regex only decides whether the button lights up; it is a UI hint, not
a guard. Keep both properties if you touch the download path.

## When it goes wrong

| Status line                            | Usually means                                        |
| -------------------------------------- | ---------------------------------------------------- |
| `yt-dlp is not installed on this machine` | `brew install yt-dlp`, or it is somewhere unusual — `main.js` looks in `/opt/homebrew/bin`, `/usr/local/bin`, `/usr/bin` |
| `That link is not from YouTube`        | Playlists, channels and other hosts are out of scope |
| Anything starting with `ERROR:`        | yt-dlp's own words, passed through untouched. `brew upgrade yt-dlp` fixes a surprising share of them |

## Design notes

The look is an instrument faceplate, not a web page: warm grey chassis, Futura
for the interface, monospace for the link and the readouts, one amber signal
colour carried by the lamp, the caret, the focus ring and the progress rail. If
you add UI, add it inside that system — a second accent colour or a card style
would break the joke.

## Scope

Audio only. YouTube only. One link at a time. No playlists (`--no-playlist` is
passed on purpose). Download what you have the right to download.

No test runner, no linter. `npm test` is still the npm placeholder and exits 1;
if tests arrive, replace that script rather than growing a second one.
