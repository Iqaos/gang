# Rocky 🐶 — il bovaro del Bernese a pixel che vive sulla barra

Rocky è un cane da compagnia a pochi pixel, in stile 8/16 bit: nero focato con petto,
muso e zampe bianchi, orecchie pendenti e coda folta. Vive appoggiato sulla barra e si
comanda **con il tasto destro**: cibo, coccole, gioco, nanna e impostazioni.

Non servono dipendenze né build per la versione web: è HTML, CSS e JavaScript puri.

![Rocky a pochi pixel sulla barra](docs/preview.png)

## Due modi per usarlo

### 1. Sulla barra delle applicazioni (finestra desktop)

È il modo per averlo davvero appoggiato sulla barra del sistema: una finestra
trasparente, senza bordi, sempre in primo piano, posizionata subito sopra la barra.

**Windows, il modo più semplice:** scarica lo ZIP (**Code → Download ZIP**), **estrailo**
e fai doppio clic su `avvia-rocky.bat`: la prima volta installa le dipendenze da solo,
poi avvia Rocky.

Da terminale (nella cartella del progetto):

```powershell
npm.cmd install
npm.cmd start
```

Se PowerShell rifiuta `npm` con l'errore su `npm.ps1` e l'esecuzione di script
disabilitata, usa `npm.cmd` come sopra (o il Prompt dei comandi): funziona senza
cambiare le impostazioni di sicurezza. Su macOS e Linux vanno bene
`npm install && npm start`.

Se compare `Electron failed to install correctly`, npm 11 o successivo ha bloccato lo
script di postinstallazione di Electron e il binario non è stato scaricato. Rimedio,
nella cartella del progetto:

```powershell
node node_modules\electron\install.js
npm.cmd start
```

In alternativa approva lo script e reinstalla: `npm.cmd install-scripts approve electron`
seguito da `npm.cmd install`.

Serve [Node.js](https://nodejs.org) installato. La finestra si apre in basso al centro
(380×240 px) e resta sopra le altre applicazioni; per chiuderla basta `Ctrl+C` nel
terminale o chiudere la finestra. Dimensioni e posizione si cambiano con `WIDTH`,
`HEIGHT` e il calcolo di `x`/`y` in `desktop/main.js`.

### 2. Nel browser

```bash
python3 -m http.server 3000
```

Poi apri <http://localhost:3000>. Qui vedi anche la barra delle statistiche completa;
aprendo `index.html?dock=1` ottieni la stessa vista trasparente della finestra desktop.

## Comandi (tasto destro sul cane)

| Voce | Effetto |
| --- | --- |
| **Cibo** | +32 sazietà, ciotola e briciole (rifiuta se è pieno) |
| **Coccole** | +7 felicità, cuoricini e coda che scodinzola |
| **Gioca** | +20 felicità, −12 energia, −4 sazietà (serve almeno 15 di energia) |
| **Nanna** | rigenera energia mentre dorme; la voce diventa **Sveglia** |
| **Impostazioni** | cambia nome e mantello (Bernese, cioccolato, grigio focato) |

Un clic sinistro sul cane fa una coccola. Il menu si apre anche da tastiera: `Tab` fino
al cane, poi `Shift+F10` (o il tasto menu); `Esc` chiude.

Le statistiche calano col tempo (cibo in ~15 minuti, felicità ~20, energia ~25), anche a
finestra chiusa, e il cane se lo ricorda: tutto è salvato in `localStorage` sotto la
chiave `rocky-pet-v1`. Se lo trascuri troppo, te lo dice con il fumetto.

## Sotto il cofano

```
index.html        struttura della pagina e barra delle statistiche
css/styles.css    interfaccia retro (bordi spessi, monospace) e animazioni a scatti
js/sprite.js      il cane: sprite generato da una griglia di pixel
js/app.js         stato, decadimento statistiche, salvataggio, menu, interazioni
desktop/main.js   finestra Electron trasparente sulla barra di sistema
```

### Lo sprite

Rocky è disegnato su una griglia di **48×32 celle da 5 px** (viewBox 240×160). In
`js/sprite.js` il disegno è composto con tre primitive — `box`, `oval` e `thickPath` —
e ogni cella viene poi convertita in un `<rect>` (le righe di pixel uguali diventano un
solo rettangolo, così i nodi sono ~130 invece di migliaia). Niente curve: solo blocchi,
con `shape-rendering: crispEdges` per tenerli netti.

Le parti sono gruppi separati (`.tail`, `.leg--near-hind`, `.head`, `.eye-open`,
`.tongue`…) e si animano per scatti, come nei giochi anni '80: la coda ha due frame
alternati, le zampe si spostano di una cella, il cane salta a scatti.

Ci sono **tre pose disegnate**: in piedi (`.pose--stand`), seduta (`.pose--sit`) e
sdraiata (`.pose--lie`). Rocky si siede da solo se lo lasci tranquillo per un po' e,
quando va a dormire, si stende con la testa sulle zampe. Gli stati sono in `data-state`
su `.pet`: `idle`, `walk`, `sit`, `pet`, `eat`, `play`, `sleep`.

I colori del mantello sono variabili CSS — `--coat` (nero), `--coat-dark` (ombra),
`--cream` (bianco) e `--tan` (focatura) — cambiate dalle classi `body.coat-*`.

Lo stato salvato:

```js
{
  name: 'Rocky',
  coat: 'bernese',                         // bernese | cioccolato | grigiofocato
  stats: { cibo: 78, felicita: 82, energia: 90 },
  asleep: false,
  x: 216,                                  // posizione sulla barra
  lastSeen: 1762700000000
}
```

Altri punti da toccare: `DECAY` (velocità del decadimento) e `LINES` (battute del cane)
in `js/app.js`.

## Note

- Il progetto rispetta `prefers-reduced-motion`: con le animazioni ridotte il cane resta
  fermo ma tutte le funzioni rimangono.
- La finestra Electron è trasparente e `alwaysOnTop`: su Windows può comparire sopra
  schermate intere se il sistema lo consente; su macOS richiede il permesso di
  accessibilità solo se in futuro si vorrà il click-through delle aree vuote.
