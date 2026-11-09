/* ==========================================================================
   Rocky — finestra desktop
   Finestra trasparente, senza bordi, sempre in primo piano, appoggiata
   DENTRO la barra delle applicazioni: il cane occupa gli ultimi pixel in
   basso, il resto della finestra è trasparente e lascia passare i clic.
   Avvio:  npm install && npm start
   ========================================================================== */

const path = require('node:path');
const { app, BrowserWindow, screen, Menu, ipcMain } = require('electron');

/* Altezza pensata per cane (80×48), menu (una riga) e pannello impostazioni
   compatto; la larghezza è quella dello schermo, così il cane può passeggiare
   lungo tutta la barra (e il resto della finestra è trasparente). */
const HEIGHT = 176;

function createWindow() {
  // `bounds` comprende la barra delle applicazioni, `workArea` no:
  // così il fondo della finestra coincide con il fondo dello schermo.
  const { bounds } = screen.getPrimaryDisplay();
  const WIDTH = bounds.width;

  const win = new BrowserWindow({
    width: WIDTH,
    height: HEIGHT,
    x: bounds.x,
    y: bounds.y + bounds.height - HEIGHT,
    transparent: true,
    backgroundColor: '#00000000',
    frame: false,
    hasShadow: false,
    resizable: false,
    maximizable: false,
    minimizable: false,
    fullscreenable: false,
    alwaysOnTop: true,
    skipTaskbar: false,
    title: 'Rocky',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  // Sopra a tutto, anche sopra la barra delle applicazioni. La barra però è a
  // sua volta "sempre in primo piano": toccandola passerebbe davanti al cane,
  // quindi rialziamo la finestra appena perde il fuoco (e ogni tanto), così
  // resta incollata sopra la barra.
  const raise = () => {
    if (win.isDestroyed()) return;
    win.setAlwaysOnTop(true, 'screen-saver');
    win.moveTop();
  };

  win.setAlwaysOnTop(true, 'screen-saver');
  win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
  win.on('blur', raise);
  const raiseTimer = setInterval(raise, 1500);
  win.on('closed', () => clearInterval(raiseTimer));

  // il menu è quello disegnato dalla pagina (tasto destro sul cane)
  Menu.setApplicationMenu(null);

  // La pagina avvisa quando il puntatore è sul cane: solo lì la finestra
  // riceve i clic, altrove è come se non ci fosse.
  ipcMain.on('rocky:interactive', (event, inside) => {
    const target = BrowserWindow.fromWebContents(event.sender);
    if (!target || target.isDestroyed()) return;
    target.setIgnoreMouseEvents(!inside, { forward: true });
  });

  win.loadFile(path.join(__dirname, '..', 'index.html'), { query: { dock: '1' } });

  return win;
}

/* Una copia sola alla volta: due finestre insieme si contendono la cache di
   Chromium e riempiono la console di errori "Unable to create cache". */
const gotLock = app.requestSingleInstanceLock();

if (!gotLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    const [win] = BrowserWindow.getAllWindows();
    if (!win) return;
    if (win.isMinimized()) win.restore();
    win.show();
    win.focus();
  });

  app.whenReady().then(createWindow);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('window-all-closed', () => {
    app.quit();
  });
}
