/* ==========================================================================
   Renders the source images to responsive WebP in public/img/.

   node src/build-images.mjs

   Two kinds of source live side by side. src/svg/ holds the labelled
   technical diagrams, which are vector and stay sharp at any width. src/img/
   holds the photography, which is raster and gets cropped to the exact shape
   of the slot it fills. A slot takes whichever it has.

   Every file name here carries a service term and a location or a
   descriptor, because the file name is the only thing that survives being
   crawled, indexed and served from a CDN path. "hero-condenser" told a
   crawler nothing; "ac-repair-near-me-houston" tells it what the image is
   and where it belongs.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SRC_SVG = path.join(ROOT, 'src/svg');
const SRC_IMG = path.join(ROOT, 'src/img');
const OUT = path.join(ROOT, 'public/img');

/* name -> the slot it fills.
   w and h are the shape of the slot, which is also the shape of the largest
   render and the width and height attributes emitted in the HTML, so the
   browser reserves the right space before the image arrives.
   widths are the responsive variants; every one is cropped to the same
   aspect ratio as the slot. */
const TARGETS = {
  'ac-repair-near-me-houston': {
    w: 1600, h: 900, widths: [1600, 960, 640], src: 'img',
  },
  'ac-repair-houston-residential-street': {
    w: 1600, h: 620, widths: [1600, 960, 640], src: 'img',
  },
  'emergency-ac-repair-thermostat': {
    w: 900, h: 900, widths: [900, 600], src: 'img',
  },
  'ac-repair-refrigerant-gauges': {
    w: 1200, h: 800, widths: [1200, 800], src: 'img',
  },
  'ac-repair-unit-anatomy': {
    w: 1200, h: 820, widths: [1200, 800], src: 'svg',
  },
  'ac-repair-airflow-diagram': {
    w: 1200, h: 800, widths: [1200, 800], src: 'svg',
  },
  'ac-repair-coil-comparison': {
    w: 1200, h: 700, widths: [1200, 800], src: 'svg',
  },
};

/* Social cards. Facebook, X and LinkedIn render JPEG and PNG in an og:image
   and quietly ignore SVG and WebP, which is why the card is a plain JPEG
   rather than another WebP. 1200 by 630 is the shape those platforms crop
   to.

   A photograph is cropped to fill the card, because there is nothing on it
   that a crop would spoil. A diagram is scaled to fit inside the card
   instead, because cropping to 1.91 to 1 cuts the top and bottom off a
   drawing that has labels in it. The padding around a diagram is filled
   with the drawing's own top-left pixel. Each drawing has a different
   background, light paper for the diagrams and a sky gradient for the two
   landscapes, so a fixed fill colour would show as a seam. Sampling the
   corner makes the padding invisible on all of them. */
const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

const sourceFor = (name, kind) => {
  const dir = kind === 'svg' ? SRC_SVG : SRC_IMG;
  const ext = kind === 'svg' ? 'svg' : 'jpg';
  const file = path.join(dir, `${name}.${ext}`);
  if (!fs.existsSync(file)) throw new Error(`missing source image: ${file}`);
  return file;
};

fs.mkdirSync(OUT, { recursive: true });

const written = new Set();
const write = (file) => { written.add(path.basename(file)); return file; };

for (const [name, t] of Object.entries(TARGETS)) {
  const file = sourceFor(name, t.src);
  const isSvg = t.src === 'svg';

  for (const w of t.widths) {
    const h = Math.round((w * t.h) / t.w);
    const dest = path.join(OUT, `${name}-${w}.webp`);
    let pipe;
    if (isSvg) {
      pipe = sharp(file, { density: 192 }).resize({ width: w });
    } else {
      pipe = sharp(file).resize({ width: w, height: h, fit: 'cover', position: 'centre' });
    }
    await pipe.webp({ quality: 82, effort: 6 }).toFile(dest);
    write(dest);
  }

  let ogPipe;
  if (isSvg) {
    const corner = await sharp(file, { density: 96 })
      .extract({ left: 0, top: 0, width: 1, height: 1 })
      .raw()
      .toBuffer();
    const bg = { r: corner[0], g: corner[1], b: corner[2] };
    ogPipe = sharp(file, { density: 192 })
      .resize(OG_WIDTH, OG_HEIGHT, { fit: 'contain', background: bg })
      .flatten({ background: bg });
  } else {
    ogPipe = sharp(file).resize(OG_WIDTH, OG_HEIGHT, { fit: 'cover', position: 'centre' });
  }
  const ogDest = path.join(OUT, `${name}-og.jpg`);
  await ogPipe.jpeg({ quality: 88, effort: 6 }).toFile(ogDest);
  write(ogDest);

  console.log(`  ${name}: ${t.widths.join(', ')} + og card  (${t.src})`);
}

/* Remove anything left over from a previous build. A renamed slot leaves its
   old renders behind, and a stale image on the server is a dead link that
   nothing in the build knows about. */
let removed = 0;
for (const f of fs.readdirSync(OUT)) {
  if (written.has(f)) continue;
  fs.unlinkSync(path.join(OUT, f));
  removed++;
}
if (removed) console.log(`\n  removed ${removed} stale file(s) from public/img/`);

console.log(`\n  rendered ${written.size} files -> public/img/\n`);
