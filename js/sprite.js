/* ==========================================================================
   Rocky — sprite a pixel (stile 8/16 bit)
   Griglia 40×24 blocchi da 4px (viewBox 160×96): cinque pose disegnate cella
   per cella — in piedi, due frame di camminata, seduto e sdraiato.
   Testa grossa da cucciolo, orecchio pesante, muso bianco e quattro zampe
   separate: si deve capire subito che è un cane.
   ========================================================================== */

(function () {
  'use strict';

  const COLS = 40;
  const ROWS = 24;
  const CELL = 4;
  const GROUND = 23; // ultima riga: le zampe poggiano qui

  /* Ogni lettera è un colore del mantello, preso dalle variabili CSS. */
  const COLORS = {
    k: 'var(--coat)',      // nero del manto
    K: 'var(--coat-dark)', // nero in ombra / zampe dietro / orecchio
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
    'shadow', 'tail-a', 'tail-b',
    'leg-far-hind', 'leg-far-front', 'body',
    'leg-near-hind', 'leg-near-front',
    'head', 'eye', 'eye-closed', 'tongue',
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
    const cx = Math.round(x);
    const cy = Math.round(y);
    if (!grid || cx < 0 || cy < 0 || cx >= COLS || cy >= ROWS) return;
    grid[cy][cx] = ch;
  }

  function box(parts, part, x, y, w, h, ch) {
    for (let j = 0; j < h; j += 1) {
      for (let i = 0; i < w; i += 1) put(parts, part, x + i, y + j, ch);
    }
  }

  /* Tronco riga per riga: [riga, prima colonna, ultima colonna]. */
  function rowSpans(parts, part, spans, ch) {
    for (const [y, x0, x1] of spans) box(parts, part, x0, y, x1 - x0 + 1, 1, ch);
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

  /* Pennellata spessa: code e zampe restano attaccate al corpo. */
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
     Testa: cranio tondo, orecchio pendente, muso bianco, occhio a due pixel
     (hx, hy) è il centro del cranio.
     -------------------------------------------------------------------------- */

  function drawHead(p, hx, hy) {
    oval(p, 'head', hx, hy, 4.5, 4.5, 'k');          // cranio
    oval(p, 'head', hx - 4, hy + 1.5, 2, 3.8, 'K');  // orecchio pesante
    box(p, 'head', hx + 1, hy - 4, 2, 3, 'w');       // fiamma bianca
    box(p, 'head', hx - 1, hy - 3, 2, 1, 't');       // sopracciglio focato
    box(p, 'head', hx - 1, hy + 3, 1, 1, 't');       // guancia focata
    oval(p, 'head', hx + 5, hy + 2, 2.8, 2, 'w');    // muso bianco
    box(p, 'head', hx + 6, hy + 1, 2, 2, 'n');       // naso
    box(p, 'head', hx + 5, hy + 3, 1, 1, 'n');       // bocca

    box(p, 'eye', hx, hy - 1, 1, 2, 'n');            // occhio
    box(p, 'eye-closed', hx - 1, hy, 2, 1, 'e');     // palpebra chiusa
    box(p, 'tongue', hx + 4, hy + 4, 2, 2, 'p');
  }

  /* Zampa vista di fianco: due colonne, focatura sul ginocchio, zampa bianca. */
  function drawLeg(p, part, x, top, lift, dark) {
    const base = GROUND - lift;
    const head = top - lift;
    box(p, part, x, head, 2, base - head + 1, dark ? 'K' : 'k');
    if (dark) {
      box(p, part, x - 1, base, 4, 1, 'K');
    } else {
      if (lift === 0) box(p, part, x, base - 3, 2, 2, 't');
      box(p, part, x - 1, base, 4, 1, 'w');
    }
  }

  /* --------------------------------------------------------------------------
     Posa in piedi (e i due frame della camminata)
     phase 0 = fermo, 1 e 2 = zampe alternate
     -------------------------------------------------------------------------- */

  const WALK = {
    0: { farHind: 0, nearHind: 0, farFront: 0, nearFront: 0 },
    1: { farHind: 2, nearHind: 0, farFront: 0, nearFront: 2 },
    2: { farHind: 0, nearHind: 2, farFront: 2, nearFront: 0 },
  };

  const BODY_STAND = [
    [10, 14, 24],  // schiena
    [11, 12, 26],
    [12, 11, 27],
    [13, 10, 27],
    [14, 9, 27],   // groppa piena
    [15, 9, 27],
    [16, 10, 26],
    [17, 11, 14],  // pancia incavata: sotto si vede il pavimento
    [17, 21, 25],
    [18, 12, 14],
    [18, 21, 25],
  ];

  function composeStand(phase) {
    const p = blankParts();
    const step = WALK[phase] || WALK[0];

    oval(p, 'shadow', 17, GROUND + 0.5, 13, 0.9, 's');

    // coda folta in due frame, attaccata alla groppa e fuori dal corpo
    thickPath(p, 'tail-a', [[9, 14], [6, 13], [4, 9]], 3, 'k');
    stamp(p, 'tail-a', 5, 11, 4, 'k');
    box(p, 'tail-a', 3, 7, 2, 3, 'w');
    thickPath(p, 'tail-b', [[9, 14], [7, 13], [5, 9]], 3, 'k');
    stamp(p, 'tail-b', 6, 11, 4, 'k');
    box(p, 'tail-b', 4, 7, 2, 3, 'w');

    // zampe lontane, in ombra
    drawLeg(p, 'leg-far-hind', 8, 17, step.farHind, true);
    drawLeg(p, 'leg-far-front', 21, 17, step.farFront, true);

    rowSpans(p, 'body', BODY_STAND, 'k');
    box(p, 'body', 25, 8, 4, 5, 'k');   // collo che sale verso la testa

    // petto bianco, collare e medaglietta
    rowSpans(p, 'body', [
      [12, 26, 27],
      [13, 26, 27],
      [14, 25, 27],
      [15, 25, 27],
      [16, 24, 26],
      [17, 24, 25],
      [18, 22, 24],
    ], 'w');
    rowSpans(p, 'body', [[11, 25, 28]], 'r');
    put(p, 'body', 26, 12, 'y');

    // zampe vicine
    drawLeg(p, 'leg-near-hind', 11, 17, step.nearHind, false);
    drawLeg(p, 'leg-near-front', 24, 17, step.nearFront, false);

    drawHead(p, 30, 7);
    return p;
  }

  /* --------------------------------------------------------------------------
     Posa seduta: groppa a terra, schiena inclinata, zampe davanti dritte.
     Fra la groppa e le zampe anteriori resta uno spazio vuoto: è quello che
     fa leggere la posa come "seduto" invece che come un mucchio.
     -------------------------------------------------------------------------- */

  const SIT_BACK = [
    [10, 20, 24],
    [11, 18, 25],
    [12, 16, 25],
    [13, 14, 26],
    [14, 13, 26],
    [15, 12, 26],
  ];

  function composeSit() {
    const p = blankParts();

    oval(p, 'shadow', 15, GROUND + 0.5, 12, 0.9, 's');

    // coda distesa a terra
    thickPath(p, 'tail-a', [[6, 22], [3, 22], [2, 19]], 3, 'k');
    box(p, 'tail-a', 1, 18, 2, 2, 'w');
    thickPath(p, 'tail-b', [[6, 22], [3, 22], [3, 20]], 3, 'k');
    box(p, 'tail-b', 2, 19, 2, 2, 'w');

    // groppa seduta, schiena inclinata, petto e collo
    oval(p, 'body', 11, 18, 5.5, 5.5, 'k');
    rowSpans(p, 'body', SIT_BACK, 'k');
    box(p, 'body', 21, 9, 5, 11, 'k');
    box(p, 'body', 23, 7, 4, 4, 'k');

    // zampa posteriore piegata sotto la groppa
    box(p, 'leg-near-hind', 13, 21, 5, 3, 'k');
    box(p, 'leg-near-hind', 16, 22, 2, 2, 'w');

    // petto bianco, collare e medaglietta
    rowSpans(p, 'body', [
      [12, 24, 25],
      [13, 24, 25],
      [14, 23, 25],
      [15, 23, 25],
      [16, 23, 25],
      [17, 22, 24],
      [18, 22, 24],
    ], 'w');
    rowSpans(p, 'body', [[10, 24, 26]], 'r');
    put(p, 'body', 25, 11, 'y');

    // zampe anteriori dritte, staccate dalla groppa
    box(p, 'leg-far-front', 20, 15, 2, 9, 'K');
    box(p, 'leg-far-front', 19, 23, 4, 1, 'K');
    box(p, 'leg-near-front', 23, 15, 2, 9, 'k');
    box(p, 'leg-near-front', 23, 20, 2, 2, 't');
    box(p, 'leg-near-front', 22, 23, 4, 1, 'w');

    drawHead(p, 28, 6);
    return p;
  }

  /* --------------------------------------------------------------------------
     Posa sdraiata: corpo disteso, testa sulle zampe, occhi chiusi
     -------------------------------------------------------------------------- */

  const BODY_LIE = [
    [16, 13, 23],
    [17, 10, 25],
    [18, 8, 26],
    [19, 7, 26],
    [20, 7, 26],
    [21, 8, 25],
    [22, 10, 24],
  ];

  function composeLie() {
    const p = blankParts();

    oval(p, 'shadow', 16, GROUND + 0.5, 13, 0.9, 's');

    // coda arrotolata accanto alla groppa
    thickPath(p, 'tail-a', [[7, 22], [3, 21], [3, 18]], 3, 'k');
    box(p, 'tail-a', 2, 17, 2, 2, 'w');
    thickPath(p, 'tail-b', [[7, 22], [3, 22], [3, 19]], 3, 'k');
    box(p, 'tail-b', 2, 18, 2, 2, 'w');

    rowSpans(p, 'body', BODY_LIE, 'k');
    box(p, 'body', 25, 18, 2, 3, 'k');  // spalle sotto la testa
    box(p, 'body', 26, 21, 2, 1, 'w');  // petto bianco

    // zampe anteriori distese in avanti
    box(p, 'leg-far-front', 26, 22, 2, 2, 'K');
    box(p, 'leg-near-front', 28, 21, 8, 3, 'k');
    box(p, 'leg-near-front', 33, 22, 2, 2, 'w');

    drawHead(p, 28, 16);
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
      poseMarkup('stand', composeStand(0)),
      poseMarkup('walk-a', composeStand(1)),
      poseMarkup('walk-b', composeStand(2)),
      poseMarkup('sit', composeSit()),
      poseMarkup('lie', composeLie()),
    ].join('');
  }

  function mountSprite(svg) {
    if (!svg) return;
    svg.setAttribute('viewBox', `0 0 ${COLS * CELL} ${ROWS * CELL}`);
    svg.innerHTML = buildDogSprite();
  }

  window.RockySprite = {
    buildDogSprite,
    mountSprite,
    VIEW: { COLS, ROWS, CELL },
  };
})();
