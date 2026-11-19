// Neon Palms Cover Studio — the hand-in program.
// Copies the finished app and its screenshots into the output directory
// and writes the dossier the judge reads, using the kit's own library so
// the bytes match the scorer's rebuild exactly. Node standard library
// only; runs offline in a few seconds.

import { cp, rm, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-app.ts';

// The bounty's own caps, as the gate states them: the dossier's text is
// capped at 160 KiB, screenshots at 4 files of 256 KiB, and app/ at 993
// files, 48 MiB in all, and 1,000 bytes a path.
const DOSSIER_CAPS = {
  text_max_bytes: 163_840,
  screenshots: { max: 4, max_bytes: 262_144 },
  app_max_files: 993,
  app_max_bytes: 50_331_648,
  app_path_max_bytes: 1_000,
};

async function main(): Promise<void> {
  const repoDir = dirname(fileURLToPath(import.meta.url));
  const outDir = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
  // Start from a clean slate so two runs write the same bytes.
  await rm(join(outDir, 'app'), { recursive: true, force: true });
  await rm(join(outDir, 'screenshots'), { recursive: true, force: true });
  await rm(join(outDir, 'dossier.json'), { force: true });
  await cp(join(repoDir, 'app'), join(outDir, 'app'), { recursive: true });
  await cp(join(repoDir, 'screenshots'), join(outDir, 'screenshots'), { recursive: true });
  const dossier = buildDossier(outDir, DOSSIER_CAPS);
  await writeFile(join(outDir, 'dossier.json'), dossier);
  console.log(`Neon Palms Cover Studio handed in: dossier.json ${dossier.byteLength} bytes -> ${outDir}`);
}

await main();
