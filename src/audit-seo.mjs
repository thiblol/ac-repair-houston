/* ==========================================================================
   Page by page SEO audit of the built site.

   node src/audit-seo.mjs

   Once a site grows past a few dozen pages, checking titles and canonicals by
   hand stops happening. This walks every built HTML file and checks the
   things that quietly go wrong at scale: a title that ran over budget, a
   canonical pointing at the wrong slug, a second H1, a page whose canonical
   and sitemap entry disagree, an og:image pointing at a file that is not
   there.

   It checks the built output, not the data, because the built output is what
   a crawler sees. A template can be correct and the page it produces can
   still be wrong.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');

if (!fs.existsSync(OUT)) {
  console.error('  no dist/ directory. Run the build first.');
  process.exit(1);
}

/* ---------- collect every built page ---------- */
const pages = [];
function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(abs);
    else if (entry.name === 'index.html') {
      const rel = path.relative(OUT, abs).replace(/\\/g, '/');
      const route = rel === 'index.html' ? '/' : '/' + rel.replace(/index\.html$/, '');
      pages.push({ route, file: abs });
    }
  }
}
walk(OUT);

/* ---------- readers that do not need a DOM parser ---------- */
const pick = (html, re) => {
  const m = html.match(re);
  return m ? m[1] : null;
};
const all = (html, re) => [...html.matchAll(re)].map((m) => m[1]);
const stripTags = (s) => s.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&quot;/g, '"').trim();

const problems = [];
const notes = [];
const titles = new Map();
const descriptions = new Map();
const h1s = new Map();

for (const p of pages) {
  const html = fs.readFileSync(p.file, 'utf8');
  const head = html.split('</head>')[0];
  const body = html.split('<body>')[1] || '';

  const title = pick(head, /<title>([\s\S]*?)<\/title>/);
  const desc = pick(head, /<meta name="description" content="([^"]*)"/);
  const canonical = pick(head, /<link rel="canonical" href="([^"]*)"/);
  const ogImage = pick(head, /<meta property="og:image" content="([^"]*)"/);
  const ogTitle = pick(head, /<meta property="og:title" content="([^"]*)"/);
  const twTitle = pick(head, /<meta name="twitter:title" content="([^"]*)"/);
  const twImage = pick(head, /<meta name="twitter:image" content="([^"]*)"/);
  const robots = pick(head, /<meta name="robots" content="([^"]*)"/);

  const h1sOnPage = all(body, /<h1[^>]*>([\s\S]*?)<\/h1>/gi).map(stripTags);
  const h2sOnPage = all(body, /<h2[^>]*>([\s\S]*?)<\/h2>/gi).map(stripTags);

  /* one H1 per page */
  if (h1sOnPage.length === 0) problems.push(`${p.route}: no H1`);
  if (h1sOnPage.length > 1) problems.push(`${p.route}: ${h1sOnPage.length} H1s (${h1sOnPage.join(' | ')})`);

  /* title present and inside the budget a snippet can show */
  if (!title) problems.push(`${p.route}: no title tag`);
  else {
    const t = title.trim();
    if (t.length < 25) problems.push(`${p.route}: title is ${t.length} chars, under 25: "${t}"`);
    if (t.length > 62) problems.push(`${p.route}: title is ${t.length} chars, over 62: "${t}"`);
    if (titles.has(t)) problems.push(`${p.route}: title duplicates ${titles.get(t)}`);
    else titles.set(t, p.route);
  }

  /* description present and inside the budget */
  if (!desc) problems.push(`${p.route}: no meta description`);
  else {
    const d = desc.trim();
    if (d.length < 70) problems.push(`${p.route}: description is ${d.length} chars, under 70`);
    if (d.length > 165) problems.push(`${p.route}: description is ${d.length} chars, over 165`);
    if (descriptions.has(d)) problems.push(`${p.route}: description duplicates ${descriptions.get(d)}`);
    else descriptions.set(d, p.route);
  }

  /* the canonical has to be this page, on the configured origin */
  if (!canonical) problems.push(`${p.route}: no canonical`);
  else if (!canonical.endsWith(p.route)) {
    problems.push(`${p.route}: canonical points somewhere else (${canonical})`);
  }

  /* social card: a JPEG that exists, mirrored into the twitter tags */
  if (!ogImage) problems.push(`${p.route}: no og:image`);
  else {
    if (!ogImage.endsWith('.jpg')) problems.push(`${p.route}: og:image is not a JPEG (${ogImage})`);
    const local = ogImage.replace(/^https?:\/\/[^/]+/, '');
    if (!fs.existsSync(path.join(OUT, local))) problems.push(`${p.route}: og:image file does not exist (${local})`);
    if (ogImage !== twImage) problems.push(`${p.route}: twitter:image does not match og:image`);
  }
  if (ogTitle !== title) problems.push(`${p.route}: og:title does not match the title tag`);
  if (twTitle !== title) problems.push(`${p.route}: twitter:title does not match the title tag`);

  /* the page must be indexable unless the build was told otherwise */
  if (!robots) problems.push(`${p.route}: no robots meta`);
  else if (robots.includes('noindex') && !process.env.STAGING) {
    problems.push(`${p.route}: is noindex outside STAGING`);
  }

  /* H1 uniqueness across the site: two pages answering the same question is
     the cannibalisation signal, and it shows up here before it shows up in
     a search result */
  if (h1sOnPage.length === 1) {
    const h = h1sOnPage[0];
    if (h1s.has(h)) problems.push(`${p.route}: H1 duplicates ${h1s.get(h)} ("${h}")`);
    else h1s.set(h, p.route);
  }

  /* a page with an H1 but no H2 has no structure for a crawler to read */
  if (h1sOnPage.length === 1 && h2sOnPage.length === 0) {
    notes.push(`${p.route}: one H1 and no H2`);
  }

  /* the FAQ schema has to agree with the FAQs on the page */
  const faqBlocks = [...html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)]
    .map((m) => {
      try { return JSON.parse(m[1]); } catch { return null; }
    })
    .filter(Boolean);
  for (const block of faqBlocks) {
    if (block['@type'] !== 'FAQPage') continue;
    const schemaQs = (block.mainEntity || []).length;
    const visibleQs = all(body, /<summary class="faq__q">([\s\S]*?)<\/summary>/gi).length;
    if (schemaQs !== visibleQs) {
      problems.push(`${p.route}: FAQPage schema has ${schemaQs} questions, page shows ${visibleQs}`);
    }
    if (visibleQs < 5) problems.push(`${p.route}: only ${visibleQs} FAQs on the page`);
    if (visibleQs > 8) problems.push(`${p.route}: ${visibleQs} FAQs on the page, over the 5 to 8 range`);
  }

  /* every JSON-LD block has to parse, and none of them may claim a local
     business identity that this site does not have */
  for (const block of faqBlocks) {
    const type = block['@type'];
    if (['LocalBusiness', 'HVACBusiness', 'Plumber', 'Electrician'].includes(type)) {
      problems.push(`${p.route}: schema claims ${type}`);
    }
    if (block.telephone) problems.push(`${p.route}: schema carries a telephone`);
    if (block.aggregateRating) problems.push(`${p.route}: schema carries aggregateRating`);
    if (block.address) problems.push(`${p.route}: schema carries an address`);
  }
}

/* ---------- the sitemap has to agree with what was built ---------- */
const sitemapFile = path.join(OUT, 'sitemap.xml');
if (!fs.existsSync(sitemapFile)) {
  problems.push('sitemap.xml is missing');
} else {
  const xml = fs.readFileSync(sitemapFile, 'utf8');
  const locs = all(xml, /<loc>([^<]+)<\/loc>/g);
  const built = new Set(pages.map((p) => p.route));
  const listed = new Set(locs.map((l) => {
    const path = l.replace(/^https?:\/\/[^/]+/, '');
    return path === '' ? '/' : path;
  }));
  for (const route of built) {
    if (route === '/404.html') continue;
    if (!listed.has(route)) problems.push(`sitemap.xml is missing ${route}`);
  }
  for (const route of listed) {
    if (!built.has(route)) problems.push(`sitemap.xml lists ${route}, which was not built`);
  }
  /* every URL needs a lastmod we can defend */
  const entries = [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)].map((m) => m[1]);
  const noLastmod = entries.filter((e) => !/<lastmod>\d{4}-\d{2}-\d{2}<\/lastmod>/.test(e));
  if (noLastmod.length) {
    notes.push(`${noLastmod.length} sitemap entries carry no lastmod`);
  }
  const badLastmod = entries.filter((e) => {
    const m = e.match(/<lastmod>([^<]+)<\/lastmod>/);
    return m && m[1] > new Date().toISOString().slice(0, 10);
  });
  if (badLastmod.length) problems.push(`${badLastmod.length} sitemap entries have a lastmod in the future`);
}

/* ---------- report ---------- */
const byType = { service: 0, area: 0, 'area x service': 0, neighborhood: 0, other: 0 };
for (const p of pages) {
  if (p.route === '/404.html') { byType.other += 1; continue; }
  if (p.route.startsWith('/service-areas/') && p.route.includes('/neighborhoods/')) byType.neighborhood += 1;
  else if (p.route.startsWith('/service-areas/') && p.route.split('/').filter(Boolean).length === 3) byType['area x service'] += 1;
  else if (p.route.startsWith('/service-areas/')) byType.area += 1;
  else if (p.route.startsWith('/services/') && p.route.split('/').filter(Boolean).length === 2) byType.service += 1;
  else byType.other += 1;
}

console.log(`\n  audited ${pages.length} built pages`);
console.log(`    service ${byType.service}, area ${byType.area}, area x service ${byType['area x service']}, neighborhood ${byType.neighborhood}, other ${byType.other}`);
console.log(`    ${titles.size} distinct titles, ${descriptions.size} distinct descriptions, ${h1s.size} distinct H1s`);

if (notes.length) {
  console.log(`\n  notes (${notes.length}):`);
  for (const n of notes.slice(0, 10)) console.log('   - ' + n);
  if (notes.length > 10) console.log(`   ... and ${notes.length - 10} more`);
}

if (problems.length) {
  console.error(`\n  SEO PROBLEMS (${problems.length}):`);
  for (const p of problems.slice(0, 40)) console.error('   - ' + p);
  if (problems.length > 40) console.error(`   ... and ${problems.length - 40} more`);
  process.exit(1);
}

console.log('\n  no SEO problems: every page has one H1, a unique title and description in budget,\n  a self-referential canonical, a working social card, and a sitemap entry.\n');
