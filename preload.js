const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  toggleHide: () => ipcRenderer.invoke('toggle-hide'),
  minimizeWindow: () => ipcRenderer.invoke('minimize-window'),
  closeWindow: () => ipcRenderer.invoke('close-window'),
  setOpacity: (opacity) => ipcRenderer.invoke('set-opacity', opacity),
  getScreenSources: () => ipcRenderer.invoke('get-screen-sources'),
  performOcr: (imageDataUrl) => ipcRenderer.invoke('perform-ocr', imageDataUrl),
  toggleStealth: () => ipcRenderer.invoke('toggle-stealth'),
  onStealthChanged: (callback) => ipcRenderer.on('stealth-changed', (_, isStealth) => callback(isStealth)),
  onRemoteScroll: (callback) => ipcRenderer.on('remote-scroll', (_, direction) => callback(direction)),
  toggleTeleprompter: (enable) => ipcRenderer.invoke('toggle-teleprompter', enable),
});
