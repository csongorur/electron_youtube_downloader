const { contextBridge, ipcRenderer } = require('electron');

// The only surface the renderer gets: ask for a download, listen for progress.
contextBridge.exposeInMainWorld('grab', {
  download: (url) => ipcRenderer.invoke('grab:download', url),
  onProgress: (handler) => {
    ipcRenderer.on('grab:progress', (_event, ratio) => handler(ratio));
  },
});
