[![make.fun · gta6-cover-art-01](https://make.fun/badge/gta6-cover-art-01.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![rank](https://make.fun/badge/gta6-cover-art-01/ixciamakima/gta6-cover-art/rank.svg)](https://make.fun/bounty/gta6-cover-art-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)
[![reward](https://make.fun/badge/gta6-cover-art-01/ixciamakima/gta6-cover-art/reward.svg)](https://make.fun/bounty/gta6-cover-art-01?utm_source=github&utm_medium=readme&utm_campaign=gta6-cover-art-01)

# Neon Palms Cover Studio

An offline web app that turns your photos and a caption into multi-panel
cover art in the neon-sunset poster style — ten poster layouts, seven
colour grades, bold display lettering with a script subtitle, and a
Vice-City-inspired colour grade — then exports a share-ready PNG.
Everything is original: the art, the lettering and the sample scenes
are made for this app, and no photo ever leaves your machine.

## Run it

```sh
node serve.ts
```

then open http://localhost:8080 in a desktop browser. There is no build
step and no network request: `app/` is plain static files and works from
any static file server.

## What it does

- **Ten layouts** — Cover Grid (nine panels over a halftone title band),
  Hero & Three, Full Bleed, Magazine Six, Tilted Snapshots, Story Duo,
  Poster One (one big scene above a tall title band), Diptych, Triptych
  and Billboard (a wide scene over a three-panel strip).
- **Seven colour grades** — Vice Sunset, Neon Night, Golden Hour, Chrome
  Dusk, Rose Mirage, Acid Vice and Ultraviolet, each a gradient map with
  an adjustable strength and an ink-band posterise slider for the
  printed-poster look.
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
- **Finish** — seeded film grain (identical on every export), a
  vignette, a light leak and a halftone print treatment, all adjustable.

The ten sample scenes in `app/samples/` are original synthetic
paintings made for this app — boulevard, pier, neon street, rooftop,
marina, downtown, beach, highway, boardwalk and motel — so a nine-panel
cover shows nine different vignettes and never repeats a scene.
Lettering uses Anton and Pacifico, both under the SIL Open Font License
— the fonts and their licence texts are in `app/fonts/`.

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
