// Neon Palms Cover Studio — the cover renderer.
// Draws the whole poster on a 2D canvas: graded photo panels in one of six
// layouts, ink-band posterising, sunset / neon gradient-map grades, grain,
// vignette, and display lettering with a script subtitle. Pure canvas, no
// network, no libraries — everything is painted here.

export const EXPORT_SIZES = [
  { id: 'square', label: 'Square post · 1080 × 1080', w: 1080, h: 1080 },
  { id: 'portrait', label: 'Portrait post · 1080 × 1350', w: 1080, h: 1350 },
  { id: 'wide', label: 'Wide post · 1920 × 1080', w: 1920, h: 1080 },
  { id: 'story', label: 'Story · 1080 × 1920', w: 1080, h: 1920 },
];

export const GRADES = [
  { id: 'vice-sunset', name: 'Vice Sunset', stops: [[0, 22, 10, 51], [0.28, 75, 17, 96], [0.52, 184, 31, 109], [0.74, 255, 106, 61], [0.9, 255, 179, 92], [1, 255, 233, 176]] },
  { id: 'neon-night', name: 'Neon Night', stops: [[0, 3, 3, 18], [0.32, 16, 27, 77], [0.58, 11, 110, 125], [0.8, 23, 195, 165], [0.93, 125, 249, 232], [1, 255, 242, 251]] },
  { id: 'golden-hour', name: 'Golden Hour', stops: [[0, 28, 13, 4], [0.3, 77, 36, 8], [0.55, 156, 84, 16], [0.78, 232, 155, 60], [1, 255, 243, 196]] },
  { id: 'chrome-dusk', name: 'Chrome Dusk', stops: [[0, 10, 14, 30], [0.3, 31, 42, 82], [0.52, 74, 58, 110], [0.72, 125, 107, 168], [0.88, 195, 203, 232], [1, 255, 255, 255]] },
  { id: 'rose-mirage', name: 'Rose Mirage', stops: [[0, 30, 7, 22], [0.3, 87, 18, 51], [0.55, 161, 28, 82], [0.78, 232, 93, 117], [1, 255, 217, 176]] },
];

export const LAYOUTS = [
  { id: 'nine-grid', name: 'Cover Grid · 9 panels' },
  { id: 'hero-three', name: 'Hero & Three' },
  { id: 'full-bleed', name: 'Full Bleed' },
  { id: 'magazine-six', name: 'Magazine · 6 panels' },
  { id: 'snapshots', name: 'Tilted Snapshots' },
  { id: 'story-duo', name: 'Story Duo' },
];

const INK = '#0d0518';

export function gradeById(id) {
  return GRADES.find((g) => g.id === id) || GRADES[0];
}

function buildLut(grade) {
  const lut = new Uint8Array(256 * 3);
  const stops = grade.stops;
  for (let v = 0; v < 256; v++) {
    const t = v / 255;
    let i = 0;
    while (i < stops.length - 2 && t > stops[i + 1][0]) i++;
    const a = stops[i];
    const b = stops[i + 1];
    const f = Math.min(1, Math.max(0, (t - a[0]) / (b[0] - a[0])));
    for (let c = 0; c < 3; c++) lut[v * 3 + c] = Math.round(a[1 + c] + (b[1 + c] - a[1 + c]) * f);
  }
  return lut;
}

const lutCache = new Map();
function lutFor(gradeId) {
  if (!lutCache.has(gradeId)) lutCache.set(gradeId, buildLut(gradeById(gradeId)));
  return lutCache.get(gradeId);
}

// A tiny seeded PRNG so the grain is identical on every render and export.
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

let noiseTile = null;
function getNoiseTile() {
  if (noiseTile) return noiseTile;
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  const ctx = c.getContext('2d');
  const img = ctx.createImageData(256, 256);
  const rnd = mulberry32(20261119);
  for (let i = 0; i < img.data.length; i += 4) {
    const v = Math.floor(rnd() * 256);
    img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v; img.data[i + 3] = 255;
  }
  ctx.putImageData(img, 0, 0);
  noiseTile = c;
  return c;
}

const gradedCache = new Map();
// Grade one photo once per (photo, grade, ink, strength) and cache the
// result at a capped working size; the draw step scales it into its panel.
export function gradedPhoto(photo, state) {
  const strength = Math.round(state.strength * 20) / 20;
  const key = [photo.id, state.grade, state.ink, strength].join('|');
  if (gradedCache.has(key)) return gradedCache.get(key);
  const img = photo.img;
  const scale = Math.min(1, 1150 / Math.max(img.naturalWidth, img.naturalHeight));
  const w = Math.max(2, Math.round(img.naturalWidth * scale));
  const h = Math.max(2, Math.round(img.naturalHeight * scale));
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const lut = lutFor(state.grade);
  const data = ctx.getImageData(0, 0, w, h);
  const px = data.data;
  const bands = state.ink > 0 ? state.ink + 2 : 0;
  for (let i = 0; i < px.length; i += 4) {
    let lum = 0.2126 * px[i] + 0.7152 * px[i + 1] + 0.0722 * px[i + 2];
    if (bands) lum = Math.round((lum / 255) * (bands - 1)) / (bands - 1) * 255;
    const li = Math.max(0, Math.min(255, Math.round(lum))) * 3;
    const s = strength;
    px[i] = px[i] * (1 - s) + lut[li] * s;
    px[i + 1] = px[i + 1] * (1 - s) + lut[li + 1] * s;
    px[i + 2] = px[i + 2] * (1 - s) + lut[li + 2] * s;
  }
  ctx.putImageData(data, 0, 0);
  gradedCache.set(key, c);
  if (gradedCache.size > 40) gradedCache.delete(gradedCache.keys().next().value);
  return c;
}

// Panel geometry for each layout, in fractions of the cover size. The
// title block is returned too, so the editor can hit-test panels only.
export function layoutPanels(layoutId, W, H) {
  const g = Math.max(6, W * 0.011);
  const panels = [];
  const add = (x, y, w, h, rot) => panels.push({ x: x * W, y: y * H, w: w * W, h: h * H, rot: rot || 0 });
  let title = null;
  if (layoutId === 'hero-three') {
    add(0, 0, 0.655, 0.815); add(0.667, 0, 0.333, 0.265);
    add(0.667, 0.275, 0.333, 0.265); add(0.667, 0.55, 0.333, 0.265);
    title = { x: 0, y: 0.83, w: 1, h: 0.17, band: true };
  } else if (layoutId === 'full-bleed') {
    add(0, 0, 1, 1);
    title = { x: 0.045, y: 0.685, w: 0.91, h: 0.27, band: false };
  } else if (layoutId === 'magazine-six') {
    const rows = [[0.168, 0.262], [0.443, 0.262], [0.718, 0.282]];
    for (const [ry, rh] of rows) { add(0, ry, 0.494, rh); add(0.506, ry, 0.494, rh); }
    title = { x: 0, y: 0, w: 1, h: 0.155, band: true, masthead: true };
  } else if (layoutId === 'snapshots') {
    add(0.055, 0.075, 0.52, 0.44, -0.07); add(0.435, 0.045, 0.51, 0.42, 0.055);
    add(0.095, 0.435, 0.48, 0.40, 0.04); add(0.465, 0.415, 0.475, 0.42, -0.05);
    title = { x: 0, y: 0.845, w: 1, h: 0.145, band: false };
  } else if (layoutId === 'story-duo') {
    add(0, 0, 1, 0.405); add(0, 0.595, 1, 0.405);
    title = { x: 0, y: 0.385, w: 1, h: 0.23, band: true };
  } else {
    // nine-grid: the classic cover — 3 × 3 panels over a title band.
    const gridH = 0.783;
    const cw = 1 / 3;
    const ch = gridH / 3;
    for (let r = 0; r < 3; r++) for (let c = 0; c < 3; c++) add(c * cw, r * ch, cw, ch);
    title = { x: 0, y: 0.795, w: 1, h: 0.205, band: true };
  }
  // Shrink each panel by the gutter so the ink ground shows between them.
  for (const p of panels) {
    if (!p.rot) { p.x += g / 2; p.y += g / 2; p.w -= g; p.h -= g; }
  }
  return { panels, title };
}

// Draw one photo into a rect with cover-fit, honouring the panel's pan
// (fractions of the panel size) and zoom.
function drawPhotoCover(ctx, source, rect, pan) {
  const iw = source.width;
  const ih = source.height;
  const scale = Math.max(rect.w / iw, rect.h / ih) * (pan.zoom || 1);
  const dw = iw * scale;
  const dh = ih * scale;
  let dx = rect.x + (rect.w - dw) / 2 + (pan.x || 0) * rect.w;
  let dy = rect.y + (rect.h - dh) / 2 + (pan.y || 0) * rect.h;
  dx = Math.min(rect.x, Math.max(rect.x + rect.w - dw, dx));
  dy = Math.min(rect.y, Math.max(rect.y + rect.h - dh, dy));
  ctx.drawImage(source, dx, dy, dw, dh);
}

function starPath(ctx, cx, cy, r) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? r : r * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const x = cx + Math.cos(a) * rad;
    const y = cy + Math.sin(a) * rad;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

function halftoneBand(ctx, x, y, w, h, color) {
  const step = Math.max(9, w * 0.016);
  ctx.save();
  ctx.fillStyle = color;
  for (let row = 0, yy = y + step / 2; yy < y + h; row++, yy += step) {
    for (let xx = x + step / 2 + (row % 2) * step * 0.5; xx < x + w; xx += step) {
      const r = step * 0.16 * (0.5 + 0.5 * Math.sin((xx / w) * Math.PI));
      ctx.beginPath(); ctx.arc(xx, yy, r, 0, Math.PI * 2); ctx.fill();
    }
  }
  ctx.restore();
}

function fitFont(ctx, text, family, startPx, maxWidth) {
  let px = startPx;
  while (px > 10) {
    ctx.font = `${px}px ${family}`;
    if (ctx.measureText(text).width <= maxWidth) break;
    px -= 2;
  }
  return px;
}

// The title block: kicker, big gradient-filled display title with a heavy
// outline, script subtitle, and the heat-meter stars.
function drawTitleBlock(ctx, W, H, state, title) {
  const tx = title.x * W;
  const ty = title.y * H;
  const tw = title.w * W;
  const th = title.h * H;
  if (title.band) {
    ctx.fillStyle = INK;
    ctx.fillRect(tx, ty, tw, th);
    ctx.save();
    ctx.globalAlpha = 0.34;
    halftoneBand(ctx, tx, ty, tw, th, '#ff2e88');
    ctx.restore();
    const edge = ctx.createLinearGradient(tx, 0, tx + tw, 0);
    edge.addColorStop(0, '#ff2e88'); edge.addColorStop(0.5, '#ffb35c'); edge.addColorStop(1, '#12b5a5');
    ctx.fillStyle = edge;
    ctx.fillRect(tx, ty, tw, Math.max(3, H * 0.006));
  }
  const cx = tx + tw / 2;
  const pad = tw * 0.05;
  const titleText = (state.title || 'NEON PALMS').toUpperCase();
  const kickerPx = Math.max(11, th * (title.masthead ? 0.11 : 0.13));
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  if (!title.masthead) {
    ctx.font = `${kickerPx}px Anton, sans-serif`;
    try { ctx.letterSpacing = `${Math.round(kickerPx * 0.42)}px`; } catch (e) { /* older canvas */ }
    ctx.fillStyle = '#ffd76a';
    ctx.fillText((state.kicker || '').toUpperCase(), cx, ty + th * 0.20);
    try { ctx.letterSpacing = '0px'; } catch (e) { /* ignore */ }
  }
  const titlePx = fitFont(ctx, titleText, 'Anton, sans-serif', th * (title.masthead ? 0.52 : 0.40), tw - pad * 2);
  const grad = ctx.createLinearGradient(0, ty + th * 0.2, 0, ty + th * 0.85);
  grad.addColorStop(0, '#fff3c4'); grad.addColorStop(0.45, '#ffb35c');
  grad.addColorStop(0.75, '#ff2e88'); grad.addColorStop(1, '#7a2bff');
  ctx.font = `${titlePx}px Anton, sans-serif`;
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#160424';
  ctx.lineWidth = Math.max(3, titlePx * 0.16);
  const titleY = ty + th * (title.masthead ? 0.62 : 0.65);
  ctx.strokeText(titleText, cx, titleY);
  ctx.fillStyle = grad;
  ctx.fillText(titleText, cx, titleY);
  const sub = state.subtitle || '';
  if (sub) {
    const subPx = Math.max(13, titlePx * 0.36);
    ctx.font = `${subPx}px Pacifico, cursive`;
    ctx.save();
    ctx.shadowColor = '#ff2e88';
    ctx.shadowBlur = subPx * 0.5;
    ctx.fillStyle = '#ffeef7';
    ctx.fillText(sub, cx, ty + th * (title.masthead ? 0.92 : 0.90));
    ctx.restore();
  }
  // Heat meter: five stars at the band's right-hand end.
  const heat = Math.max(0, Math.min(5, state.heat | 0));
  if (title.band && !title.masthead) {
    const sr = th * 0.085;
    const sx = tx + tw - pad - sr * 2 * 5;
    const sy = ty + th * 0.86;
    for (let i = 0; i < 5; i++) {
      starPath(ctx, sx + i * sr * 2 + sr, sy, sr);
      ctx.fillStyle = i < heat ? '#ffb35c' : 'rgba(255,255,255,0.22)';
      ctx.fill();
    }
    ctx.font = `${Math.max(9, sr * 0.95)}px Anton, sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,0.65)';
    ctx.textAlign = 'right';
    ctx.fillText('HEAT', tx + tw - pad, sy - sr * 1.3);
    ctx.textAlign = 'center';
  }
}

// A round seal for the full-bleed and magazine looks.
function drawSeal(ctx, x, y, r) {
  ctx.save();
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(13,5,24,0.82)'; ctx.fill();
  ctx.lineWidth = r * 0.07; ctx.strokeStyle = '#ffb35c'; ctx.stroke();
  ctx.beginPath(); ctx.arc(x, y, r * 0.78, 0, Math.PI * 2);
  ctx.lineWidth = r * 0.035; ctx.strokeStyle = '#ff2e88'; ctx.stroke();
  starPath(ctx, x, y - r * 0.12, r * 0.34);
  ctx.fillStyle = '#ffd76a'; ctx.fill();
  ctx.font = `${Math.round(r * 0.30)}px Anton, sans-serif`;
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ffeef7';
  ctx.fillText('EST · 2026', x, y + r * 0.48);
  ctx.restore();
}

// Paint the whole cover into ctx at W × H. `photos` resolves a photo id to
// a loaded photo record ({ id, img }); state.panels[i] picks each panel's
// photo and its pan / zoom.
export function renderCover(ctx, W, H, state, photos) {
  ctx.save();
  ctx.clearRect(0, 0, W, H);
  const grade = gradeById(state.grade);
  if (state.layout === 'snapshots') {
    const bg = ctx.createLinearGradient(0, 0, W, H);
    const s = grade.stops;
    bg.addColorStop(0, `rgb(${s[1][1]},${s[1][2]},${s[1][3]})`);
    bg.addColorStop(0.6, `rgb(${s[2][1]},${s[2][2]},${s[2][3]})`);
    bg.addColorStop(1, `rgb(${s[3][1]},${s[3][2]},${s[3][3]})`);
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);
    ctx.save();
    ctx.globalAlpha = 0.30;
    halftoneBand(ctx, 0, 0, W, H * 0.5, '#ffffff');
    ctx.restore();
  } else {
    ctx.fillStyle = INK;
    ctx.fillRect(0, 0, W, H);
  }
  const { panels, title } = layoutPanels(state.layout, W, H);
  panels.forEach((p, i) => {
    const pick = state.panels[i] || state.panels[0] || { photo: null, x: 0, y: 0, zoom: 1 };
    const photo = pick.photo ? photos.get(pick.photo) : null;
    ctx.save();
    if (p.rot) {
      const cxp = p.x + p.w / 2;
      const cyp = p.y + p.h / 2;
      ctx.translate(cxp, cyp);
      ctx.rotate(p.rot);
      ctx.shadowColor = 'rgba(0,0,0,0.5)';
      ctx.shadowBlur = W * 0.03;
      ctx.shadowOffsetY = W * 0.012;
      ctx.fillStyle = '#f7f2e7';
      const fr = W * 0.012;
      ctx.fillRect(-p.w / 2 - fr, -p.h / 2 - fr, p.w + fr * 2, p.h + fr * 2 + W * 0.02);
      ctx.shadowColor = 'transparent';
      ctx.beginPath();
      ctx.rect(-p.w / 2, -p.h / 2, p.w, p.h);
      ctx.clip();
      if (photo) drawPhotoCover(ctx, gradedPhoto(photo, state), { x: -p.w / 2, y: -p.h / 2, w: p.w, h: p.h }, pick);
      else { ctx.fillStyle = '#2a1245'; ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); }
    } else {
      ctx.beginPath();
      ctx.rect(p.x, p.y, p.w, p.h);
      ctx.clip();
      if (photo) drawPhotoCover(ctx, gradedPhoto(photo, state), p, pick);
      else { ctx.fillStyle = '#2a1245'; ctx.fillRect(p.x, p.y, p.w, p.h); }
    }
    ctx.restore();
  });
  drawTitleBlock(ctx, W, H, state, title);
  if (state.layout === 'full-bleed') drawSeal(ctx, W * 0.90, H * 0.115, W * 0.052);
  if (state.layout === 'magazine-six') drawSeal(ctx, W * 0.935, H * 0.078, W * 0.036);
  // Finish: grain, vignette, and a hairline frame.
  if (state.grain > 0) {
    ctx.save();
    ctx.globalAlpha = state.grain * 0.16;
    ctx.globalCompositeOperation = 'overlay';
    const tile = getNoiseTile();
    const pat = ctx.createPattern(tile, 'repeat');
    ctx.fillStyle = pat;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();
  }
  if (state.vignette > 0) {
    const vg = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.42, W / 2, H / 2, Math.max(W, H) * 0.78);
    vg.addColorStop(0, 'rgba(4,0,10,0)');
    vg.addColorStop(1, `rgba(4,0,10,${(state.vignette * 0.55).toFixed(3)})`);
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }
  ctx.strokeStyle = 'rgba(255,255,255,0.10)';
  ctx.lineWidth = Math.max(2, W * 0.003);
  ctx.strokeRect(ctx.lineWidth, ctx.lineWidth, W - ctx.lineWidth * 2, H - ctx.lineWidth * 2);
  ctx.restore();
}

// Render to an offscreen canvas at an export size and hand back a PNG blob.
export function exportCoverPNG(state, photos, w, h) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  renderCover(c.getContext('2d'), w, h, state, photos);
  return new Promise((resolve) => c.toBlob(resolve, 'image/png'));
}
