/* ==========================================================================
   Rocky — ponte con la finestra Electron
   Serve solo nella finestra desktop: dice al processo principale quando il
   mouse è sopra qualcosa di cliccabile, così le zone trasparenti lasciano
   passare i clic verso la barra e le altre finestre.
   ========================================================================== */

const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('rockyShell', {
  setInteractive(inside) {
    ipcRenderer.send('rocky:interactive', Boolean(inside));
  },
});
