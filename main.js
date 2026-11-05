const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

// Dáta (história, zlé/obľúbené otázky, štatistiky) sa ukladajú do userData
const DATA_DIR = path.join(app.getPath('userData'), 'data');
const ALLOWED = ['history.json', 'wrong.json', 'favorites.json', 'settings.json', 'stats.json'];

function safePath(file) {
  if (!ALLOWED.includes(file)) throw new Error('Nepovolený súbor: ' + file);
  return path.join(DATA_DIR, file);
}

function createWindow() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  const win = new BrowserWindow({
    width: 1200,
    height: 850,
    autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js') }
  });

  win.loadFile(path.join(__dirname, 'public', 'index.html'));
}

ipcMain.handle('load-json', async (event, file) => {
  try {
    const p = safePath(file);
    if (!fs.existsSync(p)) return null;
    return JSON.parse(fs.readFileSync(p, 'utf-8'));
  } catch (err) {
    console.error('LOAD ERROR:', err);
    return null;
  }
});

ipcMain.handle('save-json', async (event, { file, data }) => {
  try {
    fs.writeFileSync(safePath(file), JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('SAVE ERROR:', err);
    return false;
  }
});

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
