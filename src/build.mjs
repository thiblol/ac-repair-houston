/* ==========================================================================
   AC Repair Houston static generator.
   node src/build.mjs   ->   dist/

   Refuses to build if: copy is missing, a banned claim appears, an invented
   price appears, an em dash appears, a page is orphaned, a link dangles, a
   local fact contradicts the area's traits, or two same-type pages are too
   similar. A doorway network is a build failure here, not a thing you discover
   in Search Console three months later.
   ========================================================================== */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { url, nearestAreas, areaServicesFor, auditGraph } from './links.mjs';
import {
  layout, esc, faqBlock, cloud, cardGrid, serviceRows, img,
  serviceSchema, faqSchema, breadcrumbSchema, orgSchema, requestForm,
  fitTitle, fitDescription,
} from './templates.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, 'dist');
const read = (p) => JSON.parse(fs.readFileSync(path.join(ROOT, p), 'utf8'));

const cfg = read('data/config.json');
const services = read('data/services.json');
const areaData = read('data/areas.json');

const pillar = areaData.pillar;
const cities = areaData.cities;
const areas = [pillar, ...cities];

/* Which area gets which service pages. Houston is the pillar market and
   carries the full set. Every other area carries the fourteen services that a
   live search shows have dedicated pages of their own. The remaining six stay
   on their national pages until the fourteen are indexed and can be judged on
   evidence. The similarity and local-fact gates are what stop this becoming a
   doorway network, not the count. */
const areaSvcs = new Map(areas.map((a) => [a.slug, areaServicesFor(services, a)]));

cfg._nav = {
  services,
  urgency: services.filter((s) => s.tier === 'urgency'),
  areas: cities,
  pillar,
};

const problems = [];
function copy(file, required) {
  const p = path.join(ROOT, 'data/copy', file);
  if (!fs.existsSync(p)) { problems.push(`MISSING COPY: ${file}`); return null; }
  let j;
  try { j = JSON.parse(fs.readFileSync(p, 'utf8')); }
  catch (e) { problems.push(`BAD JSON: ${file}: ${e.message}`); return null; }
  for (const k of [...required, 'lastmod']) {
    const v = j[k];
    if (v == null || (typeof v === 'string' && !v.trim()) || (Array.isArray(v) && !v.length)) {
      problems.push(`EMPTY FIELD: ${file} -> ${k}`);
    }
  }
  if (j.lastmod && !/^\d{4}-\d{2}-\d{2}$/.test(j.lastmod)) {
    problems.push(`BAD lastmod: ${file} -> ${j.lastmod} (expected YYYY-MM-DD)`);
  }
  return j;
}

/* ---------- banned claims ----------
   A referral site that reads as though it employs technicians is the fastest
   way to lose consumer-protection cover and the fastest way for a competitor
   to complain about you. These are hard failures, not warnings. */
const BANNED = [
  /\bour (hvac|ac|technicians|techs|team|trucks|crew|staff|installers)\b/i,
  /\bwe (are|'re) (licensed|bonded|insured|certified)\b/i,
  /\bwe (arrive|dispatch our|send our)\b/i,
  /\bour (licensed|certified) (hvac|ac)\b/i,
  /\$\s?\d/,                       // invented price
  /\b\d+(\.\d)?\s*(star|stars)\b/i, // invented rating
  /\b\d[\d,]*\+?\s*(reviews|jobs completed|happy customers|installs)\b/i,
  /\b\d+\+?\s*years (in business|of experience)\b/i,
  /—/,                        // em dash
];

/* A guarantee is only a problem when the site OFFERS one. The copy that
   explains why this site does not guarantee anything is the opposite of a
   violation, so a negated "guarantee" has to be allowed through. So does a
   homeowner asking whether a guarantee exists, which is a question the copy
   then answers with no. */
const NEGATED_GUARANTEE =
  /\b(no|not|never|nobody|without|nothing|does not|do not|did not|cannot|can't|neither|nor)\b[^.]{0,60}\bguarantee/i;
const GUARANTEE_AS_QUESTION = /\b(can|could|do|does|will|would|is|are|any)\b[^.]{0,20}\bguarantee/i;

function scan(label, obj) {
  const s = JSON.stringify(obj);
  for (const re of BANNED) {
    const m = s.match(re);
    if (m) problems.push(`BANNED CLAIM in ${label}: "${m[0]}"`);
  }
  for (const m of s.matchAll(/\bguarantee[ds]?\b/gi)) {
    const start = Math.max(0, m.index - 90);
    const context = s.slice(start, m.index + 20);
    if (NEGATED_GUARANTEE.test(context)) continue;
    if (GUARANTEE_AS_QUESTION.test(context)) continue;
    problems.push(`BANNED CLAIM in ${label}: offered guarantee "${m[0]}"`);
  }
}

/* ---------- local fact consistency ----------
   A League City page that talks about winter freeze damage, or a Cypress page
   describing 1950s housing stock, is wrong in a way any local spots instantly.
   The copy is written by agents, so this is checked mechanically rather than
   trusted. */
function checkTraits(area, copyObj) {
  if (!copyObj) return;
  const t = area.traits;
  const txt = JSON.stringify(copyObj).toLowerCase();
  const hit = (re) => re.test(txt);
  const flag = (m) => problems.push(`FACT CONTRADICTION ${area.slug}: ${m}`);

  /* An area with no salt exposure may still say so out loud. "no coastal salt
     here", "rather than salt spray", "keeps salt spray out of the picture",
     "none of that corrosion is coastal salt" are all the copy being careful,
     not being wrong. So a salt mention only counts as a claim when nothing
     nearby denies salt exposure.

     The window is bounded by the enclosing sentence so a negation from an
     adjacent sentence cannot disarm a real claim. */
  const SALT_DENIAL =
    /\b(no|not|never|none|nothing|nobody|neither|without|absence|lack of|far from|free of|protected from|rather than|instead of|insensitive to|immune to)\b|keeps?\b[^.]{0,30}\bout\b|keeps?\b[^.]{0,30}\baway\b/;
  const negated = (re) => {
    const g = new RegExp(re.source, 'gi');
    for (const m of txt.matchAll(g)) {
      const before = txt.lastIndexOf('.', m.index) + 1;
      const after = txt.indexOf('.', m.index);
      const sentence = txt.slice(before, after === -1 ? undefined : after);
      if (!SALT_DENIAL.test(sentence)) return true;
    }
    return false;
  };

  if (t.salt === 'none' && negated(/salt (air|spray|corrosion)|saltwater|salt damages|coastal salt|salt film|salt attack|coastal (humidity|air)/)) {
    flag('area has no salt exposure but copy describes salt damage');
  }
  if (['high', 'moderate'].includes(t.salt) && negated(/no salt|free of salt|without salt/)) {
    flag('area has salt exposure but copy denies it');
  }

  if (/2000s-onward|1990s-to-2010s/.test(t.housing) && hit(/1950s housing|1940s housing|housing from the 1950s|home built in the 1950s/))
    flag(`housing stock is "${t.housing}" but copy describes 1950s housing`);

  if (t.debris.includes('pine') && hit(/cottonwood and mesquite|cottonwood or mesquite/))
    flag(`debris is "${t.debris}" but copy describes cottonwood and mesquite`);
}

/* ---------- page assembly ---------- */
const pages = [];
const add = (p, html, meta = {}) => pages.push({ path: p, html, ...meta });

const CRUMB_HOME = { name: 'Home', href: '/' };

/* ============================ HOME ============================ */
{
  const c = copy('page-home.json', ['heroIntro', 'intro', 'whyRequest', 'steps', 'faqs']) || {};
  scan('home', c);
  const crumbs = [];
  const body = `
<section class="herofig">
  ${img('hero-condenser', 'A residential air conditioning condenser unit beside a house, with warm air drawn in through the coil and cool air leaving the vents.', { sizes: '100vw', eager: true, cls: 'herofig__img' })}
  <div class="wrap herofig__in">
    <span class="kicker">Houston AC repair and installation</span>
    <h1>AC repair near you, from technicians who work your street</h1>
    <p class="herofig__sub">Free to request. Same-day and emergency requests welcome.</p>
    <p class="herofig__intro">${esc(c.heroIntro || '')}</p>
  </div>
</section>

<div class="herocta"><div class="wrap">
  <a class="btn btn--call" href="#request">Request AC service</a>
  <a class="btn btn--line" href="${url.howItWorks()}">How it works</a>
</div></div>

<div class="herolist"><div class="wrap">
  <span>Same-day requests welcome</span>
  <span>Emergency service</span>
  <span>No cost to request</span>
  <span>${areas.length} service areas</span>
</div></div>

<div class="strip"><div class="wrap strip__in">
  <div class="strip__c"><span class="strip__k">Houston</span><span class="strip__v">Main service area</span></div>
  <div class="strip__c"><span class="strip__k">${services.length}</span><span class="strip__v">AC services</span></div>
  <div class="strip__c"><span class="strip__k">${pillar.areas.length}</span><span class="strip__v">Houston neighborhoods</span></div>
  <div class="strip__c"><span class="strip__k">${cities.length}</span><span class="strip__v">Surrounding cities</span></div>
</div></div>

<section class="sec"><div class="wrap">
  <span class="kicker">How the request works</span>
  <h2>How your AC repair request reaches the right company</h2>
  <p class="lede">${esc(c.intro || '')}</p>
  <ul class="ticks">
    ${(c.whyRequest || []).map((x) => `<li>${esc(x)}</li>`).join('\n    ')}
  </ul>
</div></section>

<section class="sec"><div class="wrap">
  <span class="kicker">Urgent</span>
  <h2>Emergency AC repair when the house is heating up</h2>
  ${serviceRows(cfg._nav.urgency.map((s) => ({
    href: url.service(s), title: s.name, urgent: true, tag: 'Urgent', body: s.problem,
  })))}
</div></section>

<section class="sec"><div class="wrap">
  <span class="kicker">What we cover</span>
  <h2>Every AC service a Houston home needs, from repair to installation</h2>
  ${serviceRows(services.filter((s) => s.tier === 'core').map((s) => ({
    href: url.service(s), title: s.name, body: s.problem,
  })))}
</div></section>

<section class="sec sec--ink"><div class="wrap">
  <div class="media-split">
    <span class="shot">${img('unit-anatomy',
      'Diagram of a split air conditioning system showing the outdoor condenser, refrigerant lines and the indoor evaporator unit.',
      { sizes: '(min-width: 56rem) 32rem, 100vw' })}</span>
    <div class="media-split__body">
      <span class="kicker">What you are booking</span>
      <h2>AC technicians who work your part of Houston</h2>
      <p class="lede">Houston AC work is not one job. A system that is not cooling in July and a system that will not start in January fail for completely different reasons, and the fix depends on where you are.</p>
    </div>
  </div>
  <ol class="steps">
    ${(c.steps || []).map((s) => `<li><h3>${esc(s.t)}</h3><p>${esc(s.d)}</p></li>`).join('\n    ')}
  </ol>
</div></section>

<section class="sec"><div class="wrap">
  <span class="kicker">Where we send requests</span>
  <h2>AC repair across ${areas.length} service areas</h2>
  <p class="small muted"><a href="${url.areas()}">Full service area directory</a>, including every Houston neighborhood and every Greater Houston city.</p>
  ${cardGrid([pillar, ...cities].slice(0, 8).map((ct) => ({
    href: url.area(ct), title: `${ct.name}, ${ct.stateAbbr}`,
    body: ct.traits.note.split('.')[0] + '.',
  })), 'grid grid--4')}
  <div class="cols">
    ${[
      { label: 'Houston', items: pillar.areas.map((n) => ({ href: url.neighborhood(pillar, n), label: n.name })) },
      { label: 'Greater Houston', items: cities.map((ct) => ({ href: url.area(ct), label: ct.name })) },
    ].map((g) => `<div class="linkcol"><span class="linkcol__lbl">${esc(g.label)}</span><ul>${
      g.items.map((it) => `<li><a href="${it.href}">${esc(it.label)}</a></li>`).join('')
    }</ul></div>`).join('\n    ')}
  </div>
</div></section>

<section class="sec"><div class="wrap">
  <h2>AC repair questions homeowners ask first</h2>
  ${faqBlock(c.faqs)}
</div></section>

${requestForm(cfg)}
`;
  add('/', layout({
    og: 'hero-condenser',
    cfg, path: '/', crumbs,
    title: 'AC Repair Near Me | Same-Day AC Service | AC Repair Houston',
    description: fitDescription(
      'AC repair near you across Houston and Greater Houston. Same-day and emergency requests welcome, plus installations and replacements. Free to request.',
      'AC repair near you across Houston and Greater Houston. Same-day and emergency requests welcome, installations and replacements. Free to request.',
      'AC repair near you in Houston and Greater Houston. Same-day and emergency requests welcome, installations and replacements. Free to request.',
    ),
    navCurrent: '/',
    jsonld: [orgSchema(cfg), {
      '@context': 'https://schema.org', '@type': 'WebSite',
      '@id': cfg.origin + '/#website', url: cfg.origin + '/', name: cfg.brand,
      publisher: { '@id': cfg.origin + '/#organization' },
    }, faqSchema(cfg, c.faqs, '/')].filter(Boolean),
    body,
  }), { lastmod: c.lastmod, priority: '1.0', changefreq: 'weekly' });
}

/* ============================ SERVICE PAGES ============================ */
for (const s of services) {
  const c = copy(`service-${s.slug}.json`, ['intro', 'whatHappens', 'howPriced', 'faqs']) || {};
  scan(`service-${s.slug}`, c);
  const parent = s.parent ? services.find((x) => x.slug === s.parent) : null;
  const children = services.filter((x) => x.parent === s.slug);
  const crumbs = [CRUMB_HOME, { name: 'Services', href: url.services() }];
  if (parent) crumbs.push({ name: parent.name, href: url.service(parent) });
  crumbs.push({ name: s.name });

  const offeredAreas = areas.filter((a) => areaSvcs.get(a.slug).some((x) => x.slug === s.slug));
  const sibs = services.filter((x) => x.slug !== s.slug);

  const body = `
<section class="hero"><div class="wrap hero__grid">
  <div class="hero__main">
    <span class="kicker">${s.tier === 'urgency' ? 'Urgent service' : 'AC service'}</span>
    <h1>${esc(s.h1)}</h1>
    <p class="hero__intro">${esc(c.intro || '')}</p>
    <div class="btn-row">
      <a class="btn btn--call" href="#request">Request this service</a>
    </div>
  </div>
  <div class="dispatch">
    <span class="l">${s.tier === 'urgency' ? 'Same-day and emergency' : 'AC service'}</span>
    <span class="n">Free to request</span>
    <span class="free">No cost to you</span>
    <p class="sub-t">Tell us what the system is doing and where you are. We send it to an HVAC company that works your area of Houston.</p>
    <ul>${(c.whatHappens || []).slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>
</div></section>

${parent || children.length ? `<section class="sec sec--paper"><div class="wrap">
  <span class="kicker">${parent ? 'Part of' : 'AC repair covers'}</span>
  <h2>${parent ? `${esc(parent.name)} services` : `All AC repair services`}</h2>
  <p class="lede">${parent ? `This is one specific part of ${esc(parent.name)}. The other work in that category is listed alongside it.` : `Each of these is a separate job with its own page, because the diagnosis and the fix are genuinely different.`}</p>
  ${cloud([...(parent ? [{ href: url.service(parent), label: parent.name }] : []),
    ...children.map((x) => ({ href: url.service(x), label: x.name }))])}
</div></section>` : ''}

<section class="sec"><div class="wrap">
  <h2>Signs you need ${esc(s.name)}</h2>
  <ul class="symptoms">${s.symptoms.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  <div class="note${s.safetyFirst ? ' note--safety' : ''}">
    <h3>What to check before you call a technician</h3>
    <p>${esc(s.firstStep)}</p>
  </div>
</div></section>

<section class="sec sec--paper"><div class="wrap">
  <div class="media-split media-split--flip">
    <span class="shot">${img(s.tier === 'urgency' ? 'thermostat' : 'airflow',
      s.tier === 'urgency'
        ? 'A wall-mounted digital thermostat showing a room temperature reading.'
        : 'Diagram of air moving through a duct into a ceiling vent and across an evaporator coil.',
      { sizes: '(min-width: 56rem) 32rem, 100vw' })}</span>
    <div class="media-split__body">
      <span class="kicker">Pricing</span>
      <h2>What it costs, and what moves the price</h2>
      <p class="lede">${esc(c.howPriced || '')}</p>
    </div>
  </div>
</div></section>

${offeredAreas.length ? `<section class="sec"><div class="wrap">
  <span class="kicker">By area</span>
  <h2>Where to get ${esc(s.name)} in your area</h2>
  ${cloud(offeredAreas.map((a) => ({
    href: areaSvcs.get(a.slug).some((x) => x.slug === s.slug) ? url.areaService(a, s) : url.area(a),
    label: `${s.name} in ${a.name}`,
  })))}
</div></section>` : ''}

<section class="sec"><div class="wrap">
  <h2>Questions homeowners ask about ${esc(s.name)}</h2>
  ${faqBlock(c.faqs)}
</div></section>

<section class="sec sec--paper"><div class="wrap">
  <span class="kicker">Other services</span>
  <h2>Other AC services you can request</h2>
  ${cloud(sibs.map((x) => ({ href: url.service(x), label: x.name })))}
</div></section>

${requestForm(cfg, { heading: `Request ${s.name}`, service: s.name })}
`;
  add(url.service(s), layout({
    og: 'unit-anatomy',
    cfg, path: url.service(s), crumbs,
    title: fitTitle(
      s.title || `${s.name} Near You | AC Repair Houston`,
      `${s.name} Near You | AC Repair`,
      `${s.name} Near You`,
    ),
    description: fitDescription(
      `${s.h1}. Free to request, we send it to an HVAC company that covers your area.`,
      `Request ${s.name}. Free to request, we send it to an HVAC company that covers your area.`,
      `${s.name}. Free to request, we send it to a local HVAC company.`,
    ),
    jsonld: [
      orgSchema(cfg),
      serviceSchema(cfg, { name: s.name, description: c.intro || s.problem, areaServed: { '@type': 'State', name: 'Texas' }, path: url.service(s) }),
      faqSchema(cfg, c.faqs, url.service(s)),
      breadcrumbSchema(cfg, crumbs),
    ].filter(Boolean),
    body,
  }), { lastmod: c.lastmod, priority: '0.9', changefreq: 'monthly' });
}

/* ============================ SERVICES INDEX ============================ */
{
  const crumbs = [CRUMB_HOME, { name: 'Services' }];
  const body = `
<section class="sec"><div class="wrap">
  <span class="kicker">Urgent</span>
  <h1>AC Repair Services in Houston</h1>
  <p class="lede">One request form for every job below. Describe what the system is doing and your area, and we send it to an HVAC company that covers it.</p>
  ${cardGrid(cfg._nav.urgency.map((s) => ({ href: url.service(s), title: s.name, urgent: true, meta: 'Same day', body: s.problem })))}
</div></section>
<section class="sec"><div class="wrap">
  <h2>Repair, installation and replacement</h2>
  ${cardGrid(services.filter((s) => s.tier === 'core').map((s) => ({ href: url.service(s), title: s.name, body: s.problem })))}
</div></section>
${requestForm(cfg)}`;
  add(url.services(), layout({
    og: 'unit-anatomy',
    cfg, path: url.services(), crumbs,
    title: `AC Services Houston | AC Repair Houston`,
    description: `Emergency and same-day AC repair, installation, replacement, refrigerant work, mini-splits and commercial HVAC across Houston. Free to request.`,
    jsonld: [orgSchema(cfg), breadcrumbSchema(cfg, crumbs)],
    body,
  }), { priority: '0.7', changefreq: 'monthly' });
}

/* ============================ AREAS INDEX ============================ */
{
  const crumbs = [CRUMB_HOME, { name: 'Service areas' }];
  const body = `
<section class="sec"><div class="wrap">
  <span class="kicker">Where we send requests</span>
  <h1>AC Repair Service Areas in Houston and Greater Houston</h1>
  <p class="lede">We cover Houston and the ${cities.length} cities around it, plus ${pillar.areas.length} Houston neighborhoods. If your area is not listed, request anyway. Coverage is wider than this page.</p>
</div></section>
<section class="sec sec--paper"><div class="wrap">
  <h2>AC repair services in Houston</h2>
  <p class="lede">Every AC service is available across Houston.</p>
  ${cardGrid([{ href: url.area(pillar), title: `Houston, ${pillar.stateAbbr}`, body: pillar.traits.note.split('.')[0] + '.' }], 'grid grid--3')}
  <h3>Houston neighborhoods</h3>
  ${cloud(pillar.areas.map((n) => ({ href: url.neighborhood(pillar, n), label: n.name })))}
</div></section>
<section class="sec"><div class="wrap">
  <h2>AC repair services in Greater Houston cities</h2>
  ${cardGrid(cities.map((ct) => ({
    href: url.area(ct), title: `${ct.name}, ${ct.stateAbbr}`,
    meta: ct.county,
    body: ct.traits.note.split('.')[0] + '.',
  })), 'grid grid--3')}
</div></section>
${requestForm(cfg)}`;
  add(url.areas(), layout({
    og: 'houston-skyline',
    cfg, path: url.areas(), crumbs,
    title: `AC Repair Service Areas | Houston and Greater Houston`,
    description: `AC repair across Houston and ${cities.length} Greater Houston cities, including Katy, Sugar Land, Pearland, The Woodlands, Spring and League City.`,
    jsonld: [orgSchema(cfg), breadcrumbSchema(cfg, crumbs)],
    body,
  }), { priority: '0.7', changefreq: 'monthly' });
}

/* ============================ AREA + AREA x SERVICE ============================ */
for (const ct of areas) {
  const c = copy(`area-${ct.slug}.json`, ['intro', 'localAngle', 'commonCalls', 'landmarks', 'faqs']) || {};
  scan(`area-${ct.slug}`, c);
  checkTraits(ct, c);
  const near = nearestAreas(ct, areas, 6);
  const svcs = areaSvcs.get(ct.slug);
  const crumbs = [CRUMB_HOME, { name: 'Service areas', href: url.areas() }, { name: ct.name }];

  const body = `
<section class="hero"><div class="wrap hero__grid">
  <div class="hero__main">
    <span class="kicker">${esc(ct.county)}</span>
    <h1>AC Repair Services in ${esc(ct.name)}, ${esc(ct.stateAbbr)}</h1>
    <p class="hero__intro">${esc(c.intro || '')}</p>
    <div class="btn-row">
      <a class="btn btn--call" href="#request">Request AC service in ${esc(ct.name)}</a>
    </div>
  </div>
  <div class="dispatch">
    <span class="l">${esc(ct.name)} service</span>
    <span class="n">Free to request</span>
    <span class="free">No cost to you</span>
    <p class="sub-t">Tell us what the system is doing. We send it to an HVAC company that covers ${esc(ct.name)}.</p>
    <ul>${(c.commonCalls || []).slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>
</div></section>

<section class="sec"><div class="wrap">
  <h2>AC repair problems common in ${esc(ct.name)}</h2>
  <p class="lede">${esc(c.localAngle || '')}</p>
</div></section>

<section class="sec sec--paper"><div class="wrap">
  <span class="kicker">In ${esc(ct.name)}</span>
  <h2>${ct.fullServiceCoverage
    ? `Every AC service available in ${esc(ct.name)}, ${esc(ct.stateAbbr)}`
    : `AC services available in ${esc(ct.name)}`}</h2>
  ${cardGrid(svcs.map((s) => ({
    href: url.areaService(ct, s), title: `${s.name} in ${ct.name}`,
    urgent: s.tier === 'urgency', body: (c.services?.[s.slug]?.intro || '').split('.')[0] + '.',
  })))}
  <h3>Every AC service, one request</h3>
  ${cloud(services.map((s) => ({ href: url.service(s), label: s.name })))}
</div></section>

${ct.neighborhoods?.length ? `<section class="sec"><div class="wrap">
  <span class="kicker">Across Houston</span>
  <h2>Houston neighborhoods we cover</h2>
  ${cloud(ct.neighborhoods.map((n) => ({ href: url.neighborhood(ct, n), label: n.name })))}
</div></section>` : ''}

<section class="sec"><div class="wrap">
  <span class="shot">${img('houston-skyline',
    'The Houston skyline seen across the Ship Channel, with low buildings and a wide flat horizon under a hazy sky.',
    { sizes: '(min-width: 78rem) 74rem, 100vw' })}</span>
  <h2>Common AC repair calls in ${esc(ct.name)}</h2>
  <ul class="symptoms">${(c.commonCalls || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  <h3 id="local">Local landmarks and neighborhoods</h3>
  ${cloud((c.landmarks || []).map((x) => ({ href: url.area(ct) + '#local', label: x })))}
  <h3>AC repair in nearby cities</h3>
  ${cloud(near.map((n) => ({ href: url.area(n.area), label: `${n.area.name}, ${n.area.stateAbbr}` })))}
</div></section>

<section class="sec"><div class="wrap">
  <h2>AC repair questions in ${esc(ct.name)}</h2>
  ${faqBlock(c.faqs)}
</div></section>

${requestForm(cfg, { heading: `Request AC service in ${ct.name}`, area: ct.name })}
`;
  add(url.area(ct), layout({
    og: 'houston-skyline',
    cfg, path: url.area(ct), crumbs,
    title: fitTitle(
      `AC Repair Services in ${ct.name}, ${ct.stateAbbr} | AC Repair Houston`,
      `AC Repair Services in ${ct.name} | AC Repair Houston`,
      `AC Repair Services ${ct.name} | AC Repair Houston`,
    ),
    description: fitDescription(
      `Request AC repair in ${ct.name}, ${ct.stateAbbr}. Same-day and emergency requests welcome. Free to request, we send it to an HVAC company covering ${ct.name}.`,
      `Request AC repair in ${ct.name}. Same-day and emergency requests welcome. Free to request, we send it to an HVAC company covering ${ct.name}.`,
      `AC repair in ${ct.name}. Same-day and emergency requests welcome. Free to request, we send it to a local HVAC company.`,
    ),
    jsonld: [
      orgSchema(cfg),
      serviceSchema(cfg, {
        name: `AC repair in ${ct.name}, ${ct.stateAbbr}`,
        description: c.intro || '',
        areaServed: { '@type': 'City', name: ct.name, containedInPlace: { '@type': 'State', name: ct.state } },
        path: url.area(ct),
      }),
      faqSchema(cfg, c.faqs, url.area(ct)),
      breadcrumbSchema(cfg, crumbs),
    ].filter(Boolean),
    body,
  }), { lastmod: c.lastmod, priority: '0.8', changefreq: 'monthly' });

  /* ---- area x service ---- */
  for (const s of svcs) {
    const sc = c.services?.[s.slug];
    if (!sc) { problems.push(`MISSING area x service copy: ${ct.slug} / ${s.slug}`); continue; }
    scan(`area-${ct.slug}/${s.slug}`, sc);
    const cs = [CRUMB_HOME, { name: 'Service areas', href: url.areas() },
      { name: ct.name, href: url.area(ct) }, { name: s.name }];
    const sibs = svcs.filter((x) => x.slug !== s.slug);

    const b = `
<section class="hero"><div class="wrap hero__grid">
  <div class="hero__main">
    <span class="kicker">${esc(ct.name)}, ${esc(ct.stateAbbr)}</span>
    <h1>${esc(s.name)} in ${esc(ct.name)}</h1>
    <p class="hero__intro">${esc(sc.intro || '')}</p>
    <div class="btn-row">
      <a class="btn btn--call" href="#request">Request ${esc(s.name)} in ${esc(ct.name)}</a>
    </div>
  </div>
  <div class="dispatch">
    <span class="l">${esc(s.name)}</span>
    <span class="n">Free to request</span>
    <span class="free">No cost to you</span>
    <p class="sub-t">Describe what the system is doing and we send it to an HVAC company that covers ${esc(ct.name)}, who comes back with a next step.</p>
    <ul>${s.symptoms.slice(0, 4).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
  </div>
</div></section>

<section class="sec"><div class="wrap">
  <h2>Why ${esc(s.name)} problems come up in ${esc(ct.name)}</h2>
  <p class="lede">${esc(sc.localNote || '')}</p>
  <div class="note${s.safetyFirst ? ' note--safety' : ''}">
    <h3>What to check before you call a technician</h3>
    <p>${esc(s.firstStep)}</p>
  </div>
</div></section>

<section class="sec sec--paper"><div class="wrap">
  <h2>Questions about ${esc(s.name)} in ${esc(ct.name)}</h2>
  ${faqBlock(sc.faqs)}
</div></section>

<section class="sec"><div class="wrap">
  <span class="kicker">Also in ${esc(ct.name)}</span>
  <h2>Other AC services in ${esc(ct.name)}</h2>
  ${cardGrid(sibs.map((x) => ({ href: url.areaService(ct, x), title: `${x.name} in ${ct.name}`, urgent: x.tier === 'urgency' })), 'grid grid--4')}
  ${(() => {
    /* Not every service is carried in every area. Where it is, the page
       links the same service in the areas that offer it. Where it is not,
       an empty list would be worse than saying so plainly. */
    const elsewhere = near
      .filter((n) => areaSvcs.get(n.area.slug).some((x) => x.slug === s.slug))
      .slice(0, 5)
      .map((n) => ({ href: url.areaService(n.area, s), label: `${s.name} in ${n.area.name}` }));
    if (!elsewhere.length) {
      return `<p class="small muted">${esc(s.name)} is handled in ${esc(ct.name)}. <a href="${url.service(s)}">What the job covers</a>,
  and <a href="${url.area(ct)}">everything else covered in ${esc(ct.name)}</a>.</p>`;
    }
    return `<h3>${esc(s.name)} in nearby areas</h3>
  ${cloud(elsewhere)}
  <p class="small muted">See all <a href="${url.service(s)}">${esc(s.name.toLowerCase())} coverage</a>,
  or everything covered in <a href="${url.area(ct)}">${esc(ct.name)}</a>.</p>`;
  })()}
</div></section>

${requestForm(cfg, { heading: `Request ${s.name.toLowerCase()} in ${ct.name}`, area: ct.name, service: s.name })}
`;
    add(url.areaService(ct, s), layout({
    og: 'airflow',
      cfg, path: url.areaService(ct, s), crumbs: cs,
      title: fitTitle(
        `${s.name} in ${ct.name}, ${ct.stateAbbr} | AC Repair Houston`,
        `${s.name} in ${ct.name} | AC Repair Houston`,
        // The state abbreviation is what keeps this from colliding with the
        // national service page, whose title is the same service and the same
        // city without it.
        `${s.name} ${ct.name}, ${ct.stateAbbr} | AC Repair Houston`,
        // The long place names do not leave room for the brand and the
        // service in the same 62 characters. The brand is on the page, in the
        // H1 and in og:site_name, so a title that carries the service and the
        // city intact beats one that gets cut off mid-word.
        `${s.name} in ${ct.name}, ${ct.stateAbbr}`,
        `${s.name} ${ct.name}`,
      ),
      description: fitDescription(
        `${s.name} in ${ct.name}, ${ct.stateAbbr}. Request it free and we send it to an HVAC company covering ${ct.name}. Same-day and emergency requests welcome.`,
        `${s.name} in ${ct.name}. Request it free and we send it to an HVAC company covering ${ct.name}. Same-day and emergency requests welcome.`,
        `${s.name} in ${ct.name}. Request it free and we send it to a local HVAC company. Same-day and emergency requests welcome.`,
      ),
      jsonld: [
        orgSchema(cfg),
        serviceSchema(cfg, {
          name: `${s.name} in ${ct.name}, ${ct.stateAbbr}`,
          description: sc.intro || '',
          areaServed: { '@type': 'City', name: ct.name, containedInPlace: { '@type': 'State', name: ct.state } },
          path: url.areaService(ct, s),
        }),
        faqSchema(cfg, sc.faqs, url.areaService(ct, s)),
        breadcrumbSchema(cfg, cs),
      ].filter(Boolean),
      body: b,
    }), { lastmod: c.lastmod, priority: '0.7', changefreq: 'monthly' });
  }
}

/* ============================ NEIGHBORHOOD PAGES ============================
   Houston neighborhoods. These are the pages behind the neighborhood chips on
   the Houston page rather than links that bounce back to the same page. */
for (const n of pillar.areas) {
  const ac = copy(`neighborhood-${n.slug}.json`,
    ['h1', 'title', 'description', 'intro', 'localAngle', 'commonCalls', 'landmarks', 'faqs']);
  if (!ac) continue;
  scan(`neighborhood-${n.slug}`, ac);
  checkTraits(pillar, ac);

  const sibs = pillar.areas.filter((x) => x.slug !== n.slug);
  const cs = [CRUMB_HOME, { name: 'Service areas', href: url.areas() },
    { name: 'Houston', href: url.area(pillar) }, { name: n.name }];

  const body = `
<section class="sec"><div class="wrap">
  <span class="kicker">${esc(n.name)}, ${esc(pillar.stateAbbr)}</span>
  <h1>${esc(ac.h1)}</h1>
  <p class="lede">${esc(ac.intro)}</p>
  <div class="btn-row">
    <a class="btn btn--call" href="#request">Request AC service in ${esc(n.name)}</a>
  </div>
</div></section>

<section class="sec sec--paper"><div class="wrap">
  <span class="kicker">Local detail</span>
  <h2>AC repair in ${esc(n.name)}</h2>
  <p class="lede">${esc(ac.localAngle)}</p>
  <h3>Common AC repair calls in ${esc(n.name)}</h3>
  <ul class="ticks">${(ac.commonCalls || []).map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
</div></section>

<section class="sec"><div class="wrap">
  <span class="kicker">Every service</span>
  <h2>AC services in ${esc(n.name)}</h2>
  ${serviceRows(areaSvcs.get(pillar.slug).map((sv) => ({
    href: url.areaService(pillar, sv), title: `${sv.name} in ${n.name}`,
    urgent: sv.tier === 'urgency', tag: sv.tier === 'urgency' ? 'Urgent' : null,
    body: sv.problem,
  })))}
</div></section>

<section class="sec"><div class="wrap">
  <h2 id="local">Nearby Houston neighborhoods</h2>
  ${cloud((ac.landmarks || []).map((x) => ({ href: url.neighborhood(pillar, n) + '#local', label: x })))}
  <h3>Other Houston neighborhoods</h3>
  ${cloud(sibs.map((x) => ({ href: url.neighborhood(pillar, x), label: x.name })))}
  <p class="small muted">Back to <a href="${url.area(pillar)}">AC repair across Houston</a>.</p>
</div></section>

<section class="sec sec--paper"><div class="wrap">
  <h2>AC repair questions in ${esc(n.name)}</h2>
  ${faqBlock(ac.faqs)}
</div></section>

${requestForm(cfg, { heading: `Request AC service in ${n.name}`, area: pillar.name })}
`;
  add(url.neighborhood(pillar, n), layout({
    og: 'thermostat',
    cfg, path: url.neighborhood(pillar, n), crumbs: cs,
    title: ac.title, description: ac.description,
    jsonld: [
      orgSchema(cfg),
      serviceSchema(cfg, {
        name: `AC repair in ${n.name}, ${pillar.stateAbbr}`, description: ac.intro,
        areaServed: { '@type': 'Place', name: `${n.name}, ${pillar.stateAbbr}` },
        path: url.neighborhood(pillar, n),
      }),
      faqSchema(cfg, ac.faqs, url.neighborhood(pillar, n)),
      breadcrumbSchema(cfg, cs),
    ].filter(Boolean),
    body,
  }), { lastmod: ac.lastmod, priority: '0.6', changefreq: 'monthly' });
}

/* ============================ STATIC PAGES ============================ */
for (const [p, title, desc, file] of [
  [url.howItWorks(), 'How AC Repair Houston Works', 'How our free AC repair referral service works. Request once and we send it to an HVAC company that covers your area of Houston.', 'page-how-it-works.json'],
  [url.forCompanies(), 'Get AC Repair Leads in Houston', 'Join the AC Repair Houston network and take AC service requests from homeowners across Houston and Greater Houston.', 'page-for-companies.json'],
  [url.privacy(), 'Privacy Policy', 'What AC Repair Houston collects when you send a request, who we share it with, and how to ask us to delete it. We do not sell your details to marketing lists.', 'page-privacy.json'],
  [url.terms(), 'Terms of Service', 'AC Repair Houston is a free referral service, not an AC repair contractor. Your agreement is with the independent company that takes the job.', 'page-terms.json'],
]) {
  const c = copy(file, ['intro', 'sections']) || {};
  scan(file, c);
  const crumbs = [CRUMB_HOME, { name: title }];
  const body = `
<section class="sec"><div class="wrap">
  <h1>${esc(title)}</h1>
  <p class="lede">${esc(c.intro || '')}</p>
  ${(c.sections || []).map((s) => `<h2>${esc(s.h)}</h2><p class="lede">${esc(s.p)}</p>`).join('\n  ')}
</div></section>
${requestForm(cfg)}`;
  add(p, layout({ cfg, path: p, crumbs, title: `${title} | AC Repair Houston`, description: desc, navCurrent: p,
    og: 'coil-compare',
    jsonld: [orgSchema(cfg), breadcrumbSchema(cfg, crumbs)], body }), { lastmod: c.lastmod, priority: '0.3', changefreq: 'yearly' });
}

/* ============================ HTML SITEMAP ============================
   A human-readable index of every page. Also the single flattest crawl
   path on the site: every page is one hop from here. */
{
  const crumbs = [CRUMB_HOME, { name: 'Sitemap' }];
  const body = `
<section class="sec"><div class="wrap">
  <span class="kicker">Every page</span>
  <h1>Sitemap</h1>
  <p class="lede">All ${pages.length + 1} pages on this site. If you are looking for an area that is
  not listed, request anyway. Coverage is wider than this page.</p>
</div></section>

<section class="sec"><div class="wrap">
  <h2>Main</h2>
  ${cloud([
    { href: '/', label: 'Home' },
    { href: url.services(), label: 'All services' },
    { href: url.areas(), label: 'All service areas' },
    { href: url.howItWorks(), label: 'How it works' },
    { href: url.forCompanies(), label: 'For HVAC companies' },
    { href: url.privacy(), label: 'Privacy' },
    { href: url.terms(), label: 'Terms' },
  ])}
</div></section>

<section class="sec"><div class="wrap">
  <h2>Services</h2>
  <div class="cols">
    <div class="linkcol"><span class="linkcol__lbl" id="sm-e">Urgent</span>
      <ul aria-labelledby="sm-e">${cfg._nav.urgency.map((x) => `<li><a href="${url.service(x)}">${esc(x.name)}</a></li>`).join('')}</ul></div>
    <div class="linkcol"><span class="linkcol__lbl" id="sm-r">Repair and install</span>
      <ul aria-labelledby="sm-r">${services.filter((x) => x.tier === 'core').map((x) => `<li><a href="${url.service(x)}">${esc(x.name)}</a></li>`).join('')}</ul></div>
  </div>
</div></section>

<section class="sec"><div class="wrap">
  <h2>Service areas</h2>
  <div class="cols">
    <div class="linkcol"><span class="linkcol__lbl" id="sm-houston">Houston</span>
      <ul aria-labelledby="sm-houston"><li><a href="${url.area(pillar)}">Houston, TX</a></li>
      ${areaSvcs.get(pillar.slug).map((sv) => `<li><a href="${url.areaService(pillar, sv)}">${esc(sv.name)}</a></li>`).join('')}
      ${pillar.areas.map((n) => `<li><a href="${url.neighborhood(pillar, n)}">${esc(n.name)}</a></li>`).join('')}</ul></div>
    ${cities.map((ct) => `<div class="linkcol">
      <span class="linkcol__lbl" id="sm-${ct.slug}"><a href="${url.area(ct)}">${esc(ct.name)}</a></span>
      <ul aria-labelledby="sm-${ct.slug}">${areaSvcs.get(ct.slug).map((sv) => `<li><a href="${url.areaService(ct, sv)}">${esc(sv.name)}</a></li>`).join('')}</ul>
    </div>`).join('\n    ')}
  </div>
</div></section>

<section class="sec sec--paper"><div class="wrap">
  <h2>For search engines</h2>
  <p class="lede">The machine-readable version lives at
  <a href="/sitemap.xml">/sitemap.xml</a>.</p>
</div></section>

${requestForm(cfg)}`;
  add(url.sitemap(), layout({
    og: 'gauges',
    cfg, path: url.sitemap(), crumbs,
    title: 'Sitemap | AC Repair Houston',
    description: `Every page on AC Repair Houston: all AC services, Houston and ${cities.length} Greater Houston cities, and Houston neighborhoods. One hop to anything on the site.`,
    navCurrent: url.sitemap(),
    jsonld: [orgSchema(cfg), breadcrumbSchema(cfg, crumbs)],
    body,
  }), { priority: '0.2', changefreq: 'monthly' });
}

/* ---------- SEO gate ----------
   The nav dropdown labels used to be <h4>, which made the first heading on all
   pages an h4 rather than the h1. Nothing caught it because the page still
   looked right. These run on every build now. */
for (const pg of pages) {
  const body = pg.html.replace(/<script[\s\S]*?<\/script>/gi, ' ');
  const hs = [...body.matchAll(/<h([1-6])[^>]*>([\s\S]*?)<\/h\1>/gi)]
    .map((m) => ({ lvl: +m[1], txt: m[2].replace(/<[^>]+>/g, '').trim().slice(0, 40) }));

  if (!hs.length) { problems.push(`SEO ${pg.path}: no headings`); continue; }
  if (hs[0].lvl !== 1) problems.push(`SEO ${pg.path}: first heading is h${hs[0].lvl} ("${hs[0].txt}"), must be h1`);
  const n1 = hs.filter((x) => x.lvl === 1).length;
  if (n1 !== 1) problems.push(`SEO ${pg.path}: ${n1} h1 elements, must be exactly 1`);
  let prev = 0;
  for (const { lvl, txt } of hs) {
    if (prev && lvl > prev + 1) { problems.push(`SEO ${pg.path}: heading jumps h${prev} to h${lvl} ("${txt}")`); break; }
    prev = lvl;
  }

  const t = pg.html.match(/<title>(.*?)<\/title>/);
  if (!t) problems.push(`SEO ${pg.path}: no title`);
  else if (t[1].length > 62) problems.push(`SEO ${pg.path}: title ${t[1].length} chars, truncates past 62`);
  else if (t[1].length < 25) problems.push(`SEO ${pg.path}: title only ${t[1].length} chars`);

  const d = pg.html.match(/name="description" content="([^"]*)"/);
  if (!d) problems.push(`SEO ${pg.path}: no meta description`);
  else if (d[1].length > 165 || d[1].length < 70)
    problems.push(`SEO ${pg.path}: meta description ${d[1].length} chars, want 70-165`);

  if (!/property="og:image"/.test(pg.html)) problems.push(`SEO ${pg.path}: no og:image`);
  if (!/rel="canonical"/.test(pg.html)) problems.push(`SEO ${pg.path}: no canonical`);
  for (const im of body.match(/<img[^>]*>/g) || []) {
    if (!/alt="[^"]+"/.test(im)) problems.push(`SEO ${pg.path}: img without alt`);
  }
  if (!/id="request"/.test(pg.html)) problems.push(`SEO ${pg.path}: no request form section`);
}

/* ---------- the phone ----------
   One number, owned by this site, and it is the number in data/config.json.
   Two flags control it. publish says whether a call button exists at all.
   verified says whether the number is the real one. A published but unverified
   number is a placeholder, so the build prints a launch blocker rather than
   failing, but a placeholder can never be marked verified, so the placeholder
   cannot quietly reach production. */
const PHONE_LIKE = /(?:\+?1[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/g;
const PHONE_PLACEHOLDER = /\(555\)|010-0000|555-01|\b000-0000\b/;
const normPhone = (s) => {
  let d = String(s).replace(/\D/g, '');
  if (d.length === 11 && d.startsWith('1')) d = d.slice(1);
  return d;
};
const phone = cfg.phone || {};
const phonePublished = phone.publish === true;
const phoneNumber = phonePublished ? normPhone(phone.e164 || '') : '';

if (phonePublished) {
  if (!phoneNumber) problems.push('PHONE: publish is true but e164 is missing or malformed');
  if (phone.verified === true && PHONE_PLACEHOLDER.test(`${phone.e164 || ''} ${phone.display || ''}`)) {
    problems.push('PHONE: marked verified, but the number still looks like a placeholder');
  }
}

/* ---------- truth gate ----------
   The facts about this business that must never appear on a page, checked on
   every build rather than trusted to review. A referral site with no operator
   that publishes a street address, a LocalBusiness node or a rating is
   claiming to be a local business it is not, which is a consumer protection
   problem and not only a SEO one. A phone number is allowed now, but only the
   one in the config, and only when it is published. */
for (const pg of pages) {
  const p = pg.path;
  if (!phonePublished) {
    if (/tel:/i.test(pg.html)) problems.push(`TRUTH ${p}: contains a tel: link, but no phone number is published`);
    if (PHONE_LIKE.test(pg.html)) problems.push(`TRUTH ${p}: contains a phone number`);
  } else {
    for (const m of pg.html.matchAll(PHONE_LIKE)) {
      if (normPhone(m[0]) !== phoneNumber) {
        problems.push(`TRUTH ${p}: contains a phone number that is not the published one: "${m[0]}"`);
      }
    }
    for (const m of pg.html.matchAll(/href="tel:([^"]+)"/gi)) {
      if (normPhone(m[1]) !== phoneNumber) {
        problems.push(`TRUTH ${p}: tel: link points at an unpublished number: "${m[1]}"`);
      }
    }
  }
  if (/"@type"\s*:\s*"(LocalBusiness|Plumber|HVACBusiness)"/.test(pg.html)) problems.push(`TRUTH ${p}: has LocalBusiness schema`);
  if (/"streetAddress"/.test(pg.html)) problems.push(`TRUTH ${p}: has a street address`);
  if (!phonePublished && /"telephone"/.test(pg.html)) problems.push(`TRUTH ${p}: has a telephone in schema`);
  if (/aggregateRating/.test(pg.html)) problems.push(`TRUTH ${p}: has aggregateRating`);
  if (/"review"/.test(pg.html) && !/reviewCount/.test(pg.html)) problems.push(`TRUTH ${p}: has review markup`);
  if (/(our technicians|our techs|our trucks|our crew|our installers|we are licensed|we are certified|we are bonded)/i.test(pg.html)) {
    problems.push(`TRUTH ${p}: claims to employ technicians or hold a licence`);
  }
  for (const s of pg.html.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)) {
    try { JSON.parse(s[1]); }
    catch (e) { problems.push(`TRUTH ${p}: JSON-LD does not parse: ${e.message}`); }
  }
}

/* ---------- every class used must exist in the stylesheet ----------
   A renamed design system silently drops styling otherwise, and the page
   still "works" so nothing catches it. */
{
  const css = fs.readFileSync(path.join(ROOT, 'public/assets/site.css'), 'utf8');
  const defined = new Set([...css.matchAll(/\.([a-zA-Z][\w-]*)/g)].map((m) => m[1]));
  const used = new Set();
  for (const pg of pages) {
    for (const m of pg.html.matchAll(/class="([^"]*)"/g)) {
      for (const c of m[1].split(/\s+/)) if (c) used.add(c);
    }
  }
  const missing = [...used].filter((c) => !defined.has(c)).sort();
  if (missing.length) problems.push(`CLASSES WITH NO CSS: ${missing.join(', ')}`);
}

/* ============================ 404 ============================ */
{
  const crumbs = [CRUMB_HOME, { name: 'Page not found' }];
  const body = `
<section class="sec"><div class="wrap">
  <span class="kicker">404</span>
  <h1>That page is not here</h1>
  <p class="lede">The link may be old, or the page may have moved. Everything on the site is one
  hop from the sitemap, and if you were looking for AC service in your area you can request it directly.</p>
  ${cloud([
    { href: '/', label: 'Home' },
    { href: url.services(), label: 'All services' },
    { href: url.areas(), label: 'All service areas' },
    { href: url.sitemap(), label: 'Sitemap' },
  ])}
</div></section>

${requestForm(cfg)}`;
  add('/404.html', layout({
    og: 'coil-compare',
    cfg, path: '/404.html', crumbs,
    title: 'Page Not Found | AC Repair Houston',
    description: 'That page is not here. Find AC repair in Houston and the surrounding area, or send a request directly.',
    jsonld: [orgSchema(cfg)],
    body,
  }), { priority: '0.1', changefreq: 'yearly' });
}

/* ============================ WRITE ============================ */
/* Removing the output directory fails while a dev server is serving it, which
   on Windows means the file handle is still open. Retry a few times before
   giving up, so `npm run dev` can rebuild without the server being stopped
   first. */
function clearOutput(dir, attempts = 5) {
  for (let i = 0; i < attempts; i += 1) {
    try {
      fs.rmSync(dir, { recursive: true, force: true });
      return;
    } catch (e) {
      if (i === attempts - 1) {
        throw new Error(
          `Could not clear ${dir}. If a dev server is running, stop it first ` +
          `(npm run dev serves this directory and holds a lock on it).`,
        );
      }
      /* Busy-wait briefly between attempts. Atomics.wait blocks without
         spinning the CPU. */
      Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 250);
    }
  }
}

clearOutput(OUT);
fs.mkdirSync(OUT, { recursive: true });
fs.cpSync(path.join(ROOT, 'public'), OUT, { recursive: true });

for (const p of pages) {
  if (p.path === '/404.html') {
    fs.writeFileSync(path.join(OUT, '404.html'), p.html);
    continue;
  }
  const dir = path.join(OUT, p.path);
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'index.html'), p.html);
}

/* sitemap + robots
   The lastmod on a URL is the date its copy file was last edited, not the
   date the build ran. A build date on every URL tells a crawler that
   everything changed every time, which is a signal worth ignoring, so it is
   better to publish a date we can defend or to publish none at all. */
const sitemapUrl = (p) => {
  const parts = [`  <url><loc>${cfg.origin}${p.path}</loc>`];
  if (p.lastmod) parts.push(`<lastmod>${p.lastmod}</lastmod>`);
  if (p.changefreq) parts.push(`<changefreq>${p.changefreq}</changefreq>`);
  if (p.priority) parts.push(`<priority>${p.priority}</priority>`);
  return `${parts.join('')}</url>`;
};
fs.writeFileSync(path.join(OUT, 'sitemap.xml'),
  `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n` +
  pages.filter((p) => p.path !== '/404.html').map(sitemapUrl).join('\n') +
  `\n</urlset>\n`);
fs.writeFileSync(path.join(OUT, 'robots.txt'),
  `User-agent: *\nAllow: /\n\nSitemap: ${cfg.origin}/sitemap.xml\n`);

/* ============================ AUDIT ============================ */
const graph = auditGraph(pages);
if (graph.orphans.length) problems.push(`ORPHAN PAGES (no inbound internal link): ${graph.orphans.join(', ')}`);
if (graph.dangling.length) problems.push(`DANGLING LINKS (target does not exist): ${graph.dangling.join(', ')}`);

console.log(`\n  built ${pages.length} pages -> dist/`);
console.log(`  internal links: ${graph.totalEdges}, median inbound: ${graph.medianInbound}`);
console.log(`  orphans: ${graph.orphans.length}, dangling: ${graph.dangling.length}`);
if (graph.thinlyLinked.length) {
  console.log(`  thinly linked (<8 outbound): ${graph.thinlyLinked.length}`);
}
if (!cfg.domainConfirmed) {
  console.log(`\n  !! DOMAIN IS A PLACEHOLDER (${cfg.domain})`);
  console.log(`     Set domain + origin + domainConfirmed:true in data/config.json once the real`);
  console.log(`     domain is purchased and DNS points at the host.`);
}
if (cfg.conversion.status !== 'active') {
  console.log(`\n  !! REQUEST FORM IS NOT LIVE (endpoint ${cfg.conversion.endpoint}, status "${cfg.conversion.status}")`);
  console.log(`     Deploy the handler, then set conversion.status to "active" in data/config.json.`);
}
if (cfg.phone?.publish && cfg.phone.verified !== true) {
  console.log(`\n  !! PHONE IS A PLACEHOLDER (${cfg.phone.display})`);
  console.log(`     Put the live call tracking number in data/config.json and set phone.verified to true.`);
  console.log(`     The build refuses to mark a placeholder as verified, so this cannot ship by accident.`);
}
if (problems.length) {
  console.error(`\n  BUILD PROBLEMS (${problems.length}):`);
  for (const p of problems.slice(0, 40)) console.error('   - ' + p);
  if (problems.length > 40) console.error(`   ... and ${problems.length - 40} more`);
  process.exitCode = 1;
} else {
  console.log('\n  no content violations, no orphans, no dangling links.\n');
}
