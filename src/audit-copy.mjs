/* ==========================================================================
   Duplicate-content audit for data/copy/.

   Why this exists
   This site generates a large set of location pages from per-area JSON. The
   failure mode is one page with the city name swapped, dozens of times, which
   Google reads as a doorway network and deindexes the lot. So the prose is
   written per area, and the build refuses to ship if two pages come out too
   similar.

   What it does
     1. Loads every data/copy/area-*.json, service-*.json and neighborhood-*.json.
     2. Builds the full prose string for each page that file produces:
          - area page        = intro + localAngle + commonCalls + landmarks + faqs
          - area x service   = intro + localNote + faqs   (one per service slug)
          - service page     = intro + whatHappens + howPriced + faqs
          - neighborhood     = intro + localAngle + commonCalls + landmarks + faqs
     3. Computes 8-gram shingle Jaccard similarity between every pair of
        SAME-TYPE pages (area vs area; ac-repair vs ac-repair; ...).
        Cross-type pairs are not compared, they are supposed to differ.
     4. Reports every pair over the threshold, worst first, with both file
        names, the score, and the longest verbatim shared run of words.
     5. Reports per-file rule violations: missing or empty required field, em
        dash, dollar figure, banned first-person-contractor phrase.

   node src/audit-copy.mjs [copy_dir] [--self-test]
   Exit code is 1 if anything is over threshold or any violation is found.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

let COPY_DIR = path.join(ROOT, 'data/copy');
for (const arg of process.argv.slice(2)) {
  if (!arg.startsWith('-')) COPY_DIR = path.resolve(arg);
}

const SHINGLE_N = 8;
const THRESHOLD = 0.15;
const WATCH_FLOOR = 0.10; // informational only: pairs trending toward the threshold

const AREA_REQUIRED = ['intro', 'localAngle', 'commonCalls', 'landmarks', 'faqs'];
const SERVICE_REQUIRED = ['intro', 'whatHappens', 'howPriced', 'faqs'];
const AREA_SERVICE_REQUIRED = ['intro', 'localNote', 'faqs'];
const NEIGHBORHOOD_REQUIRED = ['h1', 'title', 'description', 'intro', 'localAngle', 'commonCalls', 'landmarks', 'faqs'];

const BANNED_PHRASES = [
  'our technicians',
  'our techs',
  'our team',
  'our trucks',
  'our crew',
  'our installers',
  'we are licensed',
  'we are certified',
  'we are bonded',
  'we arrive',
];

/* Word-boundary matched, NOT substring matched. Plain `"our techs" in text`
   fires on the legitimate question "Do HVAC techs in Houston charge more?",
   which is a false accusation of a positioning breach. */
const BANNED_RE = BANNED_PHRASES.map((p) => ({
  phrase: p,
  rx: new RegExp('\\b' + p.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/ /g, '\\s+') + '\\b', 'i'),
}));

const EM_DASH_RE = /—|&mdash;/;
const DOLLAR_RE = /\$\s*\d/;
const WORD_RE = /[a-z0-9']+/g;

/* ------------------------------------------------------------- utilities ---- */

function normApostrophes(text) {
  return text.replace(/[‘’]/g, "'");
}

function tokenize(text) {
  const lowered = normApostrophes(text).toLowerCase();
  const tokens = [];
  const spans = [];
  const re = new RegExp(WORD_RE.source, 'g');
  let m;
  while ((m = re.exec(lowered)) !== null) {
    tokens.push(m[0]);
    spans.push([m.index, m.index + m[0].length]);
  }
  return { tokens, spans };
}

function shingles(tokens, n = SHINGLE_N) {
  const out = new Set();
  for (let i = 0; i <= tokens.length - n; i += 1) {
    out.add(tokens.slice(i, i + n).join(' '));
  }
  return out;
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const x of a) if (b.has(x)) inter += 1;
  return inter / (a.size + b.size - inter);
}

function longestSharedRun(tokensA, spansA, rawA, tokensB) {
  /* Longest contiguous run of words present in both token lists.
     Binary search on run length over hash sets of n-gram tuples, so it stays
     O(n log n) rather than an O(n*m) dynamic program. Only called for pairs
     already over the threshold. */
  if (!tokensA.length || !tokensB.length) return '';
  let lo = 1;
  let hi = Math.min(tokensA.length, tokensB.length);
  let best = 0;
  let bestIdx = -1;
  while (lo <= hi) {
    const mid = Math.floor((lo + hi) / 2);
    const gramsB = new Set();
    for (let i = 0; i <= tokensB.length - mid; i += 1) {
      gramsB.add(tokensB.slice(i, i + mid).join(' '));
    }
    let found = -1;
    for (let i = 0; i <= tokensA.length - mid; i += 1) {
      if (gramsB.has(tokensA.slice(i, i + mid).join(' '))) {
        found = i;
        break;
      }
    }
    if (found >= 0) {
      best = mid;
      bestIdx = found;
      lo = mid + 1;
    } else {
      hi = mid - 1;
    }
  }
  if (bestIdx < 0 || best === 0) return '';
  const start = spansA[bestIdx][0];
  const end = spansA[bestIdx + best - 1][1];
  return rawA.slice(start, end).replace(/\s+/g, ' ').trim();
}

function faqText(faqs) {
  if (!Array.isArray(faqs)) return '';
  return faqs
    .map((f) => (typeof f === 'object' && f !== null ? `${f.q || ''} ${f.a || ''}` : String(f)))
    .join(' ');
}

function joined(value) {
  if (Array.isArray(value)) return value.join(' ');
  if (value === null || value === undefined) return '';
  return String(value);
}

function isEmpty(value) {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim() === '';
  if (Array.isArray(value) || typeof value === 'object') return Object.keys(value).length === 0;
  return false;
}

function* flatStrings(node, prefix = '') {
  if (Array.isArray(node)) {
    for (let i = 0; i < node.length; i += 1) yield* flatStrings(node[i], `${prefix}[${i}]`);
  } else if (node && typeof node === 'object') {
    for (const [k, v] of Object.entries(node)) yield* flatStrings(v, prefix ? `${prefix}.${k}` : String(k));
  } else if (typeof node === 'string') {
    yield prefix, node;
  }
}

function excerpt(text, re, pad = 40) {
  const m = text.match(re);
  if (!m) return text.slice(0, 80);
  const start = Math.max(0, m.index - pad);
  const end = Math.min(text.length, m.index + m[0].length + pad);
  return text.slice(start, end).replace(/\s+/g, ' ');
}

/* ------------------------------------------------------------------ load ---- */

class Page {
  constructor(pid, file, kind, text) {
    this.pid = pid;
    this.file = file;
    this.kind = kind;
    this.text = text;
    const { tokens, spans } = tokenize(text);
    this.tokens = tokens;
    this.spans = spans;
    this.shingles = shingles(tokens);
  }
}

function loadPages() {
  const pages = [];
  const violations = [];
  const counts = { area: 0, service: 0, neighborhood: 0 };

  const files = fs.existsSync(COPY_DIR) ? fs.readdirSync(COPY_DIR) : [];
  const jsonFiles = files.filter((f) => f.endsWith('.json')).sort();

  for (const name of jsonFiles) {
    const full = path.join(COPY_DIR, name);
    let data;
    try {
      data = JSON.parse(fs.readFileSync(full, 'utf8'));
    } catch (e) {
      violations.push([name, `unreadable JSON: ${e.message}`]);
      continue;
    }

    const raw = JSON.stringify(data);

    /* per-file content rules */
    for (const [field, val] of flatStrings(data)) {
      if (EM_DASH_RE.test(val)) {
        violations.push([name, `em dash in \`${field}\`: ...${excerpt(val, EM_DASH_RE)}...`]);
      }
      if (DOLLAR_RE.test(val)) {
        violations.push([name, `dollar figure in \`${field}\`: ...${excerpt(val, DOLLAR_RE)}...`]);
      }
      const clean = normApostrophes(val);
      for (const { phrase, rx } of BANNED_RE) {
        if (rx.test(clean)) {
          violations.push([name, `banned first-person-contractor phrase "${phrase}" in \`${field}\`: ...${excerpt(clean, rx)}...`]);
        }
      }
    }

    const isArea = name.startsWith('area-');
    const isService = name.startsWith('service-');
    const isNeighborhood = name.startsWith('neighborhood-');

    if (isArea) {
      counts.area += 1;
      for (const field of AREA_REQUIRED) {
        if (!(field in data)) violations.push([name, `missing required field \`${field}\``]);
        else if (isEmpty(data[field])) violations.push([name, `required field \`${field}\` is empty`]);
      }
      const slug = name.slice('area-'.length, -'.json'.length);
      pages.push(new Page(
        slug, name, 'area',
        [joined(data.intro), joined(data.localAngle), joined(data.commonCalls),
         joined(data.landmarks), faqText(data.faqs)].join(' '),
      ));

      const services = data.services;
      if (services && typeof services === 'object') {
        for (const [svcSlug, svc] of Object.entries(services)) {
          if (!svc || typeof svc !== 'object') {
            violations.push([name, `services.${svcSlug} is not an object`]);
            continue;
          }
          for (const field of AREA_SERVICE_REQUIRED) {
            if (!(field in svc)) violations.push([name, `missing required field \`services.${svcSlug}.${field}\``]);
            else if (isEmpty(svc[field])) violations.push([name, `required field \`services.${svcSlug}.${field}\` is empty`]);
          }
          pages.push(new Page(
            `${slug} / ${svcSlug}`, name, `area-service:${svcSlug}`,
            [joined(svc.intro), joined(svc.localNote), faqText(svc.faqs)].join(' '),
          ));
        }
      }
    } else if (isService) {
      counts.service += 1;
      for (const field of SERVICE_REQUIRED) {
        if (!(field in data)) violations.push([name, `missing required field \`${field}\``]);
        else if (isEmpty(data[field])) violations.push([name, `required field \`${field}\` is empty`]);
      }
      const slug = name.slice('service-'.length, -'.json'.length);
      pages.push(new Page(
        slug, name, 'service',
        [joined(data.intro), joined(data.whatHappens), joined(data.howPriced), faqText(data.faqs)].join(' '),
      ));
    } else if (isNeighborhood) {
      counts.neighborhood += 1;
      for (const field of NEIGHBORHOOD_REQUIRED) {
        if (!(field in data)) violations.push([name, `missing required field \`${field}\``]);
        else if (isEmpty(data[field])) violations.push([name, `required field \`${field}\` is empty`]);
      }
      const slug = name.slice('neighborhood-'.length, -'.json'.length);
      pages.push(new Page(
        slug, name, 'neighborhood',
        [joined(data.intro), joined(data.localAngle), joined(data.commonCalls),
         joined(data.landmarks), faqText(data.faqs)].join(' '),
      ));
    }
  }

  return { pages, violations, counts, fileCount: jsonFiles.length };
}

/* ----------------------------------------------------------------- audit ---- */

function compare(pages) {
  const byKind = new Map();
  for (const p of pages) {
    if (!byKind.has(p.kind)) byKind.set(p.kind, []);
    byKind.get(p.kind).push(p);
  }

  const results = [];
  const near = [];
  let compared = 0;

  for (const [, group] of [...byKind.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    for (let i = 0; i < group.length; i += 1) {
      for (let j = i + 1; j < group.length; j += 1) {
        const a = group[i];
        const b = group[j];
        compared += 1;
        const score = jaccard(a.shingles, b.shingles);
        const row = { kind: a.kind, a, b, score };
        if (score > THRESHOLD) results.push(row);
        else if (score >= WATCH_FLOOR) near.push(row);
      }
    }
  }

  results.sort((a, b) => b.score - a.score);
  near.sort((a, b) => b.score - a.score);
  for (const r of results) {
    r.run = longestSharedRun(r.a.tokens, r.a.spans, r.a.text, r.b.tokens);
  }
  return { results, near: near.slice(0, 10), compared };
}

function selfTest() {
  /* Proves the detector actually fires. An audit that silently stops
     detecting is worse than no audit at all, so this is checkable on demand. */
  const fails = [];
  /* Arrays are compared by value, not by reference. A `got === want` on two
     arrays that print identically always fails, which is a confusing way to
     learn that. */
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  const check = (label, got, want) => {
    const ok = same(got, want);
    console.log(`  [${ok ? 'ok' : 'FAIL'}] ${label}: got ${got} want ${want}`);
    if (!ok) fails.push(label);
  };

  const a = 'the quick brown fox jumps over the lazy dog near the river bank today';
  const ta = tokenize(a);
  check('identical text scores 1.0', jaccard(shingles(ta.tokens), shingles(ta.tokens)).toFixed(3), '1.000');

  const b = 'a completely different sentence about air conditioning in another town entirely';
  const tb = tokenize(b);
  check('disjoint text scores 0.0', jaccard(shingles(ta.tokens), shingles(tb.tokens)), 0);

  const x = 'the outdoor unit is packed with cottonwood and the tech cameras the coil to find the break';
  const y = 'in winter the tech cameras the coil to find the break before digging';
  const tx = tokenize(x);
  const ty = tokenize(y);
  check(
    'longest shared run found',
    longestSharedRun(tx.tokens, tx.spans, x, ty.tokens),
    'the tech cameras the coil to find the break',
  );
  check('overlap scores above 0', jaccard(shingles(tx.tokens), shingles(ty.tokens)) > 0, true);

  const lv = 'Do HVAC techs in Houston charge more?';
  const hits = BANNED_RE.filter(({ rx }) => rx.test(lv)).map(({ phrase }) => phrase);
  check('"HVAC techs in Houston" is NOT a banned-phrase hit', hits.length, 0);

  const real = 'Our technicians arrive in our trucks and we are licensed statewide.';
  const hits2 = BANNED_RE.filter(({ rx }) => rx.test(real)).map(({ phrase }) => phrase).sort();
  check('real breaches still caught', hits2, ['our technicians', 'our trucks', 'we are licensed']);

  check('dollar figure detected', DOLLAR_RE.test('about $95 flat'), true);
  check('no false dollar hit', DOLLAR_RE.test('costs vary by access'), false);
  check('em dash detected', EM_DASH_RE.test('fast — and clean'), true);
  check('hyphen is not an em dash', EM_DASH_RE.test('same-day service'), false);

  console.log();
  console.log('SELF-TEST:', fails.length ? `FAIL (${fails.length})` : 'PASS');
  return fails.length ? 1 : 0;
}

/* ------------------------------------------------------------------ main ---- */

function main() {
  const { pages, violations, counts, fileCount } = loadPages();
  const { results, near, compared } = compare(pages);

  console.log('='.repeat(78));
  console.log('DUPLICATE-CONTENT AUDIT  ', COPY_DIR);
  console.log(
    `${fileCount} copy files -> ${pages.length} pages | ` +
    `${counts.area} area, ${counts.service} service, ${counts.neighborhood} neighborhood | ` +
    `${SHINGLE_N}-gram shingles | Jaccard threshold ${THRESHOLD} | ${compared} same-type pairs compared`,
  );
  console.log('='.repeat(78));

  console.log();
  console.log(`--- PAIRS OVER ${THRESHOLD} (${results.length}) ` + '-'.repeat(40));
  if (!results.length) {
    console.log(`none. no same-type pair shares more than ${(THRESHOLD * 100).toFixed(0)}% of its 8-gram shingles.`);
  }
  results.forEach((r, i) => {
    console.log();
    console.log(`${String(i + 1).padStart(3)}. ${r.score.toFixed(3)}   [${r.kind}]`);
    console.log(`     A: ${r.a.file}   (${r.a.pid})`);
    console.log(`     B: ${r.b.file}   (${r.b.pid})`);
    const words = r.run ? r.run.split(' ').length : 0;
    console.log(`     longest verbatim shared run (${words} words):`);
    console.log(`       "${r.run}"`);
  });

  console.log();
  console.log(`--- NEAR MISSES ${WATCH_FLOOR} to ${THRESHOLD} (informational, top ${near.length}) ` + '-'.repeat(10));
  if (!near.length) console.log('none.');
  for (const r of near) {
    console.log(`     ${r.score.toFixed(3)}  [${r.kind}]  ${r.a.pid}  vs  ${r.b.pid}`);
  }

  console.log();
  console.log(`--- RULE VIOLATIONS (${violations.length}) ` + '-'.repeat(44));
  if (!violations.length) {
    console.log('none. every file has all required fields, no em dash, no dollar figure,');
    console.log('and no first-person-contractor phrasing.');
  } else {
    let current = null;
    for (const [file, issue] of violations) {
      if (file !== current) {
        console.log(`\n  ${file}`);
        current = file;
      }
      console.log(`    - ${issue}`);
    }
  }

  console.log();
  console.log('='.repeat(78));
  const ok = !results.length && !violations.length;
  console.log('VERDICT:', ok ? 'CLEAN' : 'NEEDS-REWRITE');
  console.log('='.repeat(78));
  return ok ? 0 : 1;
}

if (process.argv.includes('--self-test')) {
  process.exit(selfTest());
}
process.exit(main());
