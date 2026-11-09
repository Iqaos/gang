/* ==========================================================================
   Rocky — logica del cane sulla barra
   Stato, statistiche, animazioni e interazioni.
   ========================================================================== */

const STORAGE_KEY = 'rocky-pet-v1';

/* La finestra Electron carica la pagina con ?dock=1: niente barra e sfondo
   trasparente, così il cane sta direttamente sopra la barra di sistema. */
const isDocked = new URLSearchParams(window.location.search).has('dock');

/* Sulla barra il cane passeggia fra il centro e il lato destro, fermandosi
   prima della freccia "mostra desktop" in fondo alla barra. */
const ARROW_MARGIN = 160;

/* Di quanto il cane sta sollevato dal fondo della barra, in pixel: la finestra
   desktop lo calcola dall'altezza della barra di sistema (?lift=...). */
const dockLift = (() => {
  const raw = new URLSearchParams(window.location.search).get('lift');
  // attenzione: Number(null) è 0, quindi il parametro assente va gestito prima
  if (raw === null || raw.trim() === '') return 12;
  const value = Number(raw);
  if (!Number.isFinite(value)) return 12;
  return Math.min(40, Math.max(0, Math.round(value)));
})();

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const clamp = (v, min = 0, max = 100) => Math.min(max, Math.max(min, v));
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];

/* Quanto si svuotano le statistiche, in punti al secondo. */
const DECAY = {
  cibo: 100 / 900,      // ~15 minuti per svuotarsi
  felicita: 100 / 1200, // ~20 minuti
  energia: 100 / 1500,  // ~25 minuti
};
const OFFLINE_CAP = 900; // secondi di assenza considerati al massimo
const ENERGY_REGEN = 7;  // punti di energia al secondo mentre dorme

const LINES = {
  coccole: [
    'Aaah, che bello 🥰',
    'Ancora coccole, dai!',
    'Ti voglio bene ❤️',
    'Sono il cane più felice del mondo',
    'Grattami dietro l’orecchio 🐾',
  ],
  cibo: ['Gnam gnam! 🍖', 'Che buono!', 'Ne avevo proprio voglia', 'Grazie! 🐾'],
  pieno: ['No grazie, sono pieno 😅', 'Non ce la faccio più 🫄', 'Lo tengo per dopo'],
  gioca: ['Palla! 🎾', 'Prendila, prendila!', 'Che divertimento!', 'Ancora! Ancora!'],
  stanco: ['Non ho più energie… 😴', 'Fammi riposare un attimo', 'Sono a terra, ho bisogno di dormire'],
  nanna: ['Zzz… 💤', 'Buonanotte 🌙', 'Sogni d’oro'],
  sveglia: ['Yawn… che sonno 😴', 'Sono carico! ⚡', 'Buongiorno! 🐶'],
  seduto: ['Mi riposo un po’…', 'Che caldo oggi', 'Ti aspetto qui', 'Un attimo di pausa'],
  fame: ['Ho fame… 🍖', 'La ciotola è vuota!', 'Un bocconcino? 🥺'],
  triste: ['Mi annoio… giochiamo?', 'Mi coccoli un po’?', 'Nessuno gioca con me 🥺'],
  idle: ['Bau! 🐾', '…', 'Guardo fuori dalla finestra', 'Ti tengo compagnia', 'Mi prudono le orecchie'],
};

/* --------------------------------------------------------------------------
   Stato
   -------------------------------------------------------------------------- */

function defaultState() {
  return {
    name: 'Rocky',
    coat: 'bernese',
    stats: { cibo: 78, felicita: 82, energia: 90 },
    asleep: false,
    x: null,
    lastSeen: Date.now(),
  };
}

function loadState() {
  const base = defaultState();
  let saved = null;

  try {
    saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
  } catch {
    saved = null;
  }

  if (!saved || typeof saved !== 'object') return base;

  const merged = {
    ...base,
    ...saved,
    stats: { ...base.stats, ...(saved.stats || {}) },
  };

  const elapsed = clamp(
    (Date.now() - (saved.lastSeen || Date.now())) / 1000,
    0,
    OFFLINE_CAP,
  );

  for (const key of Object.keys(DECAY)) {
    merged.stats[key] = clamp(merged.stats[key] - DECAY[key] * elapsed);
  }

  merged.asleep = Boolean(saved.asleep);
  merged.x = Number.isFinite(saved.x) ? saved.x : null;
  return merged;
}

let state = loadState();

const el = {
  scene: $('#scene'),
  pet: $('#pet'),
  bubble: $('#bubble'),
  bubbleText: $('#bubbleText'),
  hit: $('#petHit'),
  fx: $('#fx'),
  props: $('#props'),
  stats: $$('.stat'),
  actions: $$('.act[data-action]'),
  name: $('#dogName'),
  hint: $('#hint'),
  sheet: $('#sheet'),
  nameInput: $('#nameInput'),
  btnSettings: $('#btnSettings'),
  btnClose: $('#btnClose'),
  btnSave: $('#btnSave'),
  coatInputs: $$('input[name="coat"]'),
  petSvg: $('#petSvg'),
  menu: $('#contextMenu'),
  menuItems: $$('.menu__item'),
  menuSleepLabel: $('[data-menu-sleep]'),
};

let busy = null;
let busyTimer = null;
let poseTimer = null;
let walkTimer = null;
let wanderTimer = null;
let zzzTimer = null;
let lastNag = 0;
let posX = 32;
let sitting = false;
let lastAction = Date.now();

/* --------------------------------------------------------------------------
   Persistenza
   -------------------------------------------------------------------------- */

function save() {
  state.lastSeen = Date.now();
  state.x = Math.round(posX);
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* spazio pieno o modalità privata: il cane vive lo stesso */
  }
}

/* --------------------------------------------------------------------------
   Barra e statistiche
   -------------------------------------------------------------------------- */

function renderStats() {
  for (const node of el.stats) {
    const key = node.dataset.stat;
    const value = Math.round(state.stats[key]);
    $('[data-fill]', node).style.width = `${value}%`;
    $('[data-value]', node).textContent = String(value);
    node.classList.toggle('is-low', value < 25);
  }
}

function renderIdentity() {
  el.name.textContent = state.name;
  document.body.className = `coat-${state.coat}${isDocked ? ' is-docked' : ''}`;
  el.hit.setAttribute('aria-label', `Coccola ${state.name}`);
  document.title = `${state.name} — il cane sulla barra`;
}

function syncButtons() {
  for (const btn of el.actions) {
    const sleeping = state.asleep && btn.dataset.action !== 'nanna';
    btn.disabled = sleeping || Boolean(busy);
  }
  syncMenu();
}

/* --------------------------------------------------------------------------
   Fumetto
   -------------------------------------------------------------------------- */

let bubbleTimer = null;

function say(text, ms = 3200) {
  el.bubbleText.textContent = text;
  el.bubble.classList.add('is-visible');
  clearTimeout(bubbleTimer);
  bubbleTimer = setTimeout(() => el.bubble.classList.remove('is-visible'), ms);
}

/* --------------------------------------------------------------------------
   Pose
   -------------------------------------------------------------------------- */

function restPose() {
  if (state.asleep) return 'sleep';
  if (walking) return 'walk';
  return sitting ? 'sit' : 'idle';
}

/* Si siede quando nessuno lo sta considerando da un po'. */
function sitDown() {
  if (state.asleep || busy || walking) return;
  sitting = true;
  setPose('sit');
  if (Math.random() < 0.5) say(pick(LINES.seduto), 2600);
}

function setPose(name) {
  clearTimeout(poseTimer);
  el.pet.dataset.state = name;
}

function temporaryPose(name, ms) {
  clearTimeout(poseTimer);
  el.pet.dataset.state = name;
  poseTimer = setTimeout(() => setPose(restPose()), ms);
}

function setBusy(kind, ms) {
  busy = kind;
  clearTimeout(busyTimer);
  busyTimer = setTimeout(() => {
    busy = null;
    syncButtons();
    if (!walking) setPose(restPose());
  }, ms);
  syncButtons();
}

/* --------------------------------------------------------------------------
   Particelle e oggetti
   -------------------------------------------------------------------------- */

function dogBox() {
  const pet = el.pet.getBoundingClientRect();
  const scene = el.scene.getBoundingClientRect();
  return {
    x: pet.left - scene.left,
    y: pet.top - scene.top,
    w: pet.width,
    h: pet.height,
  };
}

function spawnFx(fx, x, y, extraClass = '', drift = 0) {
  const node = document.createElement('span');
  node.className = `fx__item ${extraClass}`.trim();
  node.textContent = fx;
  node.style.left = `${x}px`;
  node.style.top = `${y}px`;
  node.style.setProperty('--drift', `${drift}px`);
  el.fx.appendChild(node);
  node.addEventListener('animationend', () => node.remove(), { once: true });
  setTimeout(() => node.remove(), 2400);
  return node;
}

function hearts(count = 5) {
  const box = dogBox();
  for (let i = 0; i < count; i += 1) {
    setTimeout(() => {
      spawnFx(
        pick(['♥', '♥', '♡']),
        box.x + box.w * (0.35 + Math.random() * 0.35),
        box.y + box.h * (0.15 + Math.random() * 0.2),
        'fx__item--heart',
        (Math.random() - 0.5) * 46,
      );
    }, i * 120);
  }
}

function crumbs() {
  const box = dogBox();
  for (let i = 0; i < 3; i += 1) {
    spawnFx(
      '',
      box.x + box.w * 0.78 + (Math.random() - 0.5) * 14,
      box.y + box.h * 0.78,
      'fx__item--crumb',
      (Math.random() - 0.5) * 40,
    ).style.setProperty('--fall', `${12 + Math.random() * 14}px`);
  }
}

function zzz() {
  const box = dogBox();
  spawnFx('z', box.x + box.w * 0.72, box.y + box.h * 0.06, 'fx__item--zzz', 18);
}

function showBowl() {
  const box = dogBox();
  const bowl = document.createElement('div');
  bowl.className = 'prop prop--bowl';
  bowl.style.left = `${box.x + box.w * 0.66}px`;
  el.props.appendChild(bowl);
  setTimeout(() => bowl.remove(), 2800);
}

function throwBall() {
  const box = dogBox();
  const ball = document.createElement('div');
  ball.className = 'prop prop--ball';
  ball.style.left = `${box.x + box.w * 0.7}px`;
  ball.style.bottom = '6px';
  el.props.appendChild(ball);
  ball.addEventListener('animationend', () => ball.remove(), { once: true });
  setTimeout(() => ball.remove(), 3000);
}

/* --------------------------------------------------------------------------
   Movimento
   -------------------------------------------------------------------------- */

let walking = false;
let margin = 24;

function updateMargin() {
  margin = Math.min(110, Math.max(20, el.scene.clientWidth * 0.12));
}

/* Zona di passeggio sulla barra: dal centro fin quasi alla freccia. */
function dockRange() {
  const width = el.scene.clientWidth;
  const petWidth = el.pet.offsetWidth || 80;
  const center = Math.round((width - petWidth) / 2);
  const min = Math.max(0, Math.round(center - width * 0.12));
  const max = Math.max(min, Math.round(width - petWidth - ARROW_MARGIN));
  return { min, max, center };
}

function clampX(x) {
  if (isDocked) {
    const { min, max } = dockRange();
    return Math.min(max, Math.max(min, x));
  }
  const max = Math.max(margin, el.scene.clientWidth - el.pet.offsetWidth - margin);
  return Math.min(max, Math.max(margin, x));
}

function placeX(x, animate = false) {
  posX = clampX(x);
  if (!animate) el.pet.style.setProperty('--walk-dur', '0ms');
  el.pet.style.setProperty('--x', `${posX}px`);
}

function walkTo(target, onArrive) {
  const next = clampX(target);
  const distance = Math.abs(next - posX);

  if (distance < 10) {
    if (onArrive) onArrive();
    return;
  }

  const duration = clamp(distance / 0.085, 650, 4200);
  sitting = false;

  el.pet.style.setProperty('--walk-dur', `${duration}ms`);
  el.pet.dataset.facing = next > posX ? 'right' : 'left';

  walking = true;
  setPose('walk');

  // forza il ricalcolo prima di spostare, così la transizione parte davvero
  void el.pet.offsetWidth;
  placeX(next, true);

  clearTimeout(walkTimer);
  walkTimer = setTimeout(() => {
    walking = false;
    if (!busy) setPose(restPose());
    if (onArrive) onArrive();
  }, duration + 40);
}

function wander() {
  if (busy || state.asleep || walking) return;
  updateMargin();
  const max = Math.max(margin, el.scene.clientWidth - el.pet.offsetWidth - margin);
  walkTo(margin + Math.random() * (max - margin));
}

function scheduleWander() {
  clearTimeout(wanderTimer);
  wanderTimer = setTimeout(() => {
    if (!state.asleep && !busy && el.sheet.hidden) {
      const idleFor = Date.now() - lastAction;

      if (sitting) {
        if (Math.random() < 0.25) wander();
      } else if (idleFor > 18000 && Math.random() < 0.55) {
        sitDown();
      } else {
        wander();
      }
    }
    scheduleWander();
  }, 6000 + Math.random() * 7000);
}

/* --------------------------------------------------------------------------
   Azioni
   -------------------------------------------------------------------------- */

function feed() {
  if (state.asleep) {
    wake('Mi sono svegliato per la pappa! 🍖');
    return;
  }

  if (state.stats.cibo > 95) {
    say(pick(LINES.pieno), 2400);
    temporaryPose('idle', 1200);
    return;
  }

  setBusy('eat', 2700);
  temporaryPose('eat', 2700);
  showBowl();

  for (let i = 0; i < 7; i += 1) setTimeout(crumbs, 220 + i * 260);

  state.stats.cibo = clamp(state.stats.cibo + 32);
  state.stats.felicita = clamp(state.stats.felicita + 4);
  say(pick(LINES.cibo), 2600);
  renderStats();
  save();
}

function cuddle() {
  if (state.asleep) {
    wake('Mmmh… ancora cinque minuti 😴');
    return;
  }

  setBusy('pet', 1700);
  temporaryPose('pet', 1700);
  hearts(5);

  state.stats.felicita = clamp(state.stats.felicita + 7);
  renderStats();
  save();

  if (Math.random() < 0.55) say(pick(LINES.coccole), 2200);
  hideHint();
}

function play() {
  if (state.asleep) {
    wake('Adesso giochiamo! 🎾');
    return;
  }

  if (state.stats.energia < 15) {
    say(pick(LINES.stanco), 2600);
    return;
  }

  setBusy('play', 3400);
  temporaryPose('play', 3400);
  throwBall();

  state.stats.felicita = clamp(state.stats.felicita + 20);
  state.stats.energia = clamp(state.stats.energia - 12);
  state.stats.cibo = clamp(state.stats.cibo - 4);
  say(pick(LINES.gioca), 2800);
  renderStats();
  save();
  hideHint();
}

function sleep() {
  state.asleep = true;
  sitting = false;
  setPose('sleep');
  say(pick(LINES.nanna), 2600);
  syncButtons();

  clearInterval(zzzTimer);
  zzzTimer = setInterval(zzz, 1500);
  setTimeout(zzz, 400);
  save();
}

function wake(message) {
  if (!state.asleep) return;
  state.asleep = false;
  sitting = false;
  clearInterval(zzzTimer);
  setPose(restPose());
  say(message || pick(LINES.sveglia), 2400);
  syncButtons();
  save();
}

function toggleSleep() {
  if (state.asleep) wake();
  else sleep();
}

function hideHint() {
  el.hint.classList.add('is-hidden');
}

/* --------------------------------------------------------------------------
   Ciclo di gioco
   -------------------------------------------------------------------------- */

function nag() {
  const now = Date.now();
  if (now - lastNag < 45000 || busy) return;

  const { cibo, felicita, energia } = state.stats;

  if (energia < 18) {
    lastNag = now;
    say(pick(LINES.stanco), 3000);
  } else if (cibo < 20) {
    lastNag = now;
    say(pick(LINES.fame), 3000);
  } else if (felicita < 25) {
    lastNag = now;
    say(pick(LINES.triste), 3000);
  } else if (Math.random() < 0.12) {
    lastNag = now;
    say(pick(LINES.idle), 2600);
  }
}

function tick() {
  const s = state.stats;

  if (state.asleep) {
    s.energia = clamp(s.energia + ENERGY_REGEN);
    s.cibo = clamp(s.cibo - DECAY.cibo * 0.25);
    s.felicita = clamp(s.felicita - DECAY.felicita * 0.25);

    if (s.energia >= 100) {
      wake('Sono carico di energie! ⚡');
    }
  } else {
    s.cibo = clamp(s.cibo - DECAY.cibo);
    s.felicita = clamp(s.felicita - DECAY.felicita);
    s.energia = clamp(s.energia - DECAY.energia);
    nag();
  }

  renderStats();
}

/* --------------------------------------------------------------------------
   Impostazioni
   -------------------------------------------------------------------------- */

function openSheet() {
  closeMenu();
  el.nameInput.value = state.name;
  for (const input of el.coatInputs) input.checked = input.value === state.coat;
  el.sheet.hidden = false;
  el.nameInput.focus();
  el.nameInput.select();
}

function closeSheet() {
  el.sheet.hidden = true;
  el.btnSettings.focus();
}

function saveSettings() {
  const name = el.nameInput.value.trim().slice(0, 14);
  const coat = el.coatInputs.find((input) => input.checked)?.value ?? state.coat;

  state.name = name || 'Rocky';
  state.coat = coat;

  renderIdentity();
  save();
  closeSheet();
  say(`Ciao, sono ${state.name}! 🐾`, 2600);
}

/* --------------------------------------------------------------------------
   Menu contestuale (tasto destro)
   -------------------------------------------------------------------------- */

let menuOpen = false;
let menuTimer = 0;

/* Il menu non resta appeso: si chiude da solo se non lo usi. */
const MENU_AUTOCLOSE = 6000;

function bumpMenuTimer() {
  clearTimeout(menuTimer);
  if (!menuOpen) return;
  menuTimer = setTimeout(closeMenu, MENU_AUTOCLOSE);
}

function syncMenu() {
  for (const item of el.menuItems) {
    const action = item.dataset.action;
    if (!action) continue;
    const blocked = state.asleep && action !== 'nanna';
    item.disabled = blocked || Boolean(busy);
  }
  if (el.menuSleepLabel) {
    el.menuSleepLabel.textContent = state.asleep ? 'Sveglia' : 'Nanna';
  }
}

function openMenu(x, y) {
  el.menu.hidden = false;
  menuOpen = true;
  syncMenu();

  const { width, height } = el.menu.getBoundingClientRect();
  let left = x;
  let top = y;

  // Sulla barra il menu è una riga sola e si apre sopra il cane: la
  // finestra è alta appena 176px e un menu verticale non ci starebbe.
  if (isDocked) {
    const box = dogBox();
    left = box.x + box.w / 2 - width / 2;
    top = box.y - height - 4;
  }

  left = Math.max(4, Math.min(left, window.innerWidth - width - 4));
  top = Math.max(4, Math.min(top, window.innerHeight - height - 4));

  el.menu.style.left = `${left}px`;
  el.menu.style.top = `${top}px`;
  el.menu.focus();
  bumpMenuTimer();
}

function closeMenu() {
  clearTimeout(menuTimer);
  if (!menuOpen) return;
  menuOpen = false;
  el.menu.hidden = true;
}

/* --------------------------------------------------------------------------
   Eventi
   -------------------------------------------------------------------------- */

function runAction(action) {
  lastAction = Date.now();

  switch (action) {
    case 'cibo': feed(); break;
    case 'coccole': cuddle(); break;
    case 'gioca': play(); break;
    case 'nanna': toggleSleep(); break;
    default: break;
  }
}

for (const btn of el.actions) {
  btn.addEventListener('click', () => runAction(btn.dataset.action));
}

/* Un clic sul cane apre il menu delle azioni; un altro clic (o la chiusura
   automatica dopo qualche secondo) lo richiude. Doppio clic: coccole. */
el.hit.addEventListener('click', () => {
  lastAction = Date.now();

  if (menuOpen) {
    closeMenu();
    return;
  }

  const rect = el.hit.getBoundingClientRect();
  openMenu(rect.left + rect.width / 2, rect.top + rect.height * 0.6);
});

el.hit.addEventListener('dblclick', () => {
  lastAction = Date.now();
  closeMenu();
  cuddle();
});

el.pet.addEventListener('contextmenu', (event) => {
  event.preventDefault();
  openMenu(event.clientX, event.clientY);
});

el.hit.addEventListener('keydown', (event) => {
  if (event.key === 'ContextMenu' || (event.key === 'F10' && event.shiftKey)) {
    event.preventDefault();
    const rect = el.hit.getBoundingClientRect();
    openMenu(rect.left + rect.width / 2, rect.top + rect.height * 0.6);
  }
});

el.menu.addEventListener('pointermove', bumpMenuTimer, { passive: true });
el.menu.addEventListener('focusin', bumpMenuTimer);

el.menu.addEventListener('click', (event) => {
  const item = event.target.closest('.menu__item');
  if (!item || item.disabled) return;

  const command = item.dataset.command;
  closeMenu();

  if (command === 'settings') openSheet();
  else runAction(item.dataset.action);
});

el.menu.addEventListener('keydown', (event) => {
  const items = el.menuItems.filter((item) => !item.disabled);
  if (!items.length) return;
  const index = items.indexOf(document.activeElement);

  if (event.key === 'ArrowDown') {
    event.preventDefault();
    items[(index + 1) % items.length].focus();
  } else if (event.key === 'ArrowUp') {
    event.preventDefault();
    items[(index - 1 + items.length) % items.length].focus();
  }
});

document.addEventListener('pointerdown', (event) => {
  if (!menuOpen) return;
  if (el.menu.contains(event.target) || el.pet.contains(event.target)) return;
  closeMenu();
});
el.btnSettings.addEventListener('click', openSheet);
el.btnClose.addEventListener('click', closeSheet);
el.btnSave.addEventListener('click', saveSettings);
el.sheet.addEventListener('click', (event) => {
  if (event.target === el.sheet) closeSheet();
});

document.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') return;

  if (menuOpen) {
    closeMenu();
    el.hit.focus();
    return;
  }

  if (!el.sheet.hidden) closeSheet();
});

el.nameInput.addEventListener('keydown', (event) => {
  if (event.key === 'Enter') saveSettings();
});

window.addEventListener('resize', () => {
  closeMenu();
  updateMargin();
  placeX(posX);
});

document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    save();
  } else {
    // tempo passato in background: applica un decadimento ragionevole
    const elapsed = clamp((Date.now() - state.lastSeen) / 1000, 0, OFFLINE_CAP);
    if (!state.asleep) {
      state.stats.cibo = clamp(state.stats.cibo - DECAY.cibo * elapsed);
      state.stats.felicita = clamp(state.stats.felicita - DECAY.felicita * elapsed);
      state.stats.energia = clamp(state.stats.energia - DECAY.energia * elapsed);
    }
    state.lastSeen = Date.now();
    renderStats();
  }
});

/* --------------------------------------------------------------------------
   Finestra desktop: solo cane, menu e impostazioni catturano il mouse
   -------------------------------------------------------------------------- */

const shell = window.rockyShell;

if (shell) {
  let interactive = true;

  const updatePointer = (event) => {
    const target = event.target instanceof Element ? event.target : null;
    const over = Boolean(target && target.closest('.pet, .menu, .sheet'));
    if (over === interactive) return;
    interactive = over;
    shell.setInteractive(over);
  };

  document.addEventListener('pointermove', updatePointer, { passive: true });
  document.addEventListener('pointerdown', updatePointer, { passive: true });
  document.addEventListener('pointerleave', () => {
    if (!interactive) return;
    interactive = false;
    shell.setInteractive(false);
  });
}

window.addEventListener('pagehide', save);

/* --------------------------------------------------------------------------
   Avvio
   -------------------------------------------------------------------------- */

function boot() {
  window.RockySprite.mountSprite(el.petSvg);
  if (isDocked) document.body.style.setProperty('--dock-lift', `${dockLift}px`);
  renderIdentity();
  renderStats();
  updateMargin();
  placeX(state.x ?? (isDocked ? dockRange().center : margin), false);
  setPose(state.asleep ? 'sleep' : 'idle');
  syncButtons();

  if (state.asleep) {
    clearInterval(zzzTimer);
    zzzTimer = setInterval(zzz, 1500);
  }

  const hello = isDocked
    ? 'Tasto destro per le azioni 🐾'
    : `Ciao, sono ${state.name}! 🐾`;
  setTimeout(() => say(hello, 3400), 700);
  setTimeout(hideHint, 9000);

  setInterval(tick, 1000);
  setInterval(save, 8000);
  scheduleWander();
}

boot();
