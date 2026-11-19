// Neon Palms Cover Studio — the photo store, v2.
// Holds every photo the cover can use: the ten painted sample scenes that
// ship with the app, plus any photo the person picks from their own
// machine. Files are read locally with object URLs and never uploaded.

export const SAMPLE_PHOTOS = [
  { id: 'boulevard', name: 'Boulevard at dusk', src: 'samples/boulevard.jpg' },
  { id: 'pier', name: 'The old pier', src: 'samples/pier.jpg' },
  { id: 'rooftop', name: 'Rooftop at sundown', src: 'samples/rooftop.jpg' },
  { id: 'neon-street', name: 'Neon street, wet', src: 'samples/neon-street.jpg' },
  { id: 'marina', name: 'Marina sunrise', src: 'samples/marina.jpg' },
  { id: 'downtown', name: 'Downtown night', src: 'samples/downtown.jpg' },
  { id: 'beach', name: 'Beach morning', src: 'samples/beach.jpg' },
  { id: 'highway', name: 'Highway at dusk', src: 'samples/highway.jpg' },
  { id: 'boardwalk', name: 'Boardwalk evening', src: 'samples/boardwalk.jpg' },
  { id: 'motel', name: 'Motel neon', src: 'samples/motel.jpg' },
];

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`could not load ${src}`));
    img.src = src;
  });
}

export class PhotoStore {
  constructor() {
    this.photos = [];
    this.byId = new Map();
    this.userCount = 0;
  }

  register(photo) {
    this.photos.push(photo);
    this.byId.set(photo.id, photo);
    return photo;
  }

  get(id) {
    return this.byId.get(id) || null;
  }

  async loadSamples() {
    for (const sample of SAMPLE_PHOTOS) {
      const img = await loadImage(sample.src);
      this.register({ id: sample.id, name: sample.name, img, thumb: sample.src, own: false });
    }
    return this.photos;
  }

  async addFile(file) {
    const url = URL.createObjectURL(file);
    const img = await loadImage(url);
    this.userCount += 1;
    const name = file.name.replace(/\.[a-z0-9]+$/i, '').slice(0, 26) || `My photo ${this.userCount}`;
    return this.register({ id: `user-${this.userCount}`, name, img, thumb: url, own: true });
  }

  ids() {
    return this.photos.map((p) => p.id);
  }
}
