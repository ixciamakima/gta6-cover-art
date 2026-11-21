// Palm Coast Cover Studio — editor wiring.
//
// Owns the studio state, binds every control in the sidebar, handles
// photo upload (file picker and drag-and-drop — files are read into
// memory only), per-panel reframing by dragging on the canvas, zoom
// by wheel or slider, and PNG export at the four post sizes.
//
// It also exposes the small window.neonPalms API the screenshot
// harness uses: exportDataURL(w, h) renders a cover offscreen at an
// exact size, and applyQuery() stages a scene from URL parameters.

(function () {
  'use strict';

  var SIZES = [
    { id: 'landscape', name: 'Landscape 16:9', w: 1920, h: 1080 },
    { id: 'portrait', name: 'Portrait 4:5', w: 1080, h: 1350 },
    { id: 'square', name: 'Square 1:1', w: 1080, h: 1080 },
    { id: 'story', name: 'Story 9:16', w: 1080, h: 1920 }
  ];

  var state = {
    title: 'Neon Palms',
    subtitle: 'palm coast stories',
    kicker: 'One summer · Two outlaws · No brakes',
    layout: 'blockbuster',
    grade: 'vice-sunset',
    fillMode: 'spread',
    singlePhoto: 0,
    sizeId: 'landscape',
    genreId: 'vice',
    frames: []
  };
  for (var f = 0; f < 9; f++) {
    state.frames.push({ photo: f, dx: 0, dy: 0, zoom: 1 });
  }

  var pool = [];        // loaded Image elements, samples or user photos
  var poolLabels = [];  // matching thumbnail captions
  var selectedPanel = 0;
  var canvas, ctx;
  var renderQueued = false;
  var readyResolve;
  var whenReady = new Promise(function (res) { readyResolve = res; });

  function $(id) { return document.getElementById(id); }

  function currentSize() {
    for (var i = 0; i < SIZES.length; i++) {
      if (SIZES[i].id === state.sizeId) return SIZES[i];
    }
    return SIZES[0];
  }

  function panelCount() {
    var size = currentSize();
    return window.PalmCover.geometry(state.layout, size.w, size.h).panels.length;
  }

  // --------------------------------------------------------------
  // Rendering
  // --------------------------------------------------------------
  function renderNow() {
    renderQueued = false;
    if (!pool.length) return;
    var size = currentSize();
    if (canvas.width !== size.w || canvas.height !== size.h) {
      canvas.width = size.w;
      canvas.height = size.h;
    }
    window.PalmCover.render(ctx, size.w, size.h, state, pool);
  }

  function requestRender() {
    if (renderQueued) return;
    renderQueued = true;
    requestAnimationFrame(renderNow);
  }

  function exportDataURL(w, h) {
    var off = document.createElement('canvas');
    off.width = w; off.height = h;
    window.PalmCover.render(off.getContext('2d'), w, h, state, pool);
    return off.toDataURL('image/png');
  }

  function exportPNG() {
    var size = currentSize();
    var url = exportDataURL(size.w, size.h);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'palm-coast-cover-' + size.w + 'x' + size.h + '.png';
    document.body.appendChild(a);
    a.click();
    a.remove();
  }

  // --------------------------------------------------------------
  // Control builders
  // --------------------------------------------------------------
  function buildThumbs() {
    var wrap = $('thumbs');
    wrap.innerHTML = '';
    pool.forEach(function (img, i) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'thumb';
      b.title = poolLabels[i] || ('Photo ' + (i + 1));
      var t = document.createElement('img');
      t.src = img.src;
      t.alt = b.title;
      b.appendChild(t);
      b.addEventListener('click', function () {
        if (state.fillMode === 'single') {
          state.singlePhoto = i;
        } else {
          state.frames[selectedPanel].photo = i;
        }
        markThumbs();
        requestRender();
      });
      wrap.appendChild(b);
    });
    markThumbs();
  }

  function markThumbs() {
    var active = state.fillMode === 'single'
      ? state.singlePhoto
      : state.frames[selectedPanel].photo;
    var nodes = $('thumbs').children;
    for (var i = 0; i < nodes.length; i++) {
      nodes[i].classList.toggle('active', i === active);
    }
  }

  function buildPanelBar() {
    var wrap = $('panelBar');
    wrap.innerHTML = '';
    var n = panelCount();
    if (selectedPanel >= n) selectedPanel = 0;
    for (var i = 0; i < n; i++) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = i === 0 ? 'Hero' : 'Panel ' + (i + 1);
      b.className = 'chip' + (i === selectedPanel ? ' active' : '');
      (function (idx) {
        b.addEventListener('click', function () {
          selectedPanel = idx;
          buildPanelBar();
          syncZoom();
          markThumbs();
        });
      })(i);
      wrap.appendChild(b);
    }
  }

  function buildChoices(wrapId, items, current, onPick) {
    var wrap = $(wrapId);
    wrap.innerHTML = '';
    items.forEach(function (item) {
      var b = document.createElement('button');
      b.type = 'button';
      b.textContent = item.name;
      b.className = 'choice' + (item.id === current ? ' active' : '');
      b.addEventListener('click', function () { onPick(item.id); });
      wrap.appendChild(b);
    });
  }

  function refreshChoices() {
    buildChoices('layoutChoices', window.PalmCover.LAYOUTS, state.layout,
      function (id) {
        state.layout = id;
        buildPanelBar();
        refreshChoices();
        requestRender();
      });
    buildChoices('gradeChoices', window.PalmCover.GRADES, state.grade,
      function (id) {
        state.grade = id;
        refreshChoices();
        requestRender();
      });
    buildChoices('sizeChoices', SIZES, state.sizeId,
      function (id) {
        state.sizeId = id;
        buildPanelBar();
        refreshChoices();
        requestRender();
      });
  }

  function syncZoom() {
    $('zoom').value = state.frames[selectedPanel].zoom;
  }

  // --------------------------------------------------------------
  // Genre gallery: one click lands a whole finished composition —
  // lettering, layout, grade, post size and a tuned frame for
  // every panel — in the editor, where it all stays editable.
  // --------------------------------------------------------------
  function applyGenre(id) {
    var genre = window.PalmGenres.genreById(id);
    var staged = window.PalmGenres.stateFor(genre);
    state.title = staged.title;
    state.subtitle = staged.subtitle;
    state.kicker = staged.kicker;
    state.layout = staged.layout;
    state.grade = staged.grade;
    state.fillMode = staged.fillMode;
    state.singlePhoto = staged.singlePhoto;
    state.sizeId = staged.sizeId;
    state.frames = staged.frames;
    state.genreId = genre.id;
    selectedPanel = 0;
    $('titleInput').value = state.title;
    $('subtitleInput').value = state.subtitle;
    $('kickerInput').value = state.kicker;
    document.querySelectorAll('[data-fill]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-fill') === state.fillMode);
    });
    buildGenres();
    buildPanelBar();
    refreshChoices();
    markThumbs();
    syncZoom();
    requestRender();
  }

  function buildGenres() {
    var wrap = $('genreChoices');
    if (!wrap) return;
    wrap.innerHTML = '';
    window.PalmGenres.GENRES.forEach(function (genre) {
      var b = document.createElement('button');
      b.type = 'button';
      b.className = 'genre-btn' + (genre.id === state.genreId ? ' active' : '');
      var name = document.createElement('span');
      name.className = 'genre-name';
      name.textContent = genre.name;
      var tag = document.createElement('span');
      tag.className = 'genre-tag';
      tag.textContent = genre.tag;
      b.appendChild(name);
      b.appendChild(tag);
      b.addEventListener('click', function () { applyGenre(genre.id); });
      wrap.appendChild(b);
    });
  }

  // --------------------------------------------------------------
  // The gallery wall: every genre cover rendered by the app's own
  // engine at portrait size, hung in a row, with the featured
  // cover shown again at the three post sizes beneath.
  // --------------------------------------------------------------
  function renderInto(canvas, w, h, genreState) {
    canvas.width = w;
    canvas.height = h;
    window.PalmCover.render(canvas.getContext('2d'), w, h, genreState, pool);
  }

  function wallFigure(genre, w, h, caption) {
    var fig = document.createElement('figure');
    fig.className = 'wall-item';
    var c = document.createElement('canvas');
    renderInto(c, w, h, window.PalmGenres.stateFor(genre));
    fig.appendChild(c);
    var cap = document.createElement('figcaption');
    cap.textContent = caption;
    fig.appendChild(cap);
    return fig;
  }

  function renderWall() {
    var row = $('wallRow');
    row.innerHTML = '';
    window.PalmGenres.GENRES.forEach(function (genre) {
      var fig = wallFigure(genre, 384, 480, genre.name + ' — ' + genre.tag);
      fig.addEventListener('click', function () {
        applyGenre(genre.id);
        hideGallery();
      });
      row.appendChild(fig);
    });
    var strip = $('sizeStrip');
    strip.innerHTML = '';
    var featured = window.PalmGenres.genreById(state.genreId);
    var featuredState = window.PalmGenres.stateFor(featured);
    SIZES.slice(0, 3).forEach(function (size) {
      var scale = 168 / size.h;
      // The same composition rendered at this post size's aspect:
      // the engine refits its panels and lettering to the canvas.
      var fig = wallFigure(featured, Math.round(size.w * scale), 168,
        featured.name + ' · ' + size.w + ' × ' + size.h);
      fig.classList.add('size-item');
      strip.appendChild(fig);
    });
  }

  function showGallery() {
    if (!pool.length) return;
    renderWall();
    $('galleryView').hidden = false;
    document.querySelector('.workspace').style.display = 'none';
    window.scrollTo(0, 0);
  }

  function hideGallery() {
    $('galleryView').hidden = true;
    document.querySelector('.workspace').style.display = '';
  }

  // --------------------------------------------------------------
  // Photo upload: picker + drag-and-drop. Files never leave the
  // machine; they are decoded in memory and become the new pool.
  // --------------------------------------------------------------
  function adoptUserPhotos(images, names) {
    pool = images;
    poolLabels = names;
    state.frames.forEach(function (fr, i) {
      fr.photo = i % pool.length;
      fr.dx = 0; fr.dy = 0; fr.zoom = 1;
    });
    state.singlePhoto = 0;
    selectedPanel = 0;
    buildThumbs();
    buildPanelBar();
    syncZoom();
    requestRender();
  }

  function readFiles(fileList) {
    var files = Array.prototype.slice.call(fileList || [])
      .filter(function (f) { return /^image\//.test(f.type); });
    if (!files.length) return;
    var jobs = files.map(function (f) {
      return new Promise(function (resolve) {
        var reader = new FileReader();
        reader.onload = function () {
          window.PalmPhotos.load(reader.result).then(function (img) {
            resolve({ img: img, name: f.name.replace(/\.[^.]+$/, '') });
          }, function () { resolve(null); });
        };
        reader.readAsDataURL(f);
      });
    });
    Promise.all(jobs).then(function (done) {
      var ok = done.filter(Boolean);
      if (ok.length) {
        adoptUserPhotos(ok.map(function (d) { return d.img; }),
                        ok.map(function (d) { return d.name; }));
      }
    });
  }

  // --------------------------------------------------------------
  // Canvas reframing: drag the selected panel, wheel to zoom.
  // --------------------------------------------------------------
  function bindCanvas() {
    var drag = null;
    function toCover(ev) {
      var r = canvas.getBoundingClientRect();
      return {
        x: (ev.clientX - r.left) * canvas.width / r.width,
        y: (ev.clientY - r.top) * canvas.height / r.height
      };
    }
    function panelAt(p) {
      var geo = window.PalmCover.geometry(state.layout, canvas.width, canvas.height);
      for (var i = 0; i < geo.panels.length; i++) {
        var r = geo.panels[i];
        if (p.x >= r.x && p.x <= r.x + r.w && p.y >= r.y && p.y <= r.y + r.h) return i;
      }
      return -1;
    }
    canvas.addEventListener('pointerdown', function (ev) {
      var p = toCover(ev);
      var idx = panelAt(p);
      if (idx < 0) return;
      if (idx !== selectedPanel) {
        selectedPanel = idx;
        buildPanelBar();
        syncZoom();
        markThumbs();
      }
      drag = { x: ev.clientX, y: ev.clientY };
      canvas.setPointerCapture(ev.pointerId);
    });
    canvas.addEventListener('pointermove', function (ev) {
      if (!drag) return;
      var r = canvas.getBoundingClientRect();
      var frame = state.frames[selectedPanel];
      var geo = window.PalmCover.geometry(state.layout, canvas.width, canvas.height);
      var rect = geo.panels[selectedPanel];
      var dxPx = (ev.clientX - drag.x) * canvas.width / r.width;
      var dyPx = (ev.clientY - drag.y) * canvas.height / r.height;
      frame.dx = Math.max(-1, Math.min(1, frame.dx + dxPx / Math.max(1, rect.w) * 1.6));
      frame.dy = Math.max(-1, Math.min(1, frame.dy + dyPx / Math.max(1, rect.h) * 1.6));
      drag = { x: ev.clientX, y: ev.clientY };
      requestRender();
    });
    canvas.addEventListener('pointerup', function () { drag = null; });
    canvas.addEventListener('wheel', function (ev) {
      ev.preventDefault();
      var frame = state.frames[selectedPanel];
      frame.zoom = Math.max(1, Math.min(2.6, frame.zoom * (ev.deltaY < 0 ? 1.06 : 0.94)));
      syncZoom();
      requestRender();
    }, { passive: false });
  }

  // --------------------------------------------------------------
  // Staging from URL parameters (screenshot harness).
  // --------------------------------------------------------------
  function applyQuery(params) {
    if (params.get('genre')) applyGenre(params.get('genre'));
    if (params.get('layout')) state.layout = params.get('layout');
    if (params.get('grade')) state.grade = params.get('grade');
    if (params.get('title')) state.title = params.get('title');
    if (params.get('subtitle')) state.subtitle = params.get('subtitle');
    if (params.get('kicker')) state.kicker = params.get('kicker');
    if (params.get('photo') === 'single') state.fillMode = 'single';
    var size = params.get('size');
    if (size) {
      for (var i = 0; i < SIZES.length; i++) {
        if (SIZES[i].w + 'x' + SIZES[i].h === size) state.sizeId = SIZES[i].id;
      }
    }
    $('titleInput').value = state.title;
    $('subtitleInput').value = state.subtitle;
    $('kickerInput').value = state.kicker;
    document.querySelectorAll('[data-fill]').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-fill') === state.fillMode);
    });
    buildPanelBar();
    refreshChoices();
    requestRender();
  }

  // --------------------------------------------------------------
  // Boot
  // --------------------------------------------------------------
  function init() {
    canvas = $('stage');
    ctx = canvas.getContext('2d');

    $('titleInput').addEventListener('input', function (e) {
      state.title = e.target.value; requestRender();
    });
    $('subtitleInput').addEventListener('input', function (e) {
      state.subtitle = e.target.value; requestRender();
    });
    $('kickerInput').addEventListener('input', function (e) {
      state.kicker = e.target.value; requestRender();
    });
    $('zoom').addEventListener('input', function (e) {
      state.frames[selectedPanel].zoom = parseFloat(e.target.value);
      requestRender();
    });
    $('resetFrame').addEventListener('click', function () {
      var fr = state.frames[selectedPanel];
      fr.dx = 0; fr.dy = 0; fr.zoom = 1;
      syncZoom();
      requestRender();
    });
    document.querySelectorAll('[data-fill]').forEach(function (b) {
      b.addEventListener('click', function () {
        state.fillMode = b.getAttribute('data-fill');
        document.querySelectorAll('[data-fill]').forEach(function (x) {
          x.classList.toggle('active', x === b);
        });
        markThumbs();
        requestRender();
      });
    });
    $('exportBtn').addEventListener('click', exportPNG);
    $('exportBtnTop').addEventListener('click', exportPNG);
    $('galleryBtnTop').addEventListener('click', showGallery);
    $('backToStudio').addEventListener('click', hideGallery);

    var drop = $('dropzone');
    var picker = $('filePicker');
    drop.addEventListener('click', function () { picker.click(); });
    picker.addEventListener('change', function () { readFiles(picker.files); });
    ['dragover', 'dragenter'].forEach(function (name) {
      drop.addEventListener(name, function (ev) {
        ev.preventDefault();
        drop.classList.add('over');
      });
    });
    ['dragleave', 'drop'].forEach(function (name) {
      drop.addEventListener(name, function (ev) {
        ev.preventDefault();
        drop.classList.remove('over');
      });
    });
    drop.addEventListener('drop', function (ev) {
      readFiles(ev.dataTransfer.files);
    });

    bindCanvas();
    buildGenres();
    buildPanelBar();
    refreshChoices();
    syncZoom();

    var fonts = Promise.all([
      document.fonts.load('90px Anton'),
      document.fonts.load('90px Pacifico')
    ]).catch(function () { return null; });
    Promise.all([fonts, window.PalmPhotos.loadSamples()]).then(function (res) {
      pool = res[1];
      poolLabels = window.PalmPhotos.SAMPLES.map(function (s) { return s.label; });
      buildThumbs();
      renderNow();
      readyResolve();
    });
  }

  window.neonPalms = {
    exportDataURL: exportDataURL,
    applyQuery: applyQuery,
    applyGenre: applyGenre,
    showGallery: showGallery,
    hideGallery: hideGallery,
    whenReady: whenReady,
    getState: function () { return state; }
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
