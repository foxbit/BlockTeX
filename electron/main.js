'use strict';

const { app, BrowserWindow, shell, ipcMain, dialog } = require('electron');
const path = require('path');
const http = require('http');

const isDev = process.env.ELECTRON_DEV === 'true';

// ─── Caminho do backend ────────────────────────────────────────────
// Em produção, o backend é empacotado em extraResources
const backendPath = app.isPackaged
  ? path.join(process.resourcesPath, 'backend', 'server.js')
  : path.join(__dirname, '..', 'backend', 'server.js');

// ─── Inicia o backend Express ──────────────────────────────────────
require(backendPath);

// ─── Janelas ────────────────────────────────────────────────────────
let mainWindow = null;
let splashWindow = null;

function createSplashWindow() {
  splashWindow = new BrowserWindow({
    width: 400,
    height: 300,
    frame: false,
    transparent: true,
    resizable: false,
    alwaysOnTop: true,
    webPreferences: { nodeIntegration: false, contextIsolation: true },
    icon: path.join(__dirname, '..', 'frontend', 'public', 'icon.png'),
  });

  const splashPath = path.join(__dirname, 'splash.html');
  splashWindow.loadFile(splashPath);
  splashWindow.center();
}

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 1440,
    height: 900,
    minWidth: 1024,
    minHeight: 600,
    show: false, // mostrar só após carregado
    frame: true,
    titleBarStyle: 'default',
    title: 'BlockTeX',
    icon: path.join(__dirname, '..', 'frontend', 'public', 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true,
    },
  });

  // ─── Carrega URL conforme ambiente ──────────────────────────────
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(
      path.join(__dirname, '..', 'frontend', 'dist', 'index.html')
    );
  }

  // ─── Abre links externos no browser padrão do sistema ───────────
  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    const parsedUrl = new URL(url);
    // Permite navegação local (file:// e localhost)
    if (parsedUrl.protocol !== 'file:' && !url.includes('localhost')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });

  // ─── Quando pronto: fecha splash e mostra o app ──────────────────
  mainWindow.once('ready-to-show', () => {
    if (splashWindow && !splashWindow.isDestroyed()) {
      splashWindow.close();
      splashWindow = null;
    }
    mainWindow.show();
    mainWindow.focus();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// ─── Aguarda backend estar pronto ────────────────────────────────────
function waitForBackend(maxAttempts = 30, interval = 500) {
  return new Promise((resolve, reject) => {
    let attempts = 0;
    const check = () => {
      const req = http.get('http://localhost:3001/api/health', (res) => {
        if (res.statusCode === 200) {
          resolve();
        } else {
          retry();
        }
      });
      req.on('error', retry);
      req.setTimeout(400, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      attempts++;
      if (attempts >= maxAttempts) {
        reject(new Error('Backend não iniciou a tempo'));
      } else {
        setTimeout(check, interval);
      }
    };
    check();
  });
}

// ─── IPC Handlers ────────────────────────────────────────────────────
ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('dialog:openFile', async (_, options) => {
  const result = await dialog.showOpenDialog(mainWindow, options || {
    properties: ['openFile'],
    filters: [
      { name: 'Imagens', extensions: ['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg'] },
      { name: 'Todos os arquivos', extensions: ['*'] },
    ],
  });
  return result;
});

ipcMain.handle('dialog:saveFile', async (_, options) => {
  const result = await dialog.showSaveDialog(mainWindow, options || {
    filters: [{ name: 'PDF', extensions: ['pdf'] }],
  });
  return result;
});

// ─── Ciclo de vida do app ────────────────────────────────────────────
app.whenReady().then(async () => {
  // 1. Abre a splash screen imediatamente
  createSplashWindow();

  // 2. Aguarda o backend Express estar respondendo
  try {
    await waitForBackend();
  } catch (err) {
    console.error('[Electron] Backend não respondeu:', err.message);
    // Mesmo assim tenta abrir — o frontend mostrará erro de conexão
  }

  // 3. Cria a janela principal
  createMainWindow();
});

// No macOS o app não fecha quando todas janelas são fechadas
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createMainWindow();
  }
});

// Segurança: previne criação de janelas adicionais
app.on('web-contents-created', (_, contents) => {
  contents.on('will-attach-webview', (event) => {
    event.preventDefault();
  });
});
