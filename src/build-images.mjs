/* ==========================================================================
   Renders src/svg/*.svg to responsive WebP in public/img/.

   node src/build-images.mjs

   The site ships diagrams rather than stock photography: the reference pack
   this project is built from carried plumbing photographs, and reusing them
   would mean showing someone else's imagery on an AC site. Original SVG
   illustrations are sharp at any width, weigh a fraction of a photograph,
   and can be edited by anyone who can open a text file.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC = path.join(ROOT, 'src/svg');
const OUT = path.join(ROOT, 'public/img');

/* name -> widths to render. The largest width is also the fallback src. */
const TARGETS = {
  'hero-condenser': [1600, 960, 640],
  'unit-anatomy': [1200, 800],
  'airflow': [1200, 800],
  'thermostat': [900, 600],
  'gauges': [1200, 800],
  'coil-compare': [1200, 800],
  'houston-skyline': [1600, 960, 640],
};

fs.mkdirSync(OUT, { recursive: true });

let written = 0;
for (const [name, widths] of Object.entries(TARGETS)) {
  const file = path.join(SRC, `${name}.svg`);
  if (!fs.existsSync(file)) throw new Error(`missing source illustration: ${file}`);
  const svg = fs.readFileSync(file);

  for (const w of widths) {
    const dest = path.join(OUT, `${name}-${w}.webp`);
    await sharp(svg, { density: 192 })
      .resize({ width: w })
      .webp({ quality: 82, effort: 6 })
      .toFile(dest);
    written += 1;
  }
  console.log(`  ${name}: ${widths.join(', ')}`);
}

/* The hero and the favicon also ship as SVG so they stay crisp and the
   favicon costs nothing to load. */
for (const name of ['hero-condenser', 'houston-skyline']) {
  fs.copyFileSync(path.join(SRC, `${name}.svg`), path.join(OUT, `${name}.svg`));
}

console.log(`\n  rendered ${written} webp files -> public/img/\n`);
