/* ==========================================================================
   Rocky — sprite a pixel (stile 8/16 bit)
   Tre pose disegnate cella per cella su una griglia di 48×32 blocchi da 5px:
   in piedi, seduto e sdraiato (per quando dorme). Niente curve, solo pixel.
   ========================================================================== */

(function () {
  'use strict';

const COLS = 48;
const ROWS = 32;
const CELL = 5;

/* Ogni lettera è un colore del mantello, preso dalle variabili CSS. */
const COLORS = {
  k: 'var(--coat)',      // nero del manto
  K: 'var(--coat-dark)', // nero in ombra / zampe dietro
  w: 'var(--cream)',     // bianco
  t: 'var(--tan)',       // focatura
  n: 'var(--nose)',      // naso e occhi
  r: '#d8433b',          // collare
  y: '#f5c542',          // medaglietta
  p: '#ef6f8f',          // lingua
  e: '#8a839c',          // palpebra chiusa
  s: '#000000',          // ombra a terra
};

const PARTS = [
  'shadow', 'tail-a', 'tail-b', 'leg-far-hind', 'leg-far-front',
  'body', 'leg-near-hind', 'leg-near-front', 'head', 'eye', 'eye-closed', 'tongue',
];

function blankParts() {
  const parts = {};
  for (const name of PARTS) {
    parts[name] = Array.from({ length: ROWS }, () => new Array(COLS).fill(null));
  }
  return parts;
}

function put(parts, part, x, y, ch) {
  const grid = parts[part];
  if (!grid || x < 0 || y < 0 || x >= COLS || y >= ROWS) return;
  grid[y][x] = ch;
}

function box(parts, part, x, y, w, h, ch) {
  for (let j = 0; j < h; j += 1) {
    for (let i = 0; i < w; i += 1) put(parts, part, x + i, y + j, ch);
  }
}

function oval(parts, part, cx, cy, rx, ry, ch) {
  for (let y = Math.floor(cy - ry); y <= Math.ceil(cy + ry); y += 1) {
    for (let x = Math.floor(cx - rx); x <= Math.ceil(cx + rx); x += 1) {
      const dx = (x + 0.5 - cx) / rx;
      const dy = (y + 0.5 - cy) / ry;
      if (dx * dx + dy * dy <= 1) put(parts, part, x, y, ch);
    }
  }
}

/* Pennellata spessa: serve per code e zampe, che così restano attaccate. */
function stamp(parts, part, x, y, size, ch) {
  const half = Math.floor(size / 2);
  box(parts, part, Math.round(x) - half, Math.round(y) - half, size, size, ch);
}

function thickPath(parts, part, points, size, ch) {
  for (let i = 0; i < points.length - 1; i += 1) {
    const [x0, y0] = points[i];
    const [x1, y1] = points[i + 1];
    const steps = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0), 1) * 3;
    for (let s = 0; s <= steps; s += 1) {
      const t = s / steps;
      stamp(parts, part, x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, size, ch);
    }
  }
}

/* Righe di pixel uguali diventano un solo rettangolo: meno nodi nel DOM. */
function rectsFor(grid) {
  let out = '';
  for (let y = 0; y < ROWS; y += 1) {
    let x = 0;
    while (x < COLS) {
      const ch = grid[y][x];
      if (!ch) {
        x += 1;
        continue;
      }
      let run = 1;
      while (x + run < COLS && grid[y][x + run] === ch) run += 1;
      out += `<rect x="${x * CELL}" y="${y * CELL}" width="${run * CELL}" height="${CELL}" fill="${COLORS[ch]}"/>`;
      x += run;
    }
  }
  return out;
}

/* --------------------------------------------------------------------------
   Posa in piedi
   -------------------------------------------------------------------------- */

function composeStand() {
  const p = blankParts();

  oval(p, 'shadow', 22, 31.5, 14, 1, 's');

  // coda folta attaccata alla groppa, in due frame per scodinzolare
  thickPath(p, 'tail-a', [[14, 21], [12, 18], [10.5, 15], [9, 10.5]], 3, 'k');
  stamp(p, 'tail-a', 10, 14, 4, 'k');
  box(p, 'tail-a', 8, 8, 3, 2, 'w');

  thickPath(p, 'tail-b', [[14, 21], [12, 18], [11.5, 15], [10, 11]], 3, 'k');
  stamp(p, 'tail-b', 11, 14.5, 4, 'k');
  box(p, 'tail-b', 9, 9, 3, 2, 'w');

  // zampe lontane (dietro al corpo)
  box(p, 'leg-far-hind', 14, 23, 3, 7, 'K');
  box(p, 'leg-far-hind', 13, 30, 4, 1, 'K');
  box(p, 'leg-far-front', 31, 23, 3, 7, 'K');
  box(p, 'leg-far-front', 31, 30, 3, 1, 'K');

  // corpo e collo
  oval(p, 'body', 21, 19, 12, 6, 'k');
  oval(p, 'body', 30, 16, 5, 5, 'k');

  // petto bianco a scalini, collare e medaglietta
  box(p, 'body', 29, 18, 4, 1, 'w');
  box(p, 'body', 29, 19, 5, 1, 'w');
  box(p, 'body', 30, 20, 4, 1, 'w');
  box(p, 'body', 30, 21, 3, 1, 'w');
  box(p, 'body', 31, 22, 2, 1, 'w');
  box(p, 'body', 28, 17, 8, 1, 'r');
  box(p, 'body', 31, 18, 1, 1, 'y');

  // zampe vicine: focatura a metà, zampa bianca
  box(p, 'leg-near-hind', 17, 23, 3, 7, 'k');
  box(p, 'leg-near-hind', 17, 26, 3, 2, 't');
  box(p, 'leg-near-hind', 16, 30, 4, 1, 'w');

  box(p, 'leg-near-front', 27, 23, 3, 7, 'k');
  box(p, 'leg-near-front', 27, 26, 3, 2, 't');
  box(p, 'leg-near-front', 26, 30, 4, 1, 'w');

  // testa: prima l'orecchio, che così resta dietro al cranio
  oval(p, 'head', 33, 14, 2.5, 4, 'K');
  oval(p, 'head', 38, 11, 6, 5, 'k');
  box(p, 'head', 37, 13, 2, 2, 't');      // guancia focata
  box(p, 'head', 41, 8, 1, 3, 'w');       // fiamma bianca sulla fronte
  oval(p, 'head', 43, 13, 3.5, 2.8, 'w'); // muso bianco
  box(p, 'head', 45, 12, 2, 2, 'n');      // naso
  box(p, 'head', 36, 8, 2, 1, 't');       // sopracciglio focato

  box(p, 'eye', 35, 9, 2, 2, 'w');
  put(p, 'eye', 36, 10, 'n');
  box(p, 'eye-closed', 35, 10, 2, 1, 'e');
  box(p, 'tongue', 42, 15, 2, 2, 'p');

  return p;
}

/* --------------------------------------------------------------------------
   Posa seduta (quando si riposa)
   -------------------------------------------------------------------------- */

function composeSit() {
  const p = blankParts();

  oval(p, 'shadow', 22, 31.5, 13, 1, 's');

  // coda appoggiata a terra
  thickPath(p, 'tail-a', [[12, 29], [8, 28], [5, 26]], 3, 'k');
  box(p, 'tail-a', 4, 25, 2, 2, 'w');
  thickPath(p, 'tail-b', [[12, 29], [8, 28], [5, 27]], 3, 'k');
  box(p, 'tail-b', 4, 26, 2, 2, 'w');

  // groppa seduta, schiena e collo
  oval(p, 'body', 15, 24, 6, 6, 'k');
  oval(p, 'body', 26, 20, 8, 8, 'k');
  oval(p, 'body', 31, 18, 4, 5, 'k');

  // petto bianco, collare, medaglietta
  box(p, 'body', 26, 20, 4, 1, 'w');
  box(p, 'body', 26, 21, 5, 1, 'w');
  box(p, 'body', 27, 22, 4, 1, 'w');
  box(p, 'body', 27, 23, 3, 1, 'w');
  box(p, 'body', 27, 18, 7, 1, 'r');
  box(p, 'body', 30, 19, 1, 1, 'y');

  // zampe anteriori dritte
  box(p, 'body', 28, 26, 3, 5, 'k');
  box(p, 'body', 28, 28, 3, 1, 't');
  box(p, 'body', 27, 30, 4, 1, 'w');

  // testa alta
  oval(p, 'head', 30, 15, 2.5, 4, 'K');
  oval(p, 'head', 35, 12, 6, 5, 'k');
  box(p, 'head', 34, 14, 2, 2, 't');
  box(p, 'head', 38, 9, 1, 3, 'w');
  oval(p, 'head', 40, 14, 3.5, 2.8, 'w');
  box(p, 'head', 42, 13, 2, 2, 'n');
  box(p, 'head', 33, 9, 2, 1, 't');

  box(p, 'eye', 32, 10, 2, 2, 'w');
  put(p, 'eye', 33, 11, 'n');
  box(p, 'eye-closed', 32, 11, 2, 1, 'e');
  box(p, 'tongue', 39, 16, 2, 2, 'p');

  return p;
}

/* --------------------------------------------------------------------------
   Posa sdraiata (mentre dorme)
   -------------------------------------------------------------------------- */

function composeLie() {
  const p = blankParts();

  oval(p, 'shadow', 24, 31.5, 15, 1, 's');

  // coda arrotolata accanto alla groppa
  thickPath(p, 'tail-a', [[10, 28], [7, 27], [6, 23]], 3, 'k');
  box(p, 'tail-a', 5, 22, 2, 2, 'w');
  thickPath(p, 'tail-b', [[10, 28], [8, 27], [7, 24]], 3, 'k');
  box(p, 'tail-b', 6, 23, 2, 2, 'w');

  // corpo disteso, pancia a terra
  oval(p, 'body', 20, 27, 13, 4, 'k');
  oval(p, 'body', 13, 24.5, 5, 4.5, 'k'); // groppa
  oval(p, 'body', 11, 28.5, 3.5, 2, 'K'); // zampa posteriore piegata
  oval(p, 'body', 30, 25, 4, 4, 'k');     // collo

  // petto bianco, collare e medaglietta
  box(p, 'body', 28, 25, 4, 1, 'w');
  box(p, 'body', 29, 26, 3, 1, 'w');
  box(p, 'body', 29, 27, 3, 1, 'w');
  box(p, 'body', 27, 23, 5, 1, 'r');
  box(p, 'body', 29, 24, 1, 1, 'y');

  // zampa anteriore distesa in avanti
  box(p, 'body', 41, 28, 3, 2, 'k');
  box(p, 'body', 40, 30, 5, 1, 'w');

  // testa alzata, appoggiata sulle zampe
  oval(p, 'head', 32, 26, 2.5, 3.5, 'K');
  oval(p, 'head', 36, 22, 6, 5, 'k');
  box(p, 'head', 40, 19, 1, 4, 'w');    // fiamma bianca
  oval(p, 'head', 42, 25, 4, 3, 'w');   // muso
  box(p, 'head', 44, 24, 2, 2, 'n');    // naso
  box(p, 'head', 36, 25, 2, 2, 't');    // guancia focata

  box(p, 'eye', 34, 21, 2, 1, 'n');
  box(p, 'eye-closed', 34, 21, 2, 1, 'e');

  return p;
}

/* --------------------------------------------------------------------------
   Assemblaggio dell'SVG
   -------------------------------------------------------------------------- */

function poseMarkup(name, p) {
  return [
    `<g class="pose pose--${name}">`,
    `<g class="shadow">${rectsFor(p.shadow)}</g>`,
    `<g class="tail tail--a">${rectsFor(p['tail-a'])}</g>`,
    `<g class="tail tail--b">${rectsFor(p['tail-b'])}</g>`,
    `<g class="leg leg--far leg--far-hind">${rectsFor(p['leg-far-hind'])}</g>`,
    `<g class="leg leg--far leg--far-front">${rectsFor(p['leg-far-front'])}</g>`,
    `<g class="body">${rectsFor(p.body)}</g>`,
    `<g class="leg leg--near leg--near-hind">${rectsFor(p['leg-near-hind'])}</g>`,
    `<g class="leg leg--near leg--near-front">${rectsFor(p['leg-near-front'])}</g>`,
    '<g class="head">',
    rectsFor(p.head),
    `<g class="eye-open">${rectsFor(p.eye)}</g>`,
    `<g class="eye-closed">${rectsFor(p['eye-closed'])}</g>`,
    `<g class="tongue">${rectsFor(p.tongue)}</g>`,
    '</g>',
    '</g>',
  ].join('');
}

function buildDogSprite() {
  return [
    poseMarkup('stand', composeStand()),
    poseMarkup('sit', composeSit()),
    poseMarkup('lie', composeLie()),
  ].join('');
}

function mountSprite(svg) {
  if (!svg) return;
  svg.innerHTML = buildDogSprite();
}

  window.RockySprite = { buildDogSprite, mountSprite };
})();
