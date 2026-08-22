const { app, BrowserWindow, ipcMain, screen, desktopCapturer, globalShortcut, dialog, shell } = require('electron');
const { autoUpdater } = require('electron-updater');
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
      const parsed = JSON.parse(data);
      // Migrate old small/vertical layout to match the exact photo layout
      if (parsed && (parsed.width < 750 || parsed.height < 400)) {
        return null;
      }
      return parsed;
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
  
  // Exact size & position as shown in photo:
  // 78% screen width (centered) and 75% work area height (below webcam down to taskbar)
  const targetWidth = Math.min(1080, Math.round(width * 0.78));
  const targetHeight = Math.min(640, Math.round(height * 0.75));
  const targetX = Math.max(0, Math.round((width - targetWidth) / 2));
  const targetY = 20;

  const defaultBounds = {
    width: targetWidth,
    height: targetHeight,
    x: targetX,
    y: targetY
  };

  const savedBounds = loadWindowBounds();
  const bounds = savedBounds || defaultBounds;
  const windowBounds = {
    width: bounds.width ? Math.min(Math.max(bounds.width, 500), width) : targetWidth,
    height: bounds.height ? Math.min(Math.max(bounds.height, 200), height - 20) : targetHeight,
    x: bounds.x != null ? bounds.x : targetX,
    y: bounds.y != null ? bounds.y : targetY
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
    minWidth: 480,
    minHeight: 200,
    maxWidth: 1600,
    maxHeight: 1000,
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

  // 🔄 Initialize Automatic Background Updater
  initAutoUpdater();
});

// 🔄 Setup Auto-Updater with GitHub Releases (madasamy1990/Interview-AI)
function initAutoUpdater() {
  autoUpdater.autoDownload = true;
  autoUpdater.autoInstallOnAppQuit = true;

  autoUpdater.on('checking-for-update', () => {
    console.log('[AutoUpdater] Checking for updates on GitHub...');
  });

  autoUpdater.on('update-available', (info) => {
    console.log(`[AutoUpdater] Update available: v${info.version}`);
  });

  autoUpdater.on('update-not-available', () => {
    console.log('[AutoUpdater] App is up to date.');
  });

  autoUpdater.on('error', (err) => {
    console.log('[AutoUpdater] Error:', err?.message || err);
  });

  autoUpdater.on('update-downloaded', (info) => {
    console.log(`[AutoUpdater] Update v${info.version} downloaded in background.`);
    dialog.showMessageBox(mainWindow || undefined, {
      type: 'info',
      buttons: ['🎉 Update & Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
      title: '🎉 New Version Ready!',
      message: `Crack It AI update (v${info.version}) has been downloaded in the background.`,
      detail: 'Click "Update & Restart Now" to switch to the latest version immediately.'
    }).then((result) => {
      if (result.response === 0) {
        autoUpdater.quitAndInstall();
      }
    }).catch((e) => {
      console.error('[AutoUpdater] Dialog error:', e);
    });
  });

  // Trigger background check 4 seconds after app starts
  setTimeout(() => {
    autoUpdater.checkForUpdatesAndNotify().catch((err) => {
      console.log('[AutoUpdater] Background check failed:', err?.message || err);
    });
  }, 4000);
}

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
    mainWindow.setMinimumSize(480, 200);
    mainWindow.setMaximumSize(1600, 1000);
    mainWindow.setResizable(true);
    const { height: h } = screen.getPrimaryDisplay().workAreaSize;
    const targetWidth = Math.min(1080, Math.round(width * 0.78));
    const targetHeight = Math.min(640, Math.round(h * 0.75));
    const b = savedNormalBounds || { x: Math.max(0, Math.round((width - targetWidth) / 2)), y: 20, width: targetWidth, height: targetHeight };
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