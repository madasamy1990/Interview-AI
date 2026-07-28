const { app, BrowserWindow, ipcMain, screen, desktopCapturer, globalShortcut } = require('electron');
const path = require('path');
const Tesseract = require('tesseract.js');

// Fix Windows GPU cache errors (harmless but noisy)
app.commandLine.appendSwitch('disable-gpu-shader-disk-cache');
app.commandLine.appendSwitch('no-sandbox');

let mainWindow;
let isHidden = false;
let isStealthMode = false;
const fs = require('fs');

// Load saved window bounds
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

// Save window bounds
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

  // Use saved bounds but clamp to min/max limits
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

  // Keep always on top even when other windows focused
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);

  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  // Save window bounds on move/resize
  mainWindow.on('move', () => {
    if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) {
      saveWindowBounds(mainWindow.getBounds());
    }
  });
  mainWindow.on('resize', () => {
    if (!mainWindow.isMinimized() && !mainWindow.isMaximized()) {
      saveWindowBounds(mainWindow.getBounds());
    }
  });
}

app.whenReady().then(() => {
  createWindow();

  // Grant microphone and speech recognition permissions
  const { session } = require('electron');
  session.defaultSession.setPermissionRequestHandler((webContents, permission, callback) => {
    const allowedPermissions = ['media', 'microphone', 'audioCapture', 'desktopCapture', 'screen'];
    if (allowedPermissions.includes(permission)) {
      callback(true);
    } else {
      callback(false);
    }
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
      // Mouse passes through — invisible to screen share viewers
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
      mainWindow.webContents.send('stealth-changed', true);
    } else {
      // Normal mode — can click/interact
      mainWindow.setIgnoreMouseEvents(false);
      mainWindow.webContents.send('stealth-changed', false);
    }
  });

  // 📌 Global Shortcut: Ctrl+B — Toggle Minimize/Restore
  let boundsBeforeMinimize = null;
  globalShortcut.register('Ctrl+B', () => {
    if (!mainWindow) return;
    if (mainWindow.isMinimized()) {
      // Restore to previous position
      mainWindow.restore();
      if (boundsBeforeMinimize) {
        mainWindow.setBounds(boundsBeforeMinimize);
        boundsBeforeMinimize = null;
      }
      mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
      mainWindow.focus();
    } else {
      // Save current position, then minimize
      boundsBeforeMinimize = mainWindow.getBounds();
      mainWindow.minimize();
    }
  });

  // 📜 Global Shortcut: Ctrl+Shift+↑/↓ — Scroll Crack it panel from ANY app
  globalShortcut.register('Ctrl+Shift+Down', () => {
    if (!mainWindow) return;
    mainWindow.webContents.send('remote-scroll', 'down');
  });
  globalShortcut.register('Ctrl+Shift+Up', () => {
    if (!mainWindow) return;
    mainWindow.webContents.send('remote-scroll', 'up');
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

// IPC: Toggle screen share hide
ipcMain.handle('toggle-hide', () => {
  isHidden = !isHidden;
  mainWindow.setContentProtection(isHidden);
  mainWindow.setOpacity(isHidden ? 0.15 : 1.0);
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
  mainWindow.minimize();
});

// IPC: Close window
ipcMain.handle('close-window', () => {
  mainWindow.close();
});

// IPC: Make window draggable
ipcMain.handle('set-opacity', (event, opacity) => {
  mainWindow.setOpacity(opacity);
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
// IPC: OCR screenshot using Tesseract.js (local, no API key needed)
ipcMain.handle('perform-ocr', async (event, imageDataUrl) => {
  try {
    const { data: { text } } = await Tesseract.recognize(imageDataUrl, 'eng', {
      logger: () => {} // suppress logs
    });
    return text?.trim() || '';
  } catch (e) {
    console.error('OCR error:', e);
    return '';
  }
});

// IPC: Get audio devices
ipcMain.handle('get-audio-devices', async () => {
  try {
    const devices = await desktopCapturer.getSources({ types: ['audio', 'screen'] });
    return devices;
  } catch (e) {
    return [];
  }
});
