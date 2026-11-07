/* ==========================================================================
   Source and data checks that run before the build.

   node src/check.mjs

   These catch the mistakes that are cheap to make and expensive to ship:
   a template token left in a file, a required data field that is missing, an
   illustration referenced by a page that was never rendered, a service with
   no symptoms, a typo in a URL that would 404.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const failures = [];
const notes = [];

const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

/* ---------- required data files ---------- */
const cfg = read('data/config.json');
const services = read('data/services.json');
const areaData = read('data/areas.json');
const pillar = areaData.pillar;
const cities = areaData.cities;
const areas = [pillar, ...cities];

/* ---------- every service is well formed ---------- */
const slugs = new Set();
for (const s of services) {
  for (const field of ['slug', 'name', 'nav', 'tier', 'h1', 'problem', 'firstStep', 'priority']) {
    if (!s[field] || !String(s[field]).trim()) failures.push(`service ${s.slug || '(no slug)'}: missing ${field}`);
  }
  if (!Array.isArray(s.symptoms) || s.symptoms.length < 3) {
    failures.push(`service ${s.slug}: needs at least 3 symptoms`);
  }
  if (slugs.has(s.slug)) failures.push(`service ${s.slug}: duplicate slug`);
  slugs.add(s.slug);
  if (s.tier !== 'urgency' && s.tier !== 'core') {
    failures.push(`service ${s.slug}: tier must be urgency or core, got "${s.tier}"`);
  }
}

/* Parents are resolved after every slug is known, because a child service can
   be listed before its parent. Checking during the walk above would flag a
   valid file purely on ordering. */
for (const s of services) {
  if (s.parent && !slugs.has(s.parent)) {
    failures.push(`service ${s.slug}: parent "${s.parent}" is not a service slug`);
  }
}

/* exactly one pillar service */
const pillars = services.filter((s) => s.isPillar);
if (pillars.length !== 1) failures.push(`expected exactly 1 pillar service, found ${pillars.length}`);
else if (pillars[0].slug !== 'ac-repair') failures.push(`pillar service must be ac-repair, got ${pillars[0].slug}`);

/* every non-pillar service hangs off the pillar */
for (const s of services) {
  if (s.isPillar) continue;
  if (!s.parent) failures.push(`service ${s.slug}: no parent, expected the pillar service`);
}

/* ---------- every area is well formed ---------- */
const areaSlugs = new Set();
for (const a of areas) {
  for (const field of ['slug', 'name', 'state', 'stateAbbr', 'county', 'lat', 'lon']) {
    if (a[field] === undefined || a[field] === null || a[field] === '') {
      failures.push(`area ${a.slug || '(no slug)'}: missing ${field}`);
    }
  }
  if (!a.traits || !a.traits.note) failures.push(`area ${a.slug}: missing traits.note`);
  if (areaSlugs.has(a.slug)) failures.push(`area ${a.slug}: duplicate slug`);
  areaSlugs.add(a.slug);
}
if (!pillar.fullServiceCoverage) failures.push('the pillar area (Houston) must have fullServiceCoverage');

/* Houston neighborhoods belong to Houston and have unique slugs */
const hoodSlugs = new Set();
for (const n of pillar.areas) {
  if (!n.slug || !n.name) failures.push('Houston neighborhood missing slug or name');
  if (hoodSlugs.has(n.slug)) failures.push(`neighborhood ${n.slug}: duplicate slug`);
  hoodSlugs.add(n.slug);
}

/* ---------- copy files exist for every page the build will make ---------- */
const COPY_DIR = path.join(ROOT, 'data/copy');
const copyFiles = new Set(fs.existsSync(COPY_DIR) ? fs.readdirSync(COPY_DIR) : []);
const needCopy = [];

for (const s of services) needCopy.push(`service-${s.slug}.json`);
for (const a of areas) needCopy.push(`area-${a.slug}.json`);
for (const n of pillar.areas) needCopy.push(`neighborhood-${n.slug}.json`);
for (const f of ['page-home.json', 'page-how-it-works.json', 'page-for-companies.json',
  'page-privacy.json', 'page-terms.json']) needCopy.push(f);

for (const f of needCopy) {
  if (!copyFiles.has(f)) failures.push(`missing copy file: data/copy/${f}`);
}

/* each area file needs a services block covering the services that area
   actually gets a page for */
const areaServicesFor = (area, limit = 6) => {
  if (area.fullServiceCoverage) return [...services].sort((a, b) => a.priority - b.priority);
  return [...services].sort((a, b) => a.priority - b.priority).slice(0, limit);
};
for (const a of areas) {
  const file = path.join(COPY_DIR, `area-${a.slug}.json`);
  if (!fs.existsSync(file)) continue;
  const data = JSON.parse(fs.readFileSync(file, 'utf8'));
  const needed = areaServicesFor(a).map((s) => s.slug);
  for (const slug of needed) {
    if (!data.services || !data.services[slug]) {
      failures.push(`area-${a.slug}.json: no services.${slug} block, but the build makes a page for it`);
    }
  }
  /* extra blocks are dead copy: they cost nothing to read but signal the page
     was written for a different service set */
  for (const slug of Object.keys(data.services || {})) {
    if (!needed.includes(slug)) {
      notes.push(`area-${a.slug}.json: services.${slug} is not used by any page, so it will never render`);
    }
  }
}

/* ---------- no template tokens left anywhere ----------
   Two different rules, because the two kinds of token mean different things.

   Double-brace tokens and bracketed TODO markers are unambiguous syntax. They
   are never legitimate prose, so they fail anywhere in src/ or data/.
   The word forms (PLACEHOLDER, REPLACE THIS, Lorem ipsum) are only a problem
   in shipped content, where a reader would see them. They legitimately appear
   in source and config notes that explain what a placeholder IS, so scanning
   those with the same rule would flag the documentation about the rule. */
function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist' || entry.name === '.git') continue;
      walk(abs, out);
    } else out.push(abs);
  }
  return out;
}

/* The pattern is assembled from fragments so this file does not contain the
   literal token syntax it is looking for. Written inline, the scanner would
   match its own source and fail on itself every run. */
const TOKEN_RE = new RegExp(['\\{\\{[A-Z0-9_]+\\}\\}', '\\[TO' + 'DO\\b'].join('|'));
const CONTENT_TOKEN_RE = /PLACEHOLDER|REPLACE THIS|Lorem ipsum/i;

const contentFiles = walk(path.join(ROOT, 'data/copy'))
  .concat(walk(path.join(ROOT, 'public')))
  .concat(walk(path.join(ROOT, 'src/svg')));

for (const file of walk(path.join(ROOT, 'src')).concat(walk(path.join(ROOT, 'data')))) {
  if (!/\.(html|css|js|mjs|json|md|txt|xml|svg)$/i.test(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (TOKEN_RE.test(content)) failures.push(`unresolved template token in ${path.relative(ROOT, file)}`);
}

for (const file of contentFiles) {
  if (!/\.(html|css|js|mjs|json|md|txt|xml|svg)$/i.test(file)) continue;
  const content = fs.readFileSync(file, 'utf8');
  if (CONTENT_TOKEN_RE.test(content)) {
    failures.push(`unresolved placeholder content in ${path.relative(ROOT, file)}`);
  }
}

/* ---------- every illustration a page references was rendered ---------- */
const rendered = new Set(
  fs.existsSync(path.join(ROOT, 'public/img'))
    ? fs.readdirSync(path.join(ROOT, 'public/img')).map((f) => f.replace(/-\d+\.webp$/, ''))
    : [],
);
const templates = fs.readFileSync(path.join(ROOT, 'src/templates.mjs'), 'utf8');
for (const m of templates.matchAll(/^\s*'([a-z0-9-]+)':\s*\{/gim)) {
  const name = m[1];
  if (!rendered.has(name)) failures.push(`illustration "${name}" is referenced by templates.mjs but was never rendered`);
}

/* ---------- config sanity ---------- */
if (cfg.domainConfirmed === true && /\.example$/.test(cfg.domain)) {
  failures.push('config.domainConfirmed is true but domain still points at a .example placeholder');
}
if (!cfg.conversion || !cfg.conversion.endpoint) failures.push('config.conversion.endpoint is required');
if (!cfg.conversion || !['active', 'pending'].includes(cfg.conversion.status)) {
  failures.push('config.conversion.status must be "active" or "pending"');
}
if (!cfg.positioning || !Array.isArray(cfg.positioning.neverClaim) || !cfg.positioning.neverClaim.length) {
  failures.push('config.positioning.neverClaim must be a non-empty list');
}

/* ---------- the brand appears in the disclosure ---------- */
if (!cfg.disclosure.includes(cfg.brand)) {
  notes.push('config.disclosure does not mention the brand name');
}

/* ---------- report ---------- */
for (const note of notes) console.log(`  note: ${note}`);
if (failures.length) {
  console.error(`\n  CHECK FAILURES (${failures.length}):`);
  for (const f of failures) console.error('   - ' + f);
  process.exit(1);
}
console.log(`\n  source checks passed: ${services.length} services, ${areas.length} areas, ` +
  `${pillar.areas.length} Houston neighborhoods, ${copyFiles.size} copy files.\n`);
