/* ==========================================================================
   The interlinking engine for AC Repair Houston.

   Every internal link on the site is produced here, so the link graph is one
   auditable thing rather than an emergent property of a hundred templates.

   Model:
     home ─┬─ service pages (national, location neutral)
           ├─ service index
           └─ area index ─┬─ Houston (the pillar area, full service coverage)
                          ├─ Houston neighborhoods
                          └─ Greater Houston municipalities
                                └─ area x service (the money pages)

   Lateral edges are what make it a graph rather than a tree:
     area      <-> nearest areas (real haversine distance)
     area x svc <-> same service in the nearest areas
     area x svc <-> sibling services in the same area
     service   <-> every area that offers it
   ========================================================================== */

const R_MILES = 3958.8;

export function haversine(a, b) {
  const rad = (d) => (d * Math.PI) / 180;
  const [la1, lo1, la2, lo2] = [a.lat, a.lon, b.lat, b.lon].map(rad);
  const h =
    Math.sin((la2 - la1) / 2) ** 2 +
    Math.cos(la1) * Math.cos(la2) * Math.sin((lo2 - lo1) / 2) ** 2;
  return 2 * R_MILES * Math.asin(Math.sqrt(h));
}

/* ---------- URLs. Single source of truth, everything else calls these. ---------- */
export const url = {
  home: () => '/',
  service: (s) => `/services/${s.slug}/`,
  services: () => '/services/',
  areas: () => '/service-areas/',
  area: (a) => `/service-areas/${a.slug}/`,
  areaService: (a, s) => `/service-areas/${a.slug}/${s.slug}/`,
  neighborhood: (a, n) => `/service-areas/${a.slug}/neighborhoods/${n.slug}/`,
  howItWorks: () => '/how-it-works/',
  forCompanies: () => '/for-hvac-companies/',
  privacy: () => '/privacy/',
  terms: () => '/terms/',
  sitemap: () => '/sitemap/',
};

/* ---------- proximity ---------- */
export function nearestAreas(area, areas, n = 6) {
  return areas
    .filter((a) => a.slug !== area.slug)
    .map((a) => ({ area: a, miles: haversine(area, a) }))
    .sort((a, b) => a.miles - b.miles)
    .slice(0, n);
}

/* ---------- which services get an area page ----------
   Deliberately NOT every service in every area. 21 services x 41 areas is 861
   near-identical pages, which is the doorway-page failure mode rather than a
   growth plan. Houston is the pillar market and carries the full set. Every
   other area carries the services with real search demand AND a genuine local
   angle. The rest still get a full national page and a link from every area. */
export function areaServicesFor(services, area, limit = 6) {
  if (area.fullServiceCoverage) {
    return [...services].sort((a, b) => a.priority - b.priority);
  }
  return [...services]
    .sort((a, b) => a.priority - b.priority)
    .slice(0, limit);
}

/* ---------- the link sets each template renders ---------- */
export function serviceLinks(service, { services, areas, areaSvcMap }) {
  const offered = areas.filter((a) => areaSvcMap.get(a.slug)?.has(service.slug));
  return {
    siblings: services.filter((s) => s.slug !== service.slug && s.tier === service.tier),
    otherTier: services.filter((s) => s.tier !== service.tier).slice(0, 6),
    areas: offered,
    parent: service.parent ? services.find((s) => s.slug === service.parent) : null,
    children: services.filter((s) => s.parent === service.slug),
  };
}

export function areaLinks(area, { services, areas, areaSvcs }) {
  return {
    services: areaSvcs,
    allServices: services,
    nearby: nearestAreas(area, areas, 6),
    neighborhoods: area.neighborhoods || [],
  };
}

/* ---------- graph audit ----------
   Run at build time. A page with no inbound internal link is an orphan, and an
   orphaned near-duplicate location page is exactly what gets read as a doorway. */
export function auditGraph(pages) {
  const inbound = new Map(pages.map((p) => [p.path, 0]));
  const outbound = new Map(pages.map((p) => [p.path, 0]));
  const dangling = [];

  for (const p of pages) {
    const hrefs = [...p.html.matchAll(/href="(\/[^"#?]*)"/g)].map((m) => m[1]);
    const unique = [...new Set(hrefs)];
    outbound.set(p.path, unique.length);
    for (const h of unique) {
      if (h === p.path) continue;
      // static assets are real files but not pages, so they are not orphan/dangling candidates
      if (/^\/assets\//.test(h) || /\.[a-z0-9]{2,12}$/i.test(h)) continue;
      if (inbound.has(h)) inbound.set(h, inbound.get(h) + 1);
      else dangling.push({ from: p.path, to: h });
    }
  }

  const orphans = [...inbound.entries()]
    .filter(([p, n]) => n === 0 && p !== '/' && p !== '/404.html');
  const thinOut = [...outbound.entries()].filter(([, n]) => n < 8);

  return {
    pages: pages.length,
    orphans: orphans.map(([p]) => p),
    dangling: [...new Set(dangling.map((d) => d.to))],
    thinlyLinked: thinOut.map(([p, n]) => `${p} (${n} outbound)`),
    medianInbound: median([...inbound.values()]),
    totalEdges: [...outbound.values()].reduce((a, b) => a + b, 0),
  };
}

function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const m = Math.floor(s.length / 2);
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}
