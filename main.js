const { app, BrowserWindow, ipcMain, screen, desktopCapturer, globalShortcut, dialog, shell } = require('electron');
const path = require('path');
const Tesseract = require('tesseract.js');
const pdfParse = require('pdf-parse');
const fs = require('fs');

// Fix Windows GPU cache errors
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow = null;
let isHidden = false;
let isStealthMode = false;
let savedNormalBounds = null;
let toastWindow = null;
let toastTimeout = null;

function closeStealthToast() {
  if (toastTimeout) {
    clearTimeout(toastTimeout);
    toastTimeout = null;
  }
  if (toastWindow && !toastWindow.isDestroyed()) {
    try {
      toastWindow.destroy();
    } catch (e) {}
    toastWindow = null;
  }
}

// Show screen-share invisible stealth notification toast
function showStealthToast() {
  try {
    closeStealthToast();

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    toastWindow = new BrowserWindow({
      width: 360,
      height: 90,
      x: width - 380,
      y: height - 100,
      frame: false,
      transparent: true,
      alwaysOnTop: true,
      skipTaskbar: true,
      resizable: false,
      focusable: true,
      hasShadow: true,
      webPreferences: {
        nodeIntegration: false,
        contextIsolation: true,
        preload: path.join(__dirname, 'preload.js'),
      }
    });

    // 🔑 100% Invisible to Zoom, Teams & Meet Screen Share
    toastWindow.setContentProtection(true);
    toastWindow.setAlwaysOnTop(true, 'screen-saver', 2);
    toastWindow.loadFile('toast.html');

    // Auto close after 7 seconds
    toastTimeout = setTimeout(() => {
      closeStealthToast();
    }, 7500);

    toastWindow.on('closed', () => {
      toastWindow = null;
    });
  } catch (err) {
    console.error('Toast notification error:', err);
  }
}

function restoreApp() {
  closeStealthToast();
  if (!mainWindow) return;
  if (mainWindow.isMinimized()) {
    mainWindow.restore();
  } else {
    mainWindow.show();
  }
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  mainWindow.focus();
}

function loadWindowBounds() {
  try {
    const boundsPath = path.join(app.getPath('userData'), 'window-bounds.json');
    if (fs.existsSync(boundsPath)) {
      const data = fs.readFileSync(boundsPath, 'utf8');
      return JSON.parse(data);
    }
  } catch (e) {
    console.error('Failed to load window bounds:', e);
  }
  return null;
}

function saveWindowBounds(bounds) {
  try {
    const boundsPath = path.join(app.getPath('userData'), 'window-bounds.json');
    fs.writeFileSync(boundsPath, JSON.stringify(bounds));
  } catch (e) {
    console.error('Failed to save window bounds:', e);
  }
}

function createWindow() {
  const { width, height } = screen.getPrimaryDisplay().workAreaSize;
  const savedBounds = loadWindowBounds();

  const defaultBounds = {
    width: 500,
    height: 750,
    x: width - 520,
    y: 40
  };

  const bounds = savedBounds || defaultBounds;
  const windowBounds = {
    width: Math.min(Math.max(bounds.width || 500, 420), 600),
    height: Math.min(Math.max(bounds.height || 750, 600), 900),
    x: bounds.x != null ? bounds.x : defaultBounds.x,
    y: bounds.y != null ? bounds.y : defaultBounds.y
  };

  mainWindow = new BrowserWindow({
    width: windowBounds.width,
    height: windowBounds.height,
    x: windowBounds.x,
    y: windowBounds.y,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: true,
    minWidth: 420,
    minHeight: 600,
    maxWidth: 600,
    maxHeight: 900,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    icon: path.join(__dirname, 'icon.png'),
    title: 'Crack it',
    hasShadow: true,
    roundedCorners: true,
  });

  // 🔑 KEY FEATURE: Hide from screen share
  mainWindow.setContentProtection(true);
  mainWindow.loadFile('index.html');
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  let boundsTimer = null;
  function debounceSaveBounds() {
    if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) {
      clearTimeout(boundsTimer);
      boundsTimer = setTimeout(() => saveWindowBounds(mainWindow.getBounds()), 500);
    }
  }
  mainWindow.on('move', debounceSaveBounds);
  mainWindow.on('resize', debounceSaveBounds);
}

app.whenReady().then(() => {
  createWindow();

  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'audioCapture', 'desktopCapture', 'screen'];
    callback(allowedPermissions.includes(permission));
  });

  session.defaultSession.setPermissionCheckHandler((webContents, permission) => {
    const allowedPermissions = ['media', 'microphone', 'audioCapture', 'desktopCapture', 'screen'];
    return allowedPermissions.includes(permission);
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  // 🕵️ Global Shortcut: Ctrl+Shift+A — Toggle Stealth (click-through)
  globalShortcut.register('Ctrl+Shift+A', () => {
    if (!mainWindow) return;
    isStealthMode = !isStealthMode;
    if (isStealthMode) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
      mainWindow.webContents.send('stealth-changed', true);
    } else {
      mainWindow.setIgnoreMouseEvents(false);
      mainWindow.webContents.send('stealth-changed', false);
    }
  });

  // 📌 Global Shortcut: Ctrl+B — Toggle Minimize/Restore
  let boundsBeforeMinimize = null;
  globalShortcut.register('Ctrl+B', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) {
      restoreApp();
      if (boundsBeforeMinimize) {
        mainWindow.setBounds(boundsBeforeMinimize);
        boundsBeforeMinimize = null;
      }
    } else {
      boundsBeforeMinimize = mainWindow.getBounds();
      mainWindow.minimize();
      showStealthToast();
    }
  });

  // 📜 Global Shortcut: Ctrl+Shift+↑/↓ — Scroll panel remotely
  globalShortcut.register('Ctrl+Shift+Down', () => {
    if (mainWindow) mainWindow.webContents.send('remote-scroll', 'down');
  });
  globalShortcut.register('Ctrl+Shift+Up', () => {
    if (mainWindow) mainWindow.webContents.send('remote-scroll', 'up');
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Restore window from Toast notification click
ipcMain.handle('restore-from-toast', () => {
  restoreApp();
});

// IPC: Close Toast notification directly
ipcMain.handle('close-toast', () => {
  closeStealthToast();
});

// IPC: Toggle screen share hide
ipcMain.handle('toggle-hide', () => {
  isHidden = !isHidden;
  mainWindow.setContentProtection(isHidden);
  mainWindow.setOpacity(isHidden ? 0.15 : 1.0);
  if (isHidden) showStealthToast();
  return isHidden;
});

// IPC: Toggle stealth mode from renderer
ipcMain.handle('toggle-stealth', () => {
  if (!mainWindow) return false;
  isStealthMode = !isStealthMode;
  if (isStealthMode) {
    mainWindow.setIgnoreMouseEvents(true, { forward: true });
  } else {
    mainWindow.setIgnoreMouseEvents(false);
  }
  mainWindow.webContents.send('stealth-changed', isStealthMode);
  return isStealthMode;
});

// IPC: Minimize window
ipcMain.handle('minimize-window', () => {
  if (!mainWindow) return;
  mainWindow.minimize();
  showStealthToast();
});

// IPC: Close window
ipcMain.handle('close-window', () => {
  if (mainWindow) mainWindow.close();
});

// IPC: Make window draggable / set opacity
ipcMain.handle('set-opacity', (event, opacity) => {
  if (mainWindow) mainWindow.setOpacity(opacity);
});

// IPC: Get screen sources for screenshot
ipcMain.handle('get-screen-sources', async () => {
  const sources = await desktopCapturer.getSources({
    types: ['screen'],
    thumbnailSize: { width: 1920, height: 1080 }
  });
  return sources.map(s => ({
    id: s.id,
    name: s.name,
    thumbnail: s.thumbnail.toDataURL()
  }));
});

// IPC: OCR screenshot using Tesseract.js (local)
ipcMain.handle('perform-ocr', async (event, imageDataUrl) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng', { logger: () => {} });
    return text?.trim() || '';
  } catch (e) {
    console.error('OCR error:', e);
    return '';
  }
});

// IPC: Get audio devices
ipcMain.handle('get-audio-devices', async () => {
  try {
    return await desktopCapturer.getSources({ types: ['audio', 'screen'] });
  } catch (e) {
    return [];
  }
});

// IPC: Toggle Teleprompter Mode
ipcMain.handle('toggle-teleprompter', (_, enable) => {
  if (!mainWindow) return;
  const { width } = screen.getPrimaryDisplay().workAreaSize;
  if (enable) {
    savedNormalBounds = mainWindow.getBounds();
    mainWindow.setMinimumSize(400, 60);
    mainWindow.setMaximumSize(width + 100, 300);
    mainWindow.setResizable(true);
    mainWindow.setBounds({ x: 0, y: 0, width: width, height: 100 });
  } else {
    mainWindow.setMinimumSize(420, 600);
    mainWindow.setMaximumSize(600, 900);
    mainWindow.setResizable(true);
    const b = savedNormalBounds || { x: width - 520, y: 40, width: 500, height: 750 };
    mainWindow.setBounds(b);
    savedNormalBounds = null;
  }
});

// IPC: Open file dialog for resume PDF
ipcMain.handle('open-resume-dialog', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select your Resume (PDF)',
    filters: [{ name: 'PDF Files', extensions: ['pdf'] }],
    properties: ['openFile']
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});

// IPC: Parse resume PDF
ipcMain.handle('parse-resume', async (_, filePath) => {
  try {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdfParse(dataBuffer);
    return { success: true, text: data.text?.trim() || '', filename: path.basename(filePath), pages: data.numpages };
  } catch (e) {
    return { success: false, error: e.message };
  }
});

// IPC: Open external URL in default browser
ipcMain.handle('open-external', async (_, url) => {
  try {
    if (url && (url.startsWith('https://') || url.startsWith('http://'))) {
      await shell.openExternal(url);
      return true;
    }
  } catch (e) {
    console.error('Failed to open external URL:', e);
  }
  return false;
});