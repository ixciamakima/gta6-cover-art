[![make.fun bounty](https://img.shields.io/badge/make.fun-Make%20GTA%206%20Cover%20Art-ff2e88)](https://make.fun/bounty/gta6-cover-art-01)
[![built for make.fun](https://img.shields.io/badge/built%20for-make.fun-7a2bff)](https://make.fun)
[![offline web app](https://img.shields.io/badge/app-100%25%20offline-12b5a5)](https://make.fun/bounty/gta6-cover-art-01)

# Neon Palms Cover Studio

An offline web app that turns your photos and a caption into multi-panel
cover art in the neon-sunset poster style — the nine-panel cover grid,
bold display lettering with a script subtitle, and a Vice-City-inspired
colour grade — then exports a share-ready PNG. Everything is original:
the art, the lettering and the sample scenes are made for this app, and
no photo ever leaves your machine.

## Run it

```sh
node serve.ts
```

then open http://localhost:8080 in a desktop browser. There is no build
step and no network request: `app/` is plain static files and works from
any static file server.

## What it does

- **Six layouts** — Cover Grid (nine panels over a halftone title band),
  Hero & Three, Full Bleed, Magazine Six, Tilted Snapshots, Story Duo.
- **Five colour grades** — Vice Sunset, Neon Night, Golden Hour, Chrome
  Dusk and Rose Mirage, each a gradient map with an adjustable strength
  and an ink-band posterise slider for the printed-poster look.
- **Any photo, every panel** — add your own photos (they are read
  locally, never uploaded), click a panel to select it, drag to position
  the photo inside it, scroll to zoom, double-click a photo to fill
  every panel with it.
- **Editable caption** — a display title with gradient fill and a heavy
  outline, a neon script subtitle, a kicker line, and a five-star heat
  meter.
- **One-click compose** — "Make my cover" deals your photos across the
  panels and sets the finish; undo and redo (Ctrl+Z / Ctrl+Y) cover
  every step.
- **Export** — one click writes a PNG at 1080 × 1080, 1080 × 1350,
  1920 × 1080 or 1080 × 1920.
- **Finish** — seeded film grain (identical on every export) and a
  vignette, both adjustable.

The four sample scenes in `app/samples/` are original synthetic
paintings made for this app. Lettering uses Anton and Pacifico, both
under the SIL Open Font License — the fonts and their licence texts are
in `app/fonts/`.

## Handing it in

`main.ts` is the entry program: it copies `app/` and `screenshots/` to
the output directory and writes `dossier.json` with the kit's
`buildDossier` from `vendor/makefun-app.ts`, byte for byte as the
scorer rebuilds it.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

## Layout of this repository

- `app/` — the web app (index.html, style.css, src/, samples/, fonts/)
- `screenshots/` — the exported covers and the editor, as handed in
- `shots.json` — the staged scenes those screenshots were captured from
- `main.ts` — the hand-in program; `serve.ts` — the local test server
- `vendor/makefun-app.ts` — the kit's dossier library, unchanged
