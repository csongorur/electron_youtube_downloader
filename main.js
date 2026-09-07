const { app, BrowserWindow, ipcMain } = require('electron');
const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');

const ICON = path.join(__dirname, 'build', 'icon.png');

const YOUTUBE = /^(https?:\/\/)?((www|m|music)\.)?(youtube\.com\/(watch\?|shorts\/|live\/|embed\/)|youtu\.be\/)\S+$/i;

// A GUI app inherits a bare PATH, so Homebrew's yt-dlp and ffmpeg are not on it.
const TOOL_DIRS = ['/opt/homebrew/bin', '/usr/local/bin', '/usr/bin'];

const findTool = (name) => {
    const dir = TOOL_DIRS.find((candidate) => fs.existsSync(path.join(candidate, name)));
    return dir ? path.join(dir, name) : name;
};

const createWindow = () => {
    const win = new BrowserWindow({
        width: 800,
        height: 600,
        icon: ICON,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    win.loadFile('index.html');
};

// yt-dlp -x --audio-format mp3 "<link>", with the link handed over as an argv
// entry so nothing in it can reach a shell.
const download = (sender, url) => new Promise((resolve) => {
    if (!YOUTUBE.test(url.trim())) {
        resolve({ ok: false, message: 'That link is not from YouTube' });
        return;
    }

    const downloads = app.getPath('downloads');
    const ytdlp = spawn(findTool('yt-dlp'), [
        '-x',
        '--audio-format', 'mp3',
        '--newline',
        '--no-playlist',
        '-o', path.join(downloads, '%(title)s.%(ext)s'),
        url.trim(),
    ], {
        env: { ...process.env, PATH: [...TOOL_DIRS, process.env.PATH].join(':') },
    });

    let destination = '';
    let lastError = '';

    ytdlp.stdout.on('data', (chunk) => {
        for (const line of String(chunk).split('\n')) {
            const percent = line.match(/\[download\]\s+([\d.]+)%/);
            if (percent) sender.send('grab:progress', Number(percent[1]) / 100);

            const saved = line.match(/\[(?:ExtractAudio|download)\] Destination: (.+)/);
            if (saved) destination = saved[1].trim();
        }
    });

    ytdlp.stderr.on('data', (chunk) => {
        const message = String(chunk).trim();
        if (message) lastError = message.split('\n').pop().replace(/^ERROR:\s*/, '');
    });

    ytdlp.on('error', () => {
        resolve({ ok: false, message: 'yt-dlp is not installed on this machine' });
    });

    ytdlp.on('close', (code) => {
        if (code === 0) resolve({ ok: true, file: path.basename(destination) || 'the file' });
        else resolve({ ok: false, message: lastError || `yt-dlp stopped with code ${code}` });
    });
});

app.whenReady().then(() => {
    // Unpackaged macOS runs show Electron's own icon in the Dock unless we set it.
    if (process.platform === 'darwin' && app.dock) app.dock.setIcon(ICON);

    ipcMain.handle('grab:download', (event, url) => download(event.sender, url));
    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
});
