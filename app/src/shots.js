// Palm Coast Cover Studio — staged screenshot scenes.
//
// The screenshot harness opens the app with a ?shot= scene:
//   ?shot=cover   renders one cover, chrome hidden, exported through
//                 the app's own window.neonPalms.exportDataURL path
//   ?shot=editor  shows the full studio with the scene applied
// Scene parameters (layout, grade, title, subtitle, kicker, photo,
// size) are applied through the same state the editor uses, and
// window.__shotReady flips true only after fonts and sample photos
// have loaded and the staged cover has been painted.

(function () {
  'use strict';

  var params = new URLSearchParams(window.location.search);
  if (!params.has('shot')) return;

  document.body.classList.add(params.get('shot') === 'cover' ? 'shot-cover' : 'shot-editor');

  function stage() {
    window.neonPalms.applyQuery(params);
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
