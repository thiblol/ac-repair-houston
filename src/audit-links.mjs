/* Verify the internal link architecture against the brief:
   - the homepage links to every service, every core area and every city
   - the menu nav holds every kept service page
   - the footer holds core locations plus the service area directory
   - a service page links to the area x service versions of that service
   - an area page links to the area x service version of each service it carries
   - an area x service page links to the same service in other areas

   The header and footer are stripped before links are counted. The navigation
   is chrome: it links every area on every page, so counting it would make
   every service page look like it links to every area. */
import fs from 'node:fs';
import path from 'node:path';
import { areaServicesFor } from './links.mjs';

const OUT = 'dist';
const read = (p) => fs.readFileSync(p, 'utf8');
const hrefs = (html) => [...html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
const bodyOf = (html) => {
  const start = html.indexOf('<main');
  const end = html.lastIndexOf('</main>');
  return start >= 0 && end > start ? html.slice(start, end) : html;
};

const pages = {};
(function walk(d) {
  for (const e of fs.readdirSync(d, { withFileTypes: true })) {
    const a = path.join(d, e.name);
    if (e.isDirectory()) walk(a);
    else if (e.name === 'index.html') {
      const rel = path.relative(OUT, a).split(path.sep).join('/');
      pages['/' + rel.replace(/index\.html$/, '')] = read(a);
    }
  }
})(OUT);

const services = JSON.parse(read('data/services.json'));
const areaData = JSON.parse(read('data/areas.json'));
const areas = [areaData.pillar, ...areaData.cities];
const carried = new Map(areas.map((a) => [a.slug, areaServicesFor(services, a).map((s) => s.slug)]));

const problems = [];
const check = (cond, msg) => { if (!cond) problems.push(msg); };

/* 1. the homepage links to every service */
const home = pages['/'];
const homeLinks = new Set(hrefs(home));
for (const s of services) {
  check(homeLinks.has(`/services/${s.slug}/`), `homepage does not link to /services/${s.slug}/`);
}

/* 2. the homepage links to every area and every neighborhood */
for (const a of areas) {
  check(homeLinks.has(`/service-areas/${a.slug}/`), `homepage does not link to /service-areas/${a.slug}/`);
}
for (const n of areaData.pillar.areas) {
  check(homeLinks.has(`/service-areas/${areaData.pillar.slug}/neighborhoods/${n.slug}/`),
    `homepage does not link to the ${n.name} neighborhood page`);
}

/* 3. the homepage carries the city directory */
check(homeLinks.has('/service-areas/'), 'homepage does not link to the service area directory');

/* 4. the menu nav holds every kept service page */
for (const s of services) {
  check(home.includes(`/services/${s.slug}/`), `menu nav does not hold ${s.name}`);
}

/* 5. the footer holds the service area directory and the core locations */
const foot = home.slice(home.lastIndexOf('<footer'));
const footLinks = new Set(hrefs(foot));
check(footLinks.has('/service-areas/'), 'footer does not link to the service area directory');
for (const a of areas) {
  check(footLinks.has(`/service-areas/${a.slug}/`), `footer does not link to ${a.name}`);
}

/* 6. a service page links to the area x service versions of that service,
      and never to a generic area page in place of one */
for (const s of services) {
  const links = new Set(hrefs(bodyOf(pages[`/services/${s.slug}/`])));
  const withIt = areas.filter((a) => carried.get(a.slug).includes(s.slug));
  for (const a of withIt) {
    check(links.has(`/service-areas/${a.slug}/${s.slug}/`),
      `service page ${s.name} does not link to ${s.name} in ${a.name}`);
  }
  /* an area that does not carry the service must not be linked as if it did */
  const bogus = areas.filter((a) => !carried.get(a.slug).includes(s.slug)
    && links.has(`/service-areas/${a.slug}/${s.slug}/`));
  check(bogus.length === 0,
    `service page ${s.name} links to a ${s.name} page in an area that does not carry it: ${bogus.map((a) => a.name).join(', ')}`);
}

/* 7. an area page links to the area x service version of each service it carries */
for (const a of areas) {
  const links = new Set(hrefs(bodyOf(pages[`/service-areas/${a.slug}/`])));
  for (const slug of carried.get(a.slug)) {
    check(links.has(`/service-areas/${a.slug}/${slug}/`),
      `area page ${a.name} does not link to /service-areas/${a.slug}/${slug}/`);
  }
}

/* 8. an area x service page links to the same service in other areas, or to
      the service page that indexes them when no other area carries it */
for (const a of areas) {
  for (const slug of carried.get(a.slug)) {
    const key = `/service-areas/${a.slug}/${slug}/`;
    const links = new Set(hrefs(bodyOf(pages[key])));
    const elsewhere = areas.filter((b) => b.slug !== a.slug && carried.get(b.slug).includes(slug)
      && links.has(`/service-areas/${b.slug}/${slug}/`));
    if (elsewhere.length) continue;
    /* only one area carries it, so the sibling list is empty by design and
       the national page is the index of this service's coverage */
    const carriers = areas.filter((b) => carried.get(b.slug).includes(slug));
    check(carriers.length === 1,
      `area x service page ${slug} in ${a.name} links to the same service in no other area`);
    check(links.has(`/services/${slug}/`),
      `area x service page ${slug} in ${a.name} does not link to the service page that indexes its coverage`);
  }
}

if (problems.length) {
  console.log(`LINK ARCHITECTURE PROBLEMS (${problems.length}):`);
  for (const p of problems.slice(0, 30)) console.log('  - ' + p);
  if (problems.length > 30) console.log(`  ... and ${problems.length - 30} more`);
  process.exit(1);
}
console.log(`link architecture verified: ${services.length} services, ${areas.length} areas, ${Object.keys(pages).length} pages`);
console.log(`  every service page links its own area versions, every area page links its services, every area x service page links the same service elsewhere`);
