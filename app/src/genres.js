// Palm Coast Cover Studio — genre cover gallery.
//
// Six finished covers, one click each. A genre is a whole
// composition, not a filter: its own layout, film grade, lettering
// and a tuned frame (photo, pan and zoom) for every panel, staged
// from the studio's eight sample scenes. Picking one in the sidebar
// lands the complete cover in the editor, where every piece of it —
// panels, caption, grade, size — stays editable, and the Cover
// Gallery view hangs all six on one wall beside the three post
// sizes, so the range of the studio reads at a glance.
//
// Photo indices name the sample registry in src/photos.js:
//   0 The Duo · 1 Deco Beach · 2 Neon Downtown · 3 Marina Sunrise
//   4 Causeway Dusk · 5 Boardwalk · 6 Motel Neon · 7 Rooftop Pool

window.PalmGenres = (function () {
  'use strict';

  var GENRES = [
    { id: 'vice', name: 'Vice Classic', tag: 'The signature poster',
      title: 'Neon Palms', subtitle: 'palm coast stories',
      kicker: 'One summer · Two outlaws · No brakes',
      layout: 'blockbuster', grade: 'vice-sunset', sizeId: 'landscape',
      frames: [
        { photo: 0, dx: 0, dy: 0, zoom: 1.08 },
        { photo: 1, dx: 0, dy: 0, zoom: 1.05 },
        { photo: 2, dx: 0, dy: 0, zoom: 1.10 },
        { photo: 5, dx: 0, dy: 0, zoom: 1.05 }
      ] },
    { id: 'noir', name: 'Noir Detective', tag: 'Ink, smoke and alibis',
      title: 'Midnight Ledger', subtitle: 'a palm coast noir',
      kicker: 'One detective · One city · No alibis',
      layout: 'split-hero', grade: 'noir-ink', sizeId: 'portrait',
      frames: [
        { photo: 2, dx: 0, dy: 0, zoom: 1.22 },
        { photo: 7, dx: 0, dy: -0.1, zoom: 1.12 },
        { photo: 6, dx: 0, dy: 0, zoom: 1.15 }
      ] },
    { id: 'romance', name: 'Romance', tag: 'Golden hour, twice told',
      title: 'Tides of Us', subtitle: 'a love story, twice told',
      kicker: 'One summer · Two hearts · One promise',
      layout: 'triptych', grade: 'romance-blush', sizeId: 'portrait',
      frames: [
        { photo: 5, dx: 0, dy: 0, zoom: 1.06 },
        { photo: 1, dx: 0, dy: 0, zoom: 1.04 },
        { photo: 0, dx: 0, dy: 0, zoom: 1.10 }
      ] },
    { id: 'scifi', name: 'Sci-Fi Pulp', tag: 'It came from the neon sea',
      title: 'Starfall Coast', subtitle: 'they came from the neon sea',
      kicker: 'One signal · One landing · No return',
      layout: 'nine-grid', grade: 'rocket-pop', sizeId: 'square',
      frames: [
        { photo: 3, dx: 0, dy: 0, zoom: 1.15 },
        { photo: 2, dx: 0, dy: 0, zoom: 1.10 },
        { photo: 4, dx: 0, dy: 0, zoom: 1.08 },
        { photo: 7, dx: 0, dy: 0, zoom: 1.12 },
        { photo: 0, dx: 0, dy: 0, zoom: 1.05 },
        { photo: 6, dx: 0, dy: 0, zoom: 1.10 },
        { photo: 1, dx: 0, dy: 0, zoom: 1.05 },
        { photo: 5, dx: 0, dy: 0, zoom: 1.08 },
        { photo: 2, dx: 0, dy: 0.1, zoom: 1.25 }
      ] },
    { id: 'western', name: 'Western', tag: 'Salt, dust and one road out',
      title: 'The Last Ferry West', subtitle: 'a frontier tale in salt and dust',
      kicker: 'One rider · One road · No mercy',
      layout: 'billboard', grade: 'dust-western', sizeId: 'landscape',
      frames: [
        { photo: 4, dx: 0, dy: 0, zoom: 1.10 },
        { photo: 5, dx: 0, dy: 0, zoom: 1.05 },
        { photo: 6, dx: 0, dy: 0, zoom: 1.08 },
        { photo: 3, dx: 0, dy: 0, zoom: 1.05 }
      ] },
    { id: 'horror', name: 'Horror', tag: 'Check in · never check out',
      title: 'The Motel Never Sleeps', subtitle: 'check in · never check out',
      kicker: 'One night · One room · No vacancy',
      layout: 'manga', grade: 'midnight-horror', sizeId: 'square',
      frames: [
        { photo: 6, dx: 0, dy: 0, zoom: 1.18 },
        { photo: 2, dx: 0, dy: 0, zoom: 1.20 },
        { photo: 7, dx: 0, dy: 0, zoom: 1.12 },
        { photo: 4, dx: 0, dy: 0.05, zoom: 1.10 }
      ] }
  ];

  function genreById(id) {
    for (var i = 0; i < GENRES.length; i++) {
      if (GENRES[i].id === id) return GENRES[i];
    }
    return GENRES[0];
  }

  // A fresh editor state for one genre: its lettering, layout,
  // grade and post size, with a deep copy of its tuned frames laid
  // over the studio's nine frame slots.
  function stateFor(genre) {
    var frames = [];
    for (var i = 0; i < 9; i++) {
      var f = genre.frames[Math.min(i, genre.frames.length - 1)];
      frames.push({ photo: f.photo, dx: f.dx, dy: f.dy, zoom: f.zoom });
    }
    return {
      title: genre.title,
      subtitle: genre.subtitle,
      kicker: genre.kicker,
      layout: genre.layout,
      grade: genre.grade,
      fillMode: 'spread',
      singlePhoto: 0,
      sizeId: genre.sizeId,
      frames: frames
    };
  }

  return { GENRES: GENRES, genreById: genreById, stateFor: stateFor };
})();
