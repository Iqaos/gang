/* ==========================================================================
   Rocky — sprite a pixel (stile 8/16 bit)
   Griglia 40×24 blocchi da 4px (viewBox 160×96): cinque pose disegnate cella
   per cella — in piedi, due frame di camminata, seduto e sdraiato.
   Testa grossa da cucciolo, orecchio pendente, fiamma bianca che continua nel
   muso, coda con punta bianca, zampe tozze con calzino focato: deve leggersi
   subito come un bovaro del Bernese, anche a 80px dentro la barra.
   ========================================================================== */

(function () {
  'use strict';

  const COLS = 40;
  const ROWS = 24;
  const CELL = 4;
  const GROUND = 23; // riga dell'ombra: le zampe poggiano sulla 22

  /* Ogni lettera è un colore del mantello, preso dalle variabili CSS. */
  const COLORS = {
    k: 'var(--coat)',      // nero del manto
    K: 'var(--coat-dark)', // nero in ombra / zampe dietro / orecchio
    w: 'var(--cream)',     // bianco
    t: 'var(--tan)',       // focatura
    n: 'var(--nose)',      // naso, bocca e pupilla
    r: '#d8433b',          // collare
    y: '#f5c542',          // medaglietta
    p: '#ef6f8f',          // lingua
    e: '#a9a1b8',          // palpebra chiusa
    s: 'rgba(8, 6, 14, .45)', // ombra a terra
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

  /* Un blocco di pixel: [riga, prima colonna, ultima colonna, colore]. */
  function rect(p, part, y, x0, x1, ch) {
    const grid = p[part];
    if (!grid) return;
    for (let x = x0; x <= x1; x += 1) {
      if (y < 0 || y >= ROWS || x < 0 || x >= COLS) continue;
      grid[y][x] = ch;
    }
  }

  function blocks(p, part, list) {
    for (const [y, x0, x1, ch] of list) rect(p, part, y, x0, x1, ch);
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
     Testa: cranio tondo, orecchio pesante dietro la guancia, fiamma bianca dal
     cocuzzolo al muso, occhio bianco con pupilla scura, naso nero sul davanti.
     Le coordinate sono relative al centro del cranio (hx, hy).
     -------------------------------------------------------------------------- */

  const HEAD_SPANS = [
    // [dy, dx0, dx1, colore]
    [-5, -3, 2, 'k'],   // cocuzzolo
    [-4, -5, 4, 'k'],
    [-3, -7, 5, 'k'],
    [-2, -7, 5, 'k'],
    [-1, -7, 6, 'k'],
    [0, -7, 6, 'k'],
    [1, -6, 7, 'k'],    // guancia verso il muso
    [2, -5, 5, 'k'],
    [3, -4, 3, 'k'],    // sotto la gola
  ];

  function drawHead(p, hx, hy) {
    for (const [dy, dx0, dx1, ch] of HEAD_SPANS) {
      rect(p, 'head', hy + dy, hx + dx0, hx + dx1, ch);
    }

    // orecchio pesante che pende dietro la guancia
    blocks(p, 'head', [
      [hy - 3, hx - 7, hx - 5, 'K'],
      [hy - 2, hx - 7, hx - 5, 'K'],
      [hy - 1, hx - 7, hx - 5, 'K'],
      [hy, hx - 7, hx - 5, 'K'],
      [hy + 1, hx - 7, hx - 5, 'K'],
      [hy + 2, hx - 7, hx - 5, 'K'],
      [hy + 3, hx - 7, hx - 5, 'K'],
      [hy + 4, hx - 7, hx - 6, 'K'],
    ]);

    // fiamma bianca: dal cocuzzolo scende e si allarga nel muso
    blocks(p, 'head', [
      [hy - 5, hx, hx + 1, 'w'],
      [hy - 4, hx, hx + 1, 'w'],
      [hy - 3, hx, hx + 1, 'w'],
      [hy - 2, hx, hx + 1, 'w'],
      [hy - 1, hx, hx + 1, 'w'],
      [hy, hx, hx + 1, 'w'],
      [hy + 1, hx, hx + 1, 'w'],
    ]);

    // muso bianco con naso nero all'insù
    blocks(p, 'head', [
      [hy + 1, hx + 2, hx + 7, 'w'],
      [hy + 2, hx + 2, hx + 6, 'w'],
      [hy + 3, hx + 1, hx + 5, 'w'],
      [hy + 1, hx + 6, hx + 7, 'n'],
      [hy + 2, hx + 6, hx + 7, 'n'],
      [hy + 3, hx + 4, hx + 4, 'n'],
    ]);

    // focatura sopra l'occhio
    rect(p, 'head', hy - 4, hx - 1, hx - 1, 't');

    // occhio: bianco con pupilla scura, così si vede anche sul manto nero
    blocks(p, 'eye', [
      [hy - 3, hx - 3, hx - 2, 'w'],
      [hy - 2, hx - 3, hx - 2, 'w'],
      [hy - 2, hx - 2, hx - 2, 'n'],
      [hy - 1, hx - 3, hx - 2, 'w'],
    ]);

    // palpebra chiusa
    rect(p, 'eye-closed', hy - 2, hx - 3, hx - 2, 'e');

    // lingua che pende sotto il muso
    blocks(p, 'tongue', [
      [hy + 4, hx + 2, hx + 3, 'p'],
      [hy + 5, hx + 2, hx + 3, 'p'],
    ]);
  }

  /* --------------------------------------------------------------------------
     Posizioni dei pezzi comuni. Ogni posa è una lista di blocchi: prima quello
     che sta dietro (ombra, coda, zampe lontane), poi corpo, zampe vicine e testa.
     -------------------------------------------------------------------------- */

  const POSE = {
    stand: {
      head: [31, 7],
      shadow: [[GROUND, 7, 29, 's']],
      tail: {
        a: [[14, 8, 10, 'k'], [13, 7, 9, 'k'], [12, 5, 8, 'k'], [11, 4, 6, 'k'], [10, 4, 6, 'k'], [9, 4, 5, 'k'], [8, 3, 5, 'w'], [9, 3, 3, 'w']],
        b: [[14, 8, 10, 'k'], [13, 7, 9, 'k'], [12, 6, 8, 'k'], [11, 6, 8, 'k'], [10, 7, 9, 'k'], [9, 7, 8, 'k'], [8, 7, 9, 'w'], [9, 9, 9, 'w']],
      },
      far: [
        [16, 14, 15, 'K'], [17, 14, 15, 'K'], [18, 14, 15, 'K'], [19, 14, 15, 'K'], [20, 14, 15, 'K'], [21, 14, 15, 'K'], [22, 13, 15, 'K'],
        [16, 19, 20, 'K'], [17, 19, 20, 'K'], [18, 19, 20, 'K'], [19, 19, 20, 'K'], [20, 19, 20, 'K'], [21, 19, 20, 'K'], [22, 19, 21, 'K'],
      ],
      body: [
        [10, 22, 29, 'k'],
        [11, 16, 29, 'k'],
        [12, 13, 29, 'k'],
        [13, 11, 28, 'k'],
        [14, 9, 27, 'k'],
        [15, 8, 26, 'k'],
        [16, 9, 25, 'k'],
        [17, 10, 24, 'k'],
        // petto bianco
        [12, 23, 27, 'w'], [13, 23, 27, 'w'], [14, 22, 26, 'w'], [15, 22, 25, 'w'], [16, 22, 24, 'w'],
        // collare e medaglietta
        [11, 25, 28, 'r'], [12, 26, 26, 'y'],
      ],
      near: [
        [18, 11, 12, 'k'], [19, 11, 12, 'k'], [20, 11, 12, 't'], [21, 11, 12, 'k'], [22, 10, 12, 'w'],
        [18, 22, 23, 'k'], [19, 22, 23, 'k'], [20, 22, 23, 't'], [21, 22, 23, 'k'], [22, 21, 23, 'w'],
      ],
    },

    'walk-a': {
      head: [31, 7],
      shadow: [[GROUND, 7, 29, 's']],
      tail: { a: null, b: null }, // come stand
      far: [
        [16, 14, 15, 'K'], [17, 14, 15, 'K'], [18, 14, 15, 'K'], [19, 14, 15, 'K'], [20, 13, 15, 'K'],
        [16, 19, 20, 'K'], [17, 19, 20, 'K'], [18, 19, 20, 'K'], [19, 19, 20, 'K'], [20, 19, 20, 'K'], [21, 19, 20, 'K'], [22, 19, 21, 'K'],
      ],
      near: [
        [18, 11, 12, 'k'], [19, 11, 12, 'k'], [20, 11, 12, 't'], [21, 11, 12, 'k'], [22, 10, 12, 'w'],
        [17, 22, 23, 'k'], [18, 22, 23, 't'], [19, 22, 23, 'k'], [20, 21, 23, 'w'],
      ],
    },

    'walk-b': {
      head: [31, 7],
      shadow: [[GROUND, 7, 29, 's']],
      tail: { a: null, b: null },
      far: [
        [16, 14, 15, 'K'], [17, 14, 15, 'K'], [18, 14, 15, 'K'], [19, 14, 15, 'K'], [20, 14, 15, 'K'], [21, 14, 15, 'K'], [22, 13, 15, 'K'],
        [16, 19, 20, 'K'], [17, 19, 20, 'K'], [18, 19, 20, 'K'], [19, 19, 20, 'K'], [20, 19, 21, 'K'],
      ],
      near: [
        [17, 11, 12, 'k'], [18, 11, 12, 't'], [19, 11, 12, 'k'], [20, 10, 12, 'w'],
        [18, 22, 23, 'k'], [19, 22, 23, 'k'], [20, 22, 23, 't'], [21, 22, 23, 'k'], [22, 21, 23, 'w'],
      ],
    },

    sit: {
      head: [31, 8],
      shadow: [[GROUND, 5, 27, 's']],
      tail: {
        a: [[21, 6, 9, 'k'], [22, 3, 9, 'k'], [21, 3, 5, 'k'], [21, 3, 4, 'w'], [22, 3, 4, 'w']],
        b: [[22, 6, 9, 'k'], [22, 3, 9, 'k'], [21, 3, 5, 'k'], [21, 3, 4, 'w'], [22, 3, 4, 'w']],
      },
      far: [
        [17, 24, 25, 'K'], [18, 24, 25, 'K'], [19, 24, 25, 'K'], [20, 24, 25, 'K'], [21, 24, 25, 'K'], [22, 24, 26, 'K'],
      ],
      body: [
        [12, 24, 28, 'k'],
        [13, 20, 28, 'k'],
        [14, 17, 27, 'k'],
        [15, 15, 26, 'k'],
        [16, 13, 25, 'k'],
        [17, 11, 18, 'k'], [17, 21, 24, 'k'],
        [18, 10, 17, 'k'], [18, 21, 23, 'k'],
        [19, 9, 17, 'k'], [19, 21, 23, 'k'],
        [20, 9, 17, 'k'], [20, 21, 23, 'k'],
        [21, 8, 17, 'k'], [21, 21, 23, 'k'],
        // petto bianco
        [13, 24, 27, 'w'], [14, 23, 26, 'w'], [15, 23, 25, 'w'], [16, 23, 24, 'w'],
        // collare e medaglietta
        [12, 25, 28, 'r'], [13, 26, 26, 'y'],
      ],
      near: [
        [17, 21, 22, 'k'], [18, 21, 22, 'k'], [19, 21, 22, 't'], [20, 21, 22, 'k'], [21, 21, 22, 'k'], [22, 20, 22, 'w'],
        // zampa posteriore piegata sotto la groppa
        [21, 12, 16, 'k'], [22, 9, 12, 'w'],
      ],
    },

    lie: {
      head: [30, 15],
      shadow: [[GROUND, 4, 30, 's']],
      tail: {
        a: [[19, 5, 8, 'k'], [20, 4, 9, 'k'], [21, 4, 9, 'k'], [19, 4, 5, 'w'], [20, 4, 5, 'w']],
        b: [[20, 5, 8, 'k'], [21, 4, 9, 'k'], [20, 4, 9, 'k'], [20, 4, 5, 'w'], [21, 4, 5, 'w']],
      },
      far: [],
      body: [
        [16, 14, 26, 'k'],
        [17, 11, 26, 'k'],
        [18, 9, 26, 'k'],
        [19, 8, 26, 'k'],
        [20, 8, 25, 'k'],
        [21, 8, 24, 'k'],
        // petto bianco sotto la testa
        [19, 23, 26, 'w'], [20, 22, 25, 'w'],
        [17, 23, 25, 'r'],
      ],
      near: [
        // zampe anteriori distese in avanti
        [20, 27, 32, 'k'], [21, 27, 33, 'k'], [21, 33, 35, 'w'],
        [19, 11, 13, 'k'], [20, 11, 12, 't'], [21, 10, 13, 'k'], [22, 10, 12, 'w'],
      ],
    },
  };

  function composeStand(name) {
    const spec = POSE[name];
    const stand = POSE.stand;
    const p = blankParts();

    blocks(p, 'shadow', spec.shadow);
    blocks(p, 'tail-a', spec.tail.a || stand.tail.a);
    blocks(p, 'tail-b', spec.tail.b || stand.tail.b);
    blocks(p, 'leg-far-hind', spec.far.slice(0, 7));
    blocks(p, 'leg-far-front', spec.far.slice(7));
    blocks(p, 'body', spec.body || stand.body);
    blocks(p, 'leg-near-hind', spec.near.slice(0, 5));
    blocks(p, 'leg-near-front', spec.near.slice(5));
    drawHead(p, spec.head[0], spec.head[1]);
    return p;
  }

  function composeSit() {
    const spec = POSE.sit;
    const p = blankParts();

    blocks(p, 'shadow', spec.shadow);
    blocks(p, 'tail-a', spec.tail.a);
    blocks(p, 'tail-b', spec.tail.b);
    blocks(p, 'leg-far-front', spec.far);
    blocks(p, 'body', spec.body);
    blocks(p, 'leg-near-front', spec.near.slice(0, 6));
    blocks(p, 'leg-near-hind', spec.near.slice(6));
    drawHead(p, spec.head[0], spec.head[1]);
    return p;
  }

  function composeLie() {
    const spec = POSE.lie;
    const p = blankParts();

    blocks(p, 'shadow', spec.shadow);
    blocks(p, 'tail-a', spec.tail.a);
    blocks(p, 'tail-b', spec.tail.b);
    blocks(p, 'body', spec.body);
    blocks(p, 'leg-near-front', spec.near.slice(0, 3));
    blocks(p, 'leg-near-hind', spec.near.slice(3));
    drawHead(p, spec.head[0], spec.head[1]);
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
      poseMarkup('stand', composeStand('stand')),
      poseMarkup('walk-a', composeStand('walk-a')),
      poseMarkup('walk-b', composeStand('walk-b')),
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
