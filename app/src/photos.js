// Palm Coast Cover Studio — photo registry.
//
// The studio ships with eight photographic sample scenes, shot on a
// fictional palm-lined coast: a duo at a turquoise classic car, a pink
// convertible under a deco beachfront, a rain-wet neon downtown, a
// marina at sunrise, a causeway at dusk, a boardwalk at golden hour,
// a neon motel and a rooftop pool. They are plain JPEG files beside
// the app, so the studio works fully offline.
//
// User photos are handled by main.js; they are read with FileReader
// into in-memory images and never leave the machine.

window.PalmPhotos = (function () {
  'use strict';

  var SAMPLES = [
    { id: 'duo', src: 'samples/duo.jpg', label: 'The Duo' },
    { id: 'hero-beach', src: 'samples/hero-beach.jpg', label: 'Deco Beach' },
    { id: 'downtown-night', src: 'samples/downtown-night.jpg', label: 'Neon Downtown' },
    { id: 'marina', src: 'samples/marina.jpg', label: 'Marina Sunrise' },
    { id: 'highway', src: 'samples/highway.jpg', label: 'Causeway Dusk' },
    { id: 'boardwalk', src: 'samples/boardwalk.jpg', label: 'Boardwalk' },
    { id: 'motel', src: 'samples/motel.jpg', label: 'Motel Neon' },
    { id: 'rooftop', src: 'samples/rooftop.jpg', label: 'Rooftop Pool' }
  ];

  // Load one image element from a URL or data URL. Resolves with the
  // element once it can be drawn to a canvas.
  function load(src) {
    return new Promise(function (resolve, reject) {
      var img = new Image();
      img.onload = function () { resolve(img); };
      img.onerror = function () { reject(new Error('could not load ' + src)); };
      img.src = src;
    });
  }

  // Load every bundled sample, in registry order.
  function loadSamples() {
    return Promise.all(SAMPLES.map(function (s) { return load(s.src); }));
  }

  return { SAMPLES: SAMPLES, load: load, loadSamples: loadSamples };
})();
