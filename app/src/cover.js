// Palm Coast Cover Studio — cover renderer.
//
// A cover is a printed poster sheet: photographic panels mounted on
// white with a thick white border and a thin dark keyline, a masthead
// kicker across the top, a five-star heat mark, and a big fitted
// title in gradient Anton with a Pacifico script subtitle under it.
//
// Every photograph passes through a film pipeline: a camera filter
// per grade, a two-colour gradient wash, and — once the whole sheet
// is composed — a finish of halation bloom, a warm light leak,
// seeded film grain and a vignette. All of it happens on canvas,
// offline, with no library code.

window.PalmCover = (function () {
  'use strict';

  // ----------------------------------------------------------------
  // Film grades. `filter` is a canvas 2D filter string applied while
  // the photo is drawn; `washA`/`washB` are the two ends of the
  // gradient wash laid over it in soft-light and overlay.
  // ----------------------------------------------------------------
  var GRADES = [
    { id: 'vice-sunset', name: 'Vice Sunset',
      filter: 'saturate(1.28) contrast(1.09) brightness(1.04)',
      washA: '#ff7a3d', washB: '#ff2e88' },
    { id: 'neon-night', name: 'Neon Night',
      filter: 'saturate(1.38) contrast(1.16) brightness(0.96) hue-rotate(-10deg)',
      washA: '#00e5ff', washB: '#ff2ea6' },
    { id: 'golden-hour', name: 'Golden Hour',
      filter: 'sepia(0.30) saturate(1.22) contrast(1.05) brightness(1.07)',
      washA: '#ffb347', washB: '#ff7847' },
    { id: 'ultraviolet', name: 'Ultraviolet',
      filter: 'saturate(1.32) contrast(1.11) hue-rotate(16deg)',
      washA: '#a855f7', washB: '#6366f1' },
    { id: 'teal-orange', name: 'Teal & Orange',
      filter: 'saturate(1.24) contrast(1.13) brightness(1.01)',
      washA: '#0fb5ba', washB: '#ff8c42' },
    { id: 'chrome-noir', name: 'Chrome Noir',
      filter: 'grayscale(0.88) contrast(1.26) brightness(1.03)',
      washA: '#cfd8dc', washB: '#455a64' },
    { id: 'noir-ink', name: 'Noir Ink',
      filter: 'grayscale(1) contrast(1.34) brightness(0.97)',
      washA: '#9fb4c0', washB: '#1d2733' },
    { id: 'romance-blush', name: 'Romance Blush',
      filter: 'sepia(0.14) saturate(1.20) contrast(1.02) brightness(1.09)',
      washA: '#ffd3a6', washB: '#ff8fb5' },
    { id: 'rocket-pop', name: 'Rocket Pop',
      filter: 'saturate(1.52) contrast(1.18) hue-rotate(-8deg)',
      washA: '#37f4e4', washB: '#7a5cff' },
    { id: 'dust-western', name: 'Dust Western',
      filter: 'sepia(0.52) saturate(1.06) contrast(1.08) brightness(1.02)',
      washA: '#e8a54b', washB: '#8a5a2b' },
    { id: 'midnight-horror', name: 'Midnight Horror',
      filter: 'saturate(0.82) contrast(1.24) brightness(0.80) hue-rotate(24deg)',
      washA: '#1f6f50', washB: '#0b2038' }
  ];

  function gradeById(id) {
    for (var i = 0; i < GRADES.length; i++) {
      if (GRADES[i].id === id) return GRADES[i];
    }
    return GRADES[0];
  }

  // ----------------------------------------------------------------
  // Layout geometry. Each layout returns the panel rectangles (in
  // cover pixels) plus where the title block anchors: 'seam' straddles
  // the horizontal seam at seamY, 'bottom' sits over the foot of the
  // sheet, 'centre' straddles the middle of a quad.
  // ----------------------------------------------------------------
  var LAYOUTS = [
    { id: 'blockbuster', name: 'Blockbuster' },
    { id: 'fullbleed', name: 'Full Bleed Poster' },
    { id: 'nine-grid', name: 'Nine Panel Grid' },
    { id: 'triptych', name: 'Triptych' },
    { id: 'duo', name: 'Duo Poster' },
    { id: 'billboard', name: 'Billboard' },
    { id: 'filmstrip', name: 'Film Strip' },
    { id: 'quad', name: 'Quad Split' },
    { id: 'split-hero', name: 'Split Hero' },
    { id: 'manga', name: 'Manga Spread' }
  ];

  function sheet(W, H) {
    var u = Math.min(W, H);
    var mx = Math.round(u * 0.020);
    var my = Math.round(u * 0.020);
    return {
      u: u,
      x: mx, y: my, w: W - mx * 2, h: H - my * 2,
      gap: Math.max(4, Math.round(u * 0.016)),
      border: Math.max(4, Math.round(u * 0.012))
    };
  }

  function columns(s, count, y, h) {
    var out = [];
    var w = (s.w - s.gap * (count - 1)) / count;
    for (var i = 0; i < count; i++) {
      out.push({ x: s.x + i * (w + s.gap), y: y, w: w, h: h });
    }
    return out;
  }

  function rows(s, count, x, w) {
    var out = [];
    var h = (s.h - s.gap * (count - 1)) / count;
    for (var i = 0; i < count; i++) {
      out.push({ x: x, y: s.y + i * (h + s.gap), w: w, h: h });
    }
    return out;
  }

  function grid(s, cols, rowsCount) {
    var out = [];
    var w = (s.w - s.gap * (cols - 1)) / cols;
    var h = (s.h - s.gap * (rowsCount - 1)) / rowsCount;
    for (var r = 0; r < rowsCount; r++) {
      for (var c = 0; c < cols; c++) {
        out.push({ x: s.x + c * (w + s.gap), y: s.y + r * (h + s.gap), w: w, h: h });
      }
    }
    return out;
  }

  function geometry(layoutId, W, H) {
    var s = sheet(W, H);
    var heroH, stripY, stripH;
    switch (layoutId) {
      case 'fullbleed':
        return { sheet: s, panels: [{ x: s.x, y: s.y, w: s.w, h: s.h }],
                 titleMode: 'bottom' };
      case 'nine-grid':
        return { sheet: s, panels: grid(s, 3, 3), titleMode: 'bottom' };
      case 'triptych':
        return { sheet: s, panels: columns(s, 3, s.y, s.h), titleMode: 'bottom' };
      case 'duo':
        return { sheet: s, panels: columns(s, 2, s.y, s.h), titleMode: 'bottom' };
      case 'quad':
        return { sheet: s, panels: grid(s, 2, 2), titleMode: 'centre',
                 seamY: s.y + s.h / 2 };
      case 'filmstrip': {
        var bandY = s.y + s.h * 0.10;
        var bandH = s.h * 0.58;
        return { sheet: s, panels: columns(s, 4, bandY, bandH),
                 titleMode: 'bottom', filmBand: { x: s.x, y: bandY, w: s.w, h: bandH } };
      }
      case 'billboard':
        heroH = s.h * 0.54;
        stripY = s.y + heroH + s.gap;
        stripH = s.y + s.h - stripY;
        return { sheet: s,
                 panels: [{ x: s.x, y: s.y, w: s.w, h: heroH }]
                   .concat(columns(s, 3, stripY, stripH)),
                 titleMode: 'seam', seamY: s.y + heroH + s.gap / 2 };
      case 'split-hero': {
        var heroW = s.w * 0.56;
        var sideX = s.x + heroW + s.gap;
        var sideW = s.x + s.w - sideX;
        var sideH = (s.h - s.gap) / 2;
        return { sheet: s,
                 panels: [
                   { x: s.x, y: s.y, w: heroW, h: s.h },
                   { x: sideX, y: s.y, w: sideW, h: sideH },
                   { x: sideX, y: s.y + sideH + s.gap, w: sideW, h: sideH }
                 ],
                 titleMode: 'bottom' };
      }
      case 'manga': {
        var rowH = (s.h - s.gap) / 2;
        var wideW = s.w * 0.64;
        var narrowW = s.x + s.w - (s.x + wideW + s.gap);
        var row2Y = s.y + rowH + s.gap;
        return { sheet: s,
                 panels: [
                   { x: s.x, y: s.y, w: wideW, h: rowH },
                   { x: s.x + wideW + s.gap, y: s.y, w: narrowW, h: rowH },
                   { x: s.x, y: row2Y, w: narrowW, h: rowH },
                   { x: s.x + narrowW + s.gap, y: row2Y, w: wideW, h: rowH }
                 ],
                 titleMode: 'bottom' };
      }
      case 'blockbuster':
      default:
        heroH = s.h * 0.615;
        stripY = s.y + heroH + s.gap;
        stripH = s.y + s.h - stripY;
        return { sheet: s,
                 panels: [{ x: s.x, y: s.y, w: s.w, h: heroH }]
                   .concat(columns(s, 3, stripY, stripH)),
                 titleMode: 'seam', seamY: s.y + heroH + s.gap / 2 };
    }
  }

  // ----------------------------------------------------------------
  // Deterministic grain. A small noise tile generated once from a
  // seeded PRNG, so every export of the same cover is identical.
  // ----------------------------------------------------------------
  var grainTile = null;
  function makeGrainTile() {
    var size = 240;
    var c = document.createElement('canvas');
    c.width = size; c.height = size;
    var g = c.getContext('2d');
    var img = g.createImageData(size, size);
    var seed = 20261120;
    function rnd() {
      seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
      var t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    }
    for (var i = 0; i < img.data.length; i += 4) {
      var v = Math.floor(rnd() * 255);
      img.data[i] = v; img.data[i + 1] = v; img.data[i + 2] = v;
      img.data[i + 3] = 255;
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  // ----------------------------------------------------------------
  // One photographic panel: grade the photo on an offscreen canvas,
  // then mount it — white border, keyline, soft shadow.
  // ----------------------------------------------------------------
  function gradedPhoto(img, frame, pw, ph, grade) {
    var c = document.createElement('canvas');
    c.width = Math.max(2, Math.round(pw));
    c.height = Math.max(2, Math.round(ph));
    var g = c.getContext('2d');
    var scale = Math.max(pw / img.naturalWidth, ph / img.naturalHeight) * frame.zoom;
    var dw = img.naturalWidth * scale;
    var dh = img.naturalHeight * scale;
    var roomX = Math.max(0, (dw - pw) / 2);
    var roomY = Math.max(0, (dh - ph) / 2);
    var dx = (pw - dw) / 2 + Math.max(-1, Math.min(1, frame.dx)) * roomX;
    var dy = (ph - dh) / 2 + Math.max(-1, Math.min(1, frame.dy)) * roomY;
    g.filter = grade.filter;
    g.drawImage(img, dx, dy, dw, dh);
    g.filter = 'none';
    var wash = g.createLinearGradient(0, 0, pw, ph);
    wash.addColorStop(0, grade.washA);
    wash.addColorStop(1, grade.washB);
    g.globalCompositeOperation = 'soft-light';
    g.globalAlpha = 0.85;
    g.fillStyle = wash;
    g.fillRect(0, 0, pw, ph);
    g.globalCompositeOperation = 'overlay';
    g.globalAlpha = 0.22;
    g.fillRect(0, 0, pw, ph);
    g.globalCompositeOperation = 'source-over';
    g.globalAlpha = 1;
    return c;
  }

  function drawPanel(ctx, img, frame, rect, grade, s) {
    var b = s.border;
    ctx.save();
    ctx.shadowColor = 'rgba(32, 6, 52, 0.35)';
    ctx.shadowBlur = s.u * 0.010;
    ctx.shadowOffsetY = s.u * 0.005;
    ctx.fillStyle = '#fdfbf6';
    ctx.fillRect(rect.x - b, rect.y - b, rect.w + b * 2, rect.h + b * 2);
    ctx.restore();
    ctx.strokeStyle = 'rgba(28, 8, 44, 0.45)';
    ctx.lineWidth = Math.max(1, s.u * 0.0016);
    ctx.strokeRect(rect.x - b, rect.y - b, rect.w + b * 2, rect.h + b * 2);
    var art = gradedPhoto(img, frame, rect.w, rect.h, grade);
    ctx.drawImage(art, rect.x, rect.y);
    ctx.strokeStyle = 'rgba(20, 4, 36, 0.30)';
    ctx.lineWidth = Math.max(1, s.u * 0.0013);
    ctx.strokeRect(rect.x + 0.5, rect.y + 0.5, rect.w - 1, rect.h - 1);
  }

  // Film strip backing: a dark band with sprocket holes behind the
  // four frames, so the layout reads as a length of 35mm film.
  function drawFilmBand(ctx, band, s) {
    var pad = s.u * 0.045;
    ctx.fillStyle = '#171114';
    ctx.fillRect(band.x - s.gap * 0.5, band.y - pad,
                 band.w + s.gap, band.h + pad * 2);
    var holeW = s.u * 0.020;
    var holeH = s.u * 0.013;
    var step = s.u * 0.052;
    ctx.fillStyle = '#f4efe6';
    for (var x = band.x + step * 0.4; x < band.x + band.w - holeW; x += step) {
      ctx.fillRect(x, band.y - pad + s.u * 0.012, holeW, holeH);
      ctx.fillRect(x, band.y + band.h + pad - s.u * 0.012 - holeH, holeW, holeH);
    }
  }

  // ----------------------------------------------------------------
  // Type. The title is fitted by measuring the letter-spaced string,
  // so it can never overflow the sheet at any export size.
  // ----------------------------------------------------------------
  function spacedWidth(ctx, text, spacing) {
    var w = ctx.measureText(text).width;
    return text.length > 1 ? w + spacing * (text.length - 1) : w;
  }

  function drawSpaced(ctx, text, cx, y, spacing) {
    var total = spacedWidth(ctx, text, spacing);
    var x = cx - total / 2;
    var prevAlign = ctx.textAlign;
    ctx.textAlign = 'left';
    for (var i = 0; i < text.length; i++) {
      ctx.fillText(text[i], x, y);
      x += ctx.measureText(text[i]).width + spacing;
    }
    ctx.textAlign = prevAlign;
    return total;
  }

  function fitSize(ctx, text, family, start, maxW, spacingRatio) {
    var size = start;
    while (size > 12) {
      ctx.font = size + 'px ' + family;
      if (spacedWidth(ctx, text, size * spacingRatio) <= maxW) break;
      size *= 0.95;
    }
    ctx.font = size + 'px ' + family;
    return size;
  }

  function drawType(ctx, state, geo, W, H) {
    var s = geo.sheet;
    var u = s.u;
    var title = (state.title || '').toUpperCase();
    var subtitle = state.subtitle || '';
    var kicker = (state.kicker || '').toUpperCase();

    // --- Title size, fitted to the sheet width.
    var size = fitSize(ctx, title, 'Anton', Math.min(W * 0.20, H * 0.235),
                       W * 0.945, 0.045);
    var spacing = size * 0.045;
    var subSize = size * 0.335;

    // --- Anchor the title block.
    var baseline;
    if (geo.titleMode === 'seam' || geo.titleMode === 'centre') {
      baseline = geo.seamY + size * 0.36;
    } else {
      baseline = s.y + s.h - subSize * 1.55 - u * 0.030;
    }
    var subBaseline = baseline + subSize * 1.28;

    // --- Tight scrim behind the type block only; panels stay bright.
    // Seam and centre blocks fade back out below the subtitle, while
    // a bottom block runs to the foot of the sheet — neither leaves a
    // hard edge across the panels.
    var scrimTop = baseline - size * 1.06;
    var scrimBottom = geo.titleMode === 'bottom'
      ? H : subBaseline + subSize * 1.15;
    var scrim = ctx.createLinearGradient(0, scrimTop, 0, scrimBottom);
    scrim.addColorStop(0, 'rgba(30, 4, 48, 0)');
    scrim.addColorStop(0.42, 'rgba(30, 4, 48, 0.52)');
    if (geo.titleMode === 'bottom') {
      scrim.addColorStop(1, 'rgba(30, 4, 48, 0.66)');
    } else {
      scrim.addColorStop(0.72, 'rgba(30, 4, 48, 0.55)');
      scrim.addColorStop(1, 'rgba(30, 4, 48, 0)');
    }
    ctx.fillStyle = scrim;
    ctx.fillRect(0, scrimTop, W, scrimBottom - scrimTop);

    // --- Title: hard offset shadow, dark keyline, gradient ink.
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    var cx = W / 2;
    ctx.font = size + 'px Anton';
    ctx.fillStyle = '#1d0530';
    drawSpaced(ctx, title, cx + size * 0.035, baseline + size * 0.055, spacing);
    var ink = ctx.createLinearGradient(0, baseline - size * 0.78, 0, baseline);
    ink.addColorStop(0, '#ffffff');
    ink.addColorStop(0.55, '#ffe0f1');
    ink.addColorStop(1, '#ff8fc2');
    ctx.strokeStyle = '#2b0a3f';
    ctx.lineWidth = Math.max(2, size * 0.052);
    // Stroke pass, then fill pass, both letter by letter so the
    // spacing survives the keyline.
    (function () {
      var total = spacedWidth(ctx, title, spacing);
      var x = cx - total / 2;
      var prev = ctx.textAlign;
      ctx.textAlign = 'left';
      var i, wch;
      for (i = 0; i < title.length; i++) {
        ctx.strokeText(title[i], x, baseline);
        x += ctx.measureText(title[i]).width + spacing;
      }
      x = cx - total / 2;
      ctx.fillStyle = ink;
      for (i = 0; i < title.length; i++) {
        ctx.fillText(title[i], x, baseline);
        x += ctx.measureText(title[i]).width + spacing;
      }
      ctx.textAlign = prev;
    })();

    // --- Script subtitle in warm gold.
    if (subtitle) {
      var sSize = subSize;
      ctx.font = sSize + 'px Pacifico';
      while (sSize > 10 && ctx.measureText(subtitle).width > W * 0.80) {
        sSize *= 0.95;
        ctx.font = sSize + 'px Pacifico';
      }
      ctx.textAlign = 'center';
      ctx.fillStyle = 'rgba(24, 2, 38, 0.65)';
      ctx.fillText(subtitle, cx + sSize * 0.05, subBaseline + sSize * 0.07);
      ctx.fillStyle = '#ffcf5c';
      ctx.fillText(subtitle, cx, subBaseline);
    }

    // --- Masthead kicker across the top of the sheet.
    if (kicker) {
      var kSize = fitSize(ctx, kicker, 'Anton', u * 0.031, W * 0.60, 0.16);
      var kSpacing = kSize * 0.16;
      var starSize = u * 0.034;
      var starsW = starSize * 5.6;
      var kCx = (W - starsW) / 2;
      var kY = s.y + s.border + kSize * 1.30;
      ctx.font = kSize + 'px Anton';
      ctx.fillStyle = 'rgba(24, 2, 38, 0.68)';
      drawSpaced(ctx, kicker, kCx + kSize * 0.07, kY + kSize * 0.10, kSpacing);
      ctx.fillStyle = '#ffffff';
      drawSpaced(ctx, kicker, kCx, kY, kSpacing);

      // --- Five-star heat mark, top right.
      ctx.font = starSize + 'px sans-serif';
      ctx.textAlign = 'left';
      var sx = W - s.x - starsW;
      ctx.fillStyle = 'rgba(24, 2, 38, 0.55)';
      ctx.fillText('★ ★ ★ ★ ★', sx + starSize * 0.05, kY + starSize * 0.06);
      ctx.fillStyle = '#ffffff';
      ctx.fillText('★ ★ ★ ★ ★', sx, kY);
    }
    ctx.textAlign = 'left';
  }

  // ----------------------------------------------------------------
  // Whole-cover finish: halation bloom, light leak, grain, vignette.
  // Runs on the composed sheet, so the finish unifies every panel.
  // ----------------------------------------------------------------
  function finish(ctx, W, H) {
    var u = Math.min(W, H);
    // Halation: the cover blooms back over itself at screen blend.
    var bloom = document.createElement('canvas');
    bloom.width = Math.max(2, Math.round(W / 3));
    bloom.height = Math.max(2, Math.round(H / 3));
    var bg = bloom.getContext('2d');
    bg.drawImage(ctx.canvas, 0, 0, bloom.width, bloom.height);
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.30;
    ctx.imageSmoothingEnabled = true;
    ctx.drawImage(bloom, 0, 0, W, H);
    ctx.restore();

    // Warm light leak from the top right, a whisper of magenta low left.
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    var leak = ctx.createRadialGradient(W * 0.94, H * 0.02, 0, W * 0.94, H * 0.02, u * 0.75);
    leak.addColorStop(0, 'rgba(255, 148, 64, 0.34)');
    leak.addColorStop(1, 'rgba(255, 148, 64, 0)');
    ctx.fillStyle = leak;
    ctx.fillRect(0, 0, W, H);
    var leak2 = ctx.createRadialGradient(W * 0.04, H * 0.98, 0, W * 0.04, H * 0.98, u * 0.6);
    leak2.addColorStop(0, 'rgba(255, 45, 140, 0.16)');
    leak2.addColorStop(1, 'rgba(255, 45, 140, 0)');
    ctx.fillStyle = leak2;
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Seeded film grain at overlay.
    if (!grainTile) grainTile = makeGrainTile();
    ctx.save();
    ctx.globalCompositeOperation = 'overlay';
    ctx.globalAlpha = 0.09;
    ctx.fillStyle = ctx.createPattern(grainTile, 'repeat');
    ctx.fillRect(0, 0, W, H);
    ctx.restore();

    // Vignette to seat the sheet.
    var vg = ctx.createRadialGradient(W / 2, H / 2, u * 0.42, W / 2, H / 2, u * 0.95);
    vg.addColorStop(0, 'rgba(22, 2, 34, 0)');
    vg.addColorStop(1, 'rgba(22, 2, 34, 0.34)');
    ctx.fillStyle = vg;
    ctx.fillRect(0, 0, W, H);
  }

  // ----------------------------------------------------------------
  // Render a full cover into ctx at W x H.
  // state: { title, subtitle, kicker, layout, grade, fillMode,
  //          singlePhoto, frames: [{photo, dx, dy, zoom} x9] }
  // pool: array of loaded Image elements.
  // ----------------------------------------------------------------
  function render(ctx, W, H, state, pool) {
    var grade = gradeById(state.grade);
    var geo = geometry(state.layout, W, H);
    ctx.fillStyle = '#f5f1e9';
    ctx.fillRect(0, 0, W, H);
    if (state.layout === 'filmstrip' && geo.filmBand) {
      drawFilmBand(ctx, geo.filmBand, geo.sheet);
    }
    for (var i = 0; i < geo.panels.length; i++) {
      var frame = state.frames[i] || { photo: i, dx: 0, dy: 0, zoom: 1 };
      var idx = state.fillMode === 'single'
        ? state.singlePhoto
        : (frame.photo == null ? i : frame.photo);
      var img = pool[((idx % pool.length) + pool.length) % pool.length];
      if (img) drawPanel(ctx, img, frame, geo.panels[i], grade, geo.sheet);
    }
    drawType(ctx, state, geo, W, H);
    finish(ctx, W, H);
  }

  return {
    GRADES: GRADES,
    LAYOUTS: LAYOUTS,
    gradeById: gradeById,
    geometry: geometry,
    render: render
  };
})();
