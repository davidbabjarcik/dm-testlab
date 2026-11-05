const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadJSON: (file) => ipcRenderer.invoke('load-json', file),
  saveJSON: (file, data) => ipcRenderer.invoke('save-json', { file, data })
});
