// Palm Coast Cover Studio — staged screenshot scenes.
//
// The screenshot harness opens the app with a ?shot= scene:
//   ?shot=cover   renders one cover, chrome hidden, exported through
//                 the app's own window.neonPalms.exportDataURL path
//   ?shot=editor  shows the full studio with the scene applied
//   ?shot=gallery shows the Cover Gallery wall: every genre cover
//                 the app exports, plus one cover at the post sizes
// Scene parameters (genre, layout, grade, title, subtitle, kicker,
// photo, size) are applied through the same state the editor uses,
// and window.__shotReady flips true only after fonts and sample
// photos have loaded and the staged scene has been painted.

(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  if (!params.has('shot')) return;

  var mode = params.get('shot');
  document.body.classList.add(mode === 'cover' ? 'shot-cover'
    : mode === 'gallery' ? 'shot-gallery' : 'shot-editor');

  function stage() {
    window.neonPalms.applyQuery(params);
    if (mode === 'gallery') window.neonPalms.showGallery();
    // Two frames: one for the render the query requested, one so the
    // compositor has presented it before the harness reads pixels.
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        window.__shotReady = true;
      });
    });
  }

  if (window.neonPalms && window.neonPalms.whenReady) {
    window.neonPalms.whenReady.then(stage);
  } else {
    window.addEventListener('load', stage);
  }
})();
