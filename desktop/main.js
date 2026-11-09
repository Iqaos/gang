/* ==========================================================================
   Rocky — finestra desktop
   Apre la pagina in una finestra trasparente, senza bordi e sempre in primo
   piano, appoggiata subito sopra la barra delle applicazioni.
   Avvio:  npm install && npm start
   ========================================================================== */

const path = require('node:path');
const { app, BrowserWindow, screen, Menu } = require('electron');

const WIDTH = 380;
const HEIGHT = 240;

function createWindow() {
  const { workArea } = screen.getPrimaryDisplay();

  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: workArea.x + Math.round((workArea.width - WIDTH) / 2),
    y: workArea.y + workArea.height - HEIGHT,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // sopra a tutto, anche sopra la barra delle applicazioni
  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

  // il menu è quello disegnato dalla pagina (tasto destro sul cane)
  Menu.setApplicationMenu(null);

  win.loadFile(path.join(__dirname, '..', 'index.html'), { query: { dock: '1' } });

  return win;
}

app.whenReady().then(createWindow);

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

app.on('window-all-closed', () => {
  app.quit();
});
