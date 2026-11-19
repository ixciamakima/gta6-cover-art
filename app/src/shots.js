// Neon Palms Cover Studio — screenshot scenes.
// The app can be opened with a ?shot= query that stages a deterministic
// scene: ?shot=editor shows the editor with a composed cover loaded, and
// ?shot=cover&size=1920x1080 fills the window with one exported cover.
// The maker's capture script drives these scenes; people never need them.

export function parseShotQuery(search) {
  const q = new URLSearchParams(search || '');
  const mode = q.get('shot');
  if (!mode) return null;
  const shot = { mode };
  for (const key of ['photo', 'layout', 'grade', 'title', 'subtitle', 'size', 'halftone', 'leak', 'hero']) {
    if (q.has(key)) shot[key] = q.get(key);
  }
  return shot;
}

// Fold a shot scene into the editor state. `photo` names a sample photo:
// it fills every panel, unless photo=spread deals the samples in order.
export function applyShotToState(state, shot, sampleIds) {
  if (!shot) return state;
  if (shot.layout) state.layout = shot.layout;
  if (shot.grade) state.grade = shot.grade;
  if (shot.title) state.title = shot.title;
  if (shot.subtitle) state.subtitle = shot.subtitle;
  if (shot.size) {
    const known = ['square', 'portrait', 'wide', 'story'];
    if (known.includes(shot.size)) state.size = shot.size;
  }
  if (shot.photo === 'spread') {
    state.panels = state.panels.map((p, i) => ({ ...p, photo: sampleIds[i % sampleIds.length] }));
  } else if (shot.photo && sampleIds.includes(shot.photo)) {
    state.panels = state.panels.map((p) => ({ ...p, photo: shot.photo }));
  }
  if (shot.hero && sampleIds.includes(shot.hero)) {
    state.panels = state.panels.map((p, i) => (i === 0 ? { ...p, photo: shot.hero } : p));
  }
  if (shot.halftone === '1') state.halftone = 1;
  if (shot.leak !== undefined && shot.leak !== '') {
    const v = Number(shot.leak);
    if (Number.isFinite(v)) state.leak = Math.max(0, Math.min(1, v));
  }
  return state;
}
