'use strict';

const { contextBridge, ipcRenderer } = require('electron');

// Expõe APIs seguras para o renderer process via contextBridge
// O frontend usa HTTP/REST para tudo, então esta bridge é mínima.
contextBridge.exposeInMainWorld('electronAPI', {
  // Versão do app
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  // Abrir diálogo de arquivo nativo (futuramente para importar .tex, etc.)
  openFile: (options) => ipcRenderer.invoke('dialog:openFile', options),
  saveFile: (options) => ipcRenderer.invoke('dialog:saveFile', options),

  // Plataforma atual
  platform: process.platform,

  // Indica que está rodando dentro do Electron
  isElectron: true,
});
