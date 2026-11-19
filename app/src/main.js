// Neon Palms Cover Studio — the editor.
// Wires the page to the cover renderer: photo tray, layout and grade
// pickers, caption fields, effect sliders, per-panel drag / zoom, an
// undo / redo history, the one-click auto-compose, and PNG export in the
// four post sizes. Everything runs locally in the page.

import { EXPORT_SIZES, GRADES, LAYOUTS, exportCoverPNG, layoutPanels, renderCover } from './cover.js';
import { PhotoStore } from './photos.js';
import { applyShotToState, parseShotQuery } from './shots.js';

const CURATED_DEAL = ['boulevard', 'neon-street', 'pier', 'rooftop', 'neon-street', 'boulevard', 'rooftop', 'pier', 'boulevard'];

const store = new PhotoStore();
const canvas = document.getElementById('preview');
const ctx = canvas.getContext('2d');

const state = {
  layout: 'nine-grid',
  grade: 'vice-sunset',
  title: 'Neon Palms',
  subtitle: 'palm coast stories',
  kicker: 'Palm Coast · Neon Nights · Bad Roads',
  heat: 4,
  ink: 5,
  grain: 0.55,
  vignette: 0.5,
  strength: 0.85,
  size: 'square',
  panels: [],
};

let selectedPanel = 0;
const undoStack = [];
const redoStack = [];

function panelCount(layoutId) {
  return layoutPanels(layoutId, 100, 100).panels.length;
}

function freshPanel(i) {
  return { photo: CURATED_DEAL[i % CURATED_DEAL.length], x: 0, y: 0, zoom: 1 };
}

function ensurePanels() {
  const n = panelCount(state.layout);
  while (state.panels.length < n) state.panels.push(freshPanel(state.panels.length));
  state.panels.length = n;
  if (selectedPanel >= n) selectedPanel = 0;
}

function snapshot() {
  return JSON.stringify(state);
}

function beginChange() {
  undoStack.push(snapshot());
  if (undoStack.length > 60) undoStack.shift();
  redoStack.length = 0;
  syncHistoryButtons();
}

function restore(json) {
  const next = JSON.parse(json);
  for (const key of Object.keys(state)) delete state[key];
  Object.assign(state, next);
  ensurePanels();
  syncUIFromState();
  render();
}

function undo() {
  if (!undoStack.length) return;
  redoStack.push(snapshot());
  restore(undoStack.pop());
  syncHistoryButtons();
}

function redo() {
  if (!redoStack.length) return;
  undoStack.push(snapshot());
  restore(redoStack.pop());
  syncHistoryButtons();
}

function syncHistoryButtons() {
  document.getElementById('undoBtn').disabled = undoStack.length === 0;
  document.getElementById('redoBtn').disabled = redoStack.length === 0;
}

function sizeById(id) {
  return EXPORT_SIZES.find((s) => s.id === id) || EXPORT_SIZES[0];
}

function render() {
  const size = sizeById(state.size);
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  renderCover(ctx, canvas.width, canvas.height, state, store);
  drawSelection();
}

function drawSelection() {
  if (document.body.classList.contains('shot-cover')) return;
  const { panels } = layoutPanels(state.layout, canvas.width, canvas.height);
  const p = panels[selectedPanel];
  if (!p) return;
  ctx.save();
  ctx.strokeStyle = '#ffd76a';
  ctx.lineWidth = Math.max(2, canvas.width * 0.0035);
  ctx.setLineDash([canvas.width * 0.012, canvas.width * 0.008]);
  if (p.rot) {
    ctx.translate(p.x + p.w / 2, p.y + p.h / 2);
    ctx.rotate(p.rot);
    ctx.strokeRect(-p.w / 2, -p.h / 2, p.w, p.h);
  } else {
    ctx.strokeRect(p.x, p.y, p.w, p.h);
  }
  ctx.restore();
  const info = document.getElementById('panelInfo');
  const pick = state.panels[selectedPanel];
  const photo = pick && pick.photo ? store.get(pick.photo) : null;
  info.textContent = `Panel ${selectedPanel + 1} of ${panels.length}${photo ? ` · ${photo.name}` : ' · empty'} — drag to move the photo, scroll to zoom.`;
}

// ---------- controls ----------

function buildPickers() {
  const layoutList = document.getElementById('layoutList');
  for (const layout of LAYOUTS) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick';
    b.dataset.layout = layout.id;
    b.textContent = layout.name;
    b.addEventListener('click', () => {
      if (state.layout === layout.id) return;
      beginChange();
      state.layout = layout.id;
      ensurePanels();
      syncUIFromState();
      render();
    });
    layoutList.appendChild(b);
  }
  const gradeList = document.getElementById('gradeList');
  for (const grade of GRADES) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'pick grade';
    b.dataset.grade = grade.id;
    b.textContent = grade.name;
    b.addEventListener('click', () => {
      if (state.grade === grade.id) return;
      beginChange();
      state.grade = grade.id;
      syncUIFromState();
      render();
    });
    gradeList.appendChild(b);
  }
  const sizeSelect = document.getElementById('sizeSelect');
  for (const size of EXPORT_SIZES) {
    const o = document.createElement('option');
    o.value = size.id;
    o.textContent = size.label;
    sizeSelect.appendChild(o);
  }
  sizeSelect.addEventListener('change', () => {
    beginChange();
    state.size = sizeSelect.value;
    render();
  });
}

function buildTray() {
  const tray = document.getElementById('photoTray');
  tray.innerHTML = '';
  for (const photo of store.photos) {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'thumb';
    b.title = `${photo.name} — click to put it in the selected panel`;
    const img = document.createElement('img');
    img.src = photo.thumb;
    img.alt = photo.name;
    const label = document.createElement('span');
    label.textContent = photo.name;
    b.append(img, label);
    b.addEventListener('click', () => {
      beginChange();
      state.panels[selectedPanel].photo = photo.id;
      render();
    });
    b.addEventListener('dblclick', () => {
      beginChange();
      for (const p of state.panels) p.photo = photo.id;
      render();
    });
    tray.appendChild(b);
  }
}

function bindInputs() {
  const bind = (id, key, parse) => {
    const el = document.getElementById(id);
    el.addEventListener('focus', () => beginChange());
    el.addEventListener('input', () => {
      state[key] = parse(el.value);
      render();
    });
  };
  bind('titleInput', 'title', (v) => v.slice(0, 24));
  bind('subtitleInput', 'subtitle', (v) => v.slice(0, 42));
  bind('kickerInput', 'kicker', (v) => v.slice(0, 48));
  const bindRange = (id, key, scale) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => {
      state[key] = Number(el.value) * scale;
      render();
    });
  };
  bindRange('heatRange', 'heat', 1);
  bindRange('inkRange', 'ink', 1);
  bindRange('grainRange', 'grain', 0.01);
  bindRange('vignetteRange', 'vignette', 0.01);
  bindRange('strengthRange', 'strength', 0.01);
  document.getElementById('fileInput').addEventListener('change', async (ev) => {
    const files = [...ev.target.files];
    if (!files.length) return;
    beginChange();
    for (const file of files) {
      const photo = await store.addFile(file);
      state.panels[selectedPanel].photo = photo.id;
    }
    buildTray();
    render();
    setStatus(`${files.length} photo${files.length > 1 ? 's' : ''} loaded from your machine — nothing was uploaded.`);
  });
  document.getElementById('fillAllBtn').addEventListener('click', () => {
    const photo = state.panels[selectedPanel].photo;
    if (!photo) return;
    beginChange();
    for (const p of state.panels) p.photo = photo;
    render();
  });
  document.getElementById('resetPanelBtn').addEventListener('click', () => {
    beginChange();
    const p = state.panels[selectedPanel];
    p.x = 0; p.y = 0; p.zoom = 1;
    render();
  });
  document.getElementById('undoBtn').addEventListener('click', undo);
  document.getElementById('redoBtn').addEventListener('click', redo);
  document.getElementById('autoBtn').addEventListener('click', autoCompose);
  document.getElementById('exportBtn').addEventListener('click', doExport);
  window.addEventListener('keydown', (ev) => {
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'z') { ev.preventDefault(); undo(); }
    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'y') { ev.preventDefault(); redo(); }
  });
}

function syncUIFromState() {
  document.getElementById('titleInput').value = state.title;
  document.getElementById('subtitleInput').value = state.subtitle;
  document.getElementById('kickerInput').value = state.kicker;
  document.getElementById('heatRange').value = state.heat;
  document.getElementById('inkRange').value = state.ink;
  document.getElementById('grainRange').value = Math.round(state.grain * 100);
  document.getElementById('vignetteRange').value = Math.round(state.vignette * 100);
  document.getElementById('strengthRange').value = Math.round(state.strength * 100);
  document.getElementById('sizeSelect').value = state.size;
  for (const b of document.querySelectorAll('#layoutList .pick')) {
    b.classList.toggle('active', b.dataset.layout === state.layout);
  }
  for (const b of document.querySelectorAll('#gradeList .pick')) {
    b.classList.toggle('active', b.dataset.grade === state.grade);
  }
}

// One click from photos to a finished cover: deal the photos across the
// panels and set the poster effects to their sweet spot.
function autoCompose() {
  beginChange();
  const ids = store.ids();
  state.panels = state.panels.map((p, i) => ({
    photo: ids.length ? ids[(i * 2 + 1) % ids.length] : p.photo,
    x: 0, y: 0, zoom: 1,
  }));
  if (state.panels.length && ids.length) state.panels[0].photo = ids[0];
  state.ink = 5;
  state.grain = 0.55;
  state.vignette = 0.5;
  state.strength = 0.85;
  syncUIFromState();
  render();
  setStatus('Composed. Nudge any panel, tweak the caption, then export your PNG.');
}

async function doExport() {
  const size = sizeById(state.size);
  const blob = await exportCoverPNG(state, store, size.w, size.h);
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `neon-palms-cover-${size.w}x${size.h}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
  setStatus(`Exported a ${size.w} × ${size.h} PNG — ready to post.`);
}

function setStatus(text) {
  document.getElementById('statusLine').textContent = text;
}

// ---------- panel drag / zoom ----------

function canvasPoint(ev) {
  const r = canvas.getBoundingClientRect();
  return {
    x: (ev.clientX - r.left) * (canvas.width / r.width),
    y: (ev.clientY - r.top) * (canvas.height / r.height),
  };
}

function panelAt(pt) {
  const { panels } = layoutPanels(state.layout, canvas.width, canvas.height);
  for (let i = panels.length - 1; i >= 0; i--) {
    const p = panels[i];
    if (p.rot) {
      const dx = pt.x - (p.x + p.w / 2);
      const dy = pt.y - (p.y + p.h / 2);
      const cos = Math.cos(-p.rot);
      const sin = Math.sin(-p.rot);
      const lx = dx * cos - dy * sin;
      const ly = dx * sin + dy * cos;
      if (Math.abs(lx) <= p.w / 2 && Math.abs(ly) <= p.h / 2) return i;
    } else if (pt.x >= p.x && pt.x <= p.x + p.w && pt.y >= p.y && pt.y <= p.y + p.h) {
      return i;
    }
  }
  return -1;
}

function bindCanvas() {
  let drag = null;
  canvas.addEventListener('pointerdown', (ev) => {
    const idx = panelAt(canvasPoint(ev));
    if (idx < 0) return;
    selectedPanel = idx;
    beginChange();
    drag = { x: ev.clientX, y: ev.clientY };
    canvas.setPointerCapture(ev.pointerId);
    render();
  });
  canvas.addEventListener('pointermove', (ev) => {
    if (!drag) return;
    const r = canvas.getBoundingClientRect();
    const { panels } = layoutPanels(state.layout, canvas.width, canvas.height);
    const p = panels[selectedPanel];
    const pick = state.panels[selectedPanel];
    pick.x = Math.max(-0.6, Math.min(0.6, pick.x + ((ev.clientX - drag.x) / r.width) * (canvas.width / p.w)));
    pick.y = Math.max(-0.6, Math.min(0.6, pick.y + ((ev.clientY - drag.y) / r.height) * (canvas.height / p.h)));
    drag = { x: ev.clientX, y: ev.clientY };
    render();
  });
  canvas.addEventListener('pointerup', () => { drag = null; });
  let wheelAt = 0;
  canvas.addEventListener('wheel', (ev) => {
    ev.preventDefault();
    const idx = panelAt(canvasPoint(ev));
    if (idx < 0) return;
    selectedPanel = idx;
    if (Date.now() - wheelAt > 450) beginChange();
    wheelAt = Date.now();
    const pick = state.panels[selectedPanel];
    pick.zoom = Math.max(1, Math.min(3.5, pick.zoom * (ev.deltaY < 0 ? 1.08 : 0.93)));
    render();
  }, { passive: false });
}

// ---------- boot ----------

async function boot() {
  buildPickers();
  bindInputs();
  bindCanvas();
  await store.loadSamples();
  buildTray();
  ensurePanels();
  const shot = parseShotQuery(window.location.search);
  if (shot) {
    applyShotToState(state, shot, store.ids());
    ensurePanels();
    if (shot.mode === 'cover') {
      document.body.classList.add('shot-cover');
      const m = /^([0-9]+)x([0-9]+)$/.exec(shot.size || '');
      if (m) {
        state.size = EXPORT_SIZES.some((s) => s.w === Number(m[1]) && s.h === Number(m[2]))
          ? EXPORT_SIZES.find((s) => s.w === Number(m[1]) && s.h === Number(m[2])).id : state.size;
        canvas.width = Number(m[1]);
        canvas.height = Number(m[2]);
        canvas.style.width = `${m[1]}px`;
        canvas.style.height = `${m[2]}px`;
      }
    }
  }
  syncUIFromState();
  try {
    await Promise.race([
      Promise.all([document.fonts.load('90px Anton'), document.fonts.load('30px Pacifico')]),
      new Promise((resolve) => setTimeout(resolve, 3500)),
    ]);
  } catch (e) { /* fall back to system fonts */ }
  render();
  syncHistoryButtons();
  // The capture script and power users get a small, honest API.
  window.neonPalms = {
    state,
    store,
    render,
    exportDataURL(w, h) {
      const c = document.createElement('canvas');
      c.width = w; c.height = h;
      renderCover(c.getContext('2d'), w, h, state, store);
      return c.toDataURL('image/png');
    },
  };
  window.__shotReady = true;
}

boot();
