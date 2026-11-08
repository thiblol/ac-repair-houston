/* ==========================================================================
   Templates. Structure only. Every sentence of prose comes from data/copy/,
   written per page. Nothing here invents a claim.
   ========================================================================== */

import { url } from './links.mjs';

export const esc = (s = '') =>
  String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

/* ---------- title and description budgets ----------
   Browsers truncate a title past roughly 60 characters and a description past
   about 165. Long place names push both over: "West University Place" adds
   nine characters to every area page it appears on. So build a few variants
   from longest to shortest and take the first that fits, rather than shipping
   something that gets cut off mid-word. */
export function fitTitle(...variants) {
  for (const v of variants) {
    const t = String(v).trim();
    if (t.length >= 25 && t.length <= 62) return t;
  }
  return String(variants[variants.length - 1]).trim();
}

export function fitDescription(...variants) {
  for (const v of variants) {
    const d = String(v).trim();
    if (d.length >= 70 && d.length <= 165) return d;
  }
  return String(variants[variants.length - 1]).trim();
}

/* ---------- shell ----------
   og picks the illustration for the social card. Facebook, X and LinkedIn
   render JPEG and PNG in an og:image and ignore SVG and WebP, so every card
   is the 1200 by 630 JPEG that build-images.mjs renders next to the WebP.
   The card is one per page type rather than one per page, so the illustration
   that best represents the page is what gets shared. */
export function layout({ cfg, title, description, path, crumbs = [], body, jsonld = [], navCurrent, og = 'hero-condenser' }) {
  const canonical = cfg.origin + path;
  const ogImage = `${cfg.origin}/img/${og}-og.jpg`;
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}</title>
<meta name="description" content="${esc(description)}">
<link rel="canonical" href="${canonical}">
<meta property="og:type" content="website">
<meta property="og:title" content="${esc(title)}">
<meta property="og:description" content="${esc(description)}">
<meta property="og:url" content="${canonical}">
<meta property="og:locale" content="en_US">
<meta property="og:site_name" content="${esc(cfg.brand)}">
<meta property="og:image" content="${ogImage}">
<meta property="og:image:type" content="image/jpeg">
<meta property="og:image:width" content="1200">
<meta property="og:image:height" content="630">
<meta property="og:image:alt" content="${esc(title)}">
<meta name="twitter:card" content="summary_large_image">
<meta name="twitter:title" content="${esc(title)}">
<meta name="twitter:description" content="${esc(description)}">
<meta name="twitter:image" content="${ogImage}">
<meta name="twitter:image:alt" content="${esc(title)}">
${process.env.STAGING
  ? '<meta name="robots" content="noindex,nofollow">'
  : '<meta name="robots" content="index,follow,max-image-preview:large,max-snippet:-1">'}
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="apple-touch-icon" href="/icon-180.png">
<link rel="manifest" href="/site.webmanifest">
<meta name="theme-color" content="#0B5FD1">
<link rel="preload" href="/assets/fonts/archivo-narrow-700.woff2" as="font" type="font/woff2" crossorigin>
<link rel="preload" href="/assets/fonts/archivo-400.woff2" as="font" type="font/woff2" crossorigin>
<link rel="stylesheet" href="/assets/site.css">
<script src="/assets/main.js" defer></script>
${jsonld.map((j) => `<script type="application/ld+json">\n${JSON.stringify(j, null, 1)}\n</script>`).join('\n')}
</head>
<body>
<a class="skip" href="#main">Skip to content</a>
${header(cfg, navCurrent)}
${ribbon(cfg)}
<main id="main">
${crumbs.length ? breadcrumb(crumbs) : ''}
${body}
</main>
${footer(cfg)}
${formbar(cfg)}
</body>
</html>
`;
}

function header(cfg, current) {
  const svc = cfg._nav.services;
  const urgency = svc.filter((x) => x.tier === 'urgency');
  const core = svc.filter((x) => x.tier === 'core');
  const half = Math.ceil(core.length / 2);
  const areas = cfg._nav.areas;
  const pillar = cfg._nav.pillar;
  const q = Math.ceil(areas.length / 3);

  const li = (href, label) => `<li><a href="${href}">${esc(label)}</a></li>`;
  let colN = 0;
  const col = (h, items) => {
    const id = `subcol-${++colN}`;
    return `<div class="sub__col">${h ? `<span class="sub__lbl" id="${id}">${esc(h)}</span>` : ''}` +
      `<ul${h ? ` aria-labelledby="${id}"` : ''}>${items.join('')}</ul></div>`;
  };

  const servicesPanel = `<div class="sub"><div class="sub__in">
      ${col('Urgent', urgency.map((x) => li(url.service(x), x.name)))}
      ${col('Repair', core.slice(0, half).map((x) => li(url.service(x), x.name)))}
      ${col('Repair and install', core.slice(half).map((x) => li(url.service(x), x.name)))}
      <div class="sub__cta">
        <strong>Not sure what you need?</strong>
        <span>Describe it in the form and it goes to an HVAC company that covers your area.</span>
        <a class="btn btn--call" href="#request">Request service</a>
      </div>
    </div></div>`;

  const areasPanel = `<div class="sub"><div class="sub__in">
      ${col('Houston', [li(url.area(pillar), `${pillar.name}, ${pillar.stateAbbr}`)])}
      ${col('Greater Houston', areas.slice(0, q).map((x) => li(url.area(x), `${x.name}, ${x.stateAbbr}`)))}
      ${col(null, areas.slice(q, q * 2).map((x) => li(url.area(x), `${x.name}, ${x.stateAbbr}`)))}
      ${col(null, areas.slice(q * 2).map((x) => li(url.area(x), `${x.name}, ${x.stateAbbr}`)))}
    </div></div>`;

  const mobilePanel = `<div class="mnav__panel"><div class="mnav__grid">
      <div><span class="mnav__lbl" id="mn-e">Urgent</span><ul aria-labelledby="mn-e">${urgency.map((x) => li(url.service(x), x.name)).join('')}</ul></div>
      <div><span class="mnav__lbl" id="mn-s">Services</span><ul aria-labelledby="mn-s">${core.map((x) => li(url.service(x), x.name)).join('')}</ul></div>
      <div><span class="mnav__lbl" id="mn-l">Service areas</span><ul aria-labelledby="mn-l">${[li(url.area(pillar), 'Houston'), ...areas.map((x) => li(url.area(x), x.name))].join('')}</ul></div>
      <div><span class="mnav__lbl" id="mn-m">More</span><ul aria-labelledby="mn-m">${[
        li(url.services(), 'All services'),
        li(url.areas(), 'All service areas'),
        li(url.howItWorks(), 'How it works'),
        li(url.forCompanies(), 'For HVAC companies'),
      ].join('')}</ul></div>
    </div></div>`;

  return `<header class="hdr">
  <div class="wrap hdr__in">
    <a class="brand" href="/" aria-label="${esc(cfg.brand)}, home">
      <span class="brand__badge" aria-hidden="true">AC</span>
      <span class="brand__lock">
        <span class="brand__name">${esc(cfg.brand)}</span>
        <span class="brand__tag">Houston &middot; AC repair &amp; install</span>
      </span>
    </a>

    <nav class="dnav" aria-label="Main">
      <ul>
        <li class="has-sub">
          <a class="dnav__link" href="${url.services()}"${current === url.services() ? ' aria-current="page"' : ''}>Services</a>
          ${servicesPanel}
        </li>
        <li class="has-sub">
          <a class="dnav__link" href="${url.areas()}"${current === url.areas() ? ' aria-current="page"' : ''}>Service areas</a>
          ${areasPanel}
        </li>
        <li><a class="dnav__link" href="${url.howItWorks()}"${current === url.howItWorks() ? ' aria-current="page"' : ''}>How it works</a></li>
        <li><a class="dnav__link" href="${url.forCompanies()}"${current === url.forCompanies() ? ' aria-current="page"' : ''}>For HVAC companies</a></li>
      </ul>
    </nav>

    <details class="mnav">
      <summary class="mnav__btn" aria-label="Menu"><i></i><i></i><i></i></summary>
      ${mobilePanel}
    </details>

    <a class="hdr__cta" href="#request">Request service</a>
  </div>
</header>`;
}

function ribbon(cfg) {
  return `<div class="ribbon"><div class="wrap">
    <span>&#9679; Houston heat is on. Same-day AC repair available.</span>
  </div></div>`;
}

function breadcrumb(crumbs) {
  return `<nav class="wrap crumb" aria-label="Breadcrumb"><ol>
${crumbs
  .map((c, i) =>
    i === crumbs.length - 1
      ? `    <li aria-current="page">${esc(c.name)}</li>`
      : `    <li><a href="${c.href}">${esc(c.name)}</a></li>`
  )
  .join('\n')}
</ol></nav>`;
}

function formbar(cfg) {
  return `<div class="callbar">
  <a class="btn btn--call" href="#request">Request AC service</a>
</div>`;
}

function footer(cfg) {
  let fN = 0;
  const col = (h, links) => {
    const id = `ftr-${++fN}`;
    return `<div class="linkcol"><span class="linkcol__lbl" id="${id}">${esc(h)}</span>` +
      `<ul aria-labelledby="${id}">${links.map((l) => `<li><a href="${l.href}">${esc(l.label)}</a></li>`).join('')}</ul></div>`;
  };
  return `<footer class="ftr">
  <div class="wrap">
    <div class="ftr__cols">
      ${col('Urgent', cfg._nav.urgency.map((s) => ({ href: url.service(s), label: s.name })))}
      ${col('Popular services', [{ href: url.services(), label: 'All services' }, ...cfg._nav.services.filter((s) => s.tier === 'core').slice(0, 8).map((s) => ({ href: url.service(s), label: s.name }))])}
      ${col('Houston', [{ href: url.area(cfg._nav.pillar), label: `Houston, ${cfg._nav.pillar.stateAbbr}` }, ...cfg._nav.pillar.areas.slice(0, 7).map((n) => ({ href: url.neighborhood(cfg._nav.pillar, n), label: n.name }))])}
      ${col('Service areas', [{ href: url.areas(), label: 'All service areas' }, ...cfg._nav.areas.map((c) => ({ href: url.area(c), label: `${c.name}, ${c.stateAbbr}` }))])}
    </div>
    <div class="disclosure">
      <strong>How this works.</strong> ${esc(cfg.disclosure)}
    </div>
    <div class="ftr__legal">
      <p>AC Repair Houston is a referral service and is not an AC repair contractor. Licensing,
      insurance, pricing and the work itself are the responsibility of the independent HVAC
      company that takes your request. Always confirm a contractor's license with the Texas
      Department of Licensing and Regulation before work begins.</p>
      <p><a href="${url.howItWorks()}">How it works</a> &middot; <a href="${url.forCompanies()}">For HVAC companies</a>
      &middot; <a href="${url.sitemap()}">Sitemap</a> &middot; <a href="${url.privacy()}">Privacy</a>
      &middot; <a href="${url.terms()}">Terms</a></p>
    </div>
  </div>
</footer>`;
}

/* ---------- responsive images ----------
   Width and height are always emitted so the box is reserved before the file
   lands: no layout shift on a slow connection, which is the whole audience.
   Alt text describes the SCENE. It never says "our technician": these are
   illustrative diagrams, and this site does not employ anybody. */
const IMG = {
  'hero-condenser': { w: 1600, h: 900, sizes: [1600, 960, 640] },
  'unit-anatomy': { w: 1200, h: 820, sizes: [1200, 800] },
  'airflow': { w: 1200, h: 800, sizes: [1200, 800] },
  'thermostat': { w: 900, h: 900, sizes: [900, 600] },
  'gauges': { w: 1200, h: 800, sizes: [1200, 800] },
  'coil-compare': { w: 1200, h: 700, sizes: [1200, 800] },
  'houston-skyline': { w: 1600, h: 620, sizes: [1600, 960, 640] },
};

export function img(name, alt, { sizes = '100vw', eager = false, cls = '' } = {}) {
  const m = IMG[name];
  if (!m) throw new Error(`unknown image: ${name}`);
  const srcset = m.sizes.map((w) => `/img/${name}-${w}.webp ${w}w`).join(', ');
  const fallback = `/img/${name}-${m.sizes[0]}.webp`;
  return `<img${cls ? ` class="${cls}"` : ''} src="${fallback}" srcset="${srcset}" sizes="${sizes}"
    width="${m.w}" height="${m.h}" alt="${esc(alt)}"
    loading="${eager ? 'eager' : 'lazy'}" decoding="${eager ? 'sync' : 'async'}"${eager ? ' fetchpriority="high"' : ''}>`;
}

/* ---------- the request form ----------
   Form-first, because there is no phone number to publish yet. Every CTA on the
   site points here. The form is short on purpose: name, contact, service, area
   and what is happening. Anything more is a reason to abandon the form. */
export function requestForm(cfg, { heading = 'Request AC service', area = '', service = '' } = {}) {
  const pending = cfg.conversion.status !== 'active';
  const areaOptions = [cfg._nav.pillar, ...cfg._nav.areas]
    .map((a) => `<option value="${esc(a.name)}${a.stateAbbr ? ', ' + a.stateAbbr : ''}"${a.name === area ? ' selected' : ''}>${esc(a.name)}</option>`)
    .join('');
  const serviceOptions = cfg._nav.services
    .map((s) => `<option value="${esc(s.name)}"${s.name === service ? ' selected' : ''}>${esc(s.name)}</option>`)
    .join('');

  return `<section class="sec sec--form" id="request"><div class="wrap">
  <div class="formgrid">
    <div class="formgrid__intro">
      <span class="kicker">Free to request</span>
      <h2>${esc(heading)}</h2>
      <p class="lede">Tell us what is happening and where you are. It goes to an HVAC company that
      covers your area, and they come back with a next step. No charge to you.</p>
      <ul class="ticks">
        <li>Describe the symptom in your own words</li>
        <li>Get a callback from a company that works in your area</li>
        <li>No obligation, no cost to you</li>
      </ul>
    </div>
    <div class="formcard">
      ${pending
        ? `<p class="formcard__pending"><strong>Request form is being connected.</strong>
           This site is in staging, so requests are not being delivered yet. The form below is
           complete and will send as soon as the request handler is live.</p>`
        : ''}
      <form class="rform" id="request-form" method="post" action="${esc(cfg.conversion.endpoint)}" novalidate data-endpoint="${esc(cfg.conversion.endpoint)}" data-status="${esc(cfg.conversion.status)}">
        <div class="rform__row">
          <label for="rf-name">Your name</label>
          <input id="rf-name" name="name" type="text" autocomplete="name" required>
        </div>
        <div class="rform__row">
          <label for="rf-phone">Phone</label>
          <input id="rf-phone" name="phone" type="tel" autocomplete="tel" required>
        </div>
        <div class="rform__row">
          <label for="rf-email">Email <span class="opt">optional</span></label>
          <input id="rf-email" name="email" type="email" autocomplete="email">
        </div>
        <div class="rform__row">
          <label for="rf-area">Service area</label>
          <select id="rf-area" name="area" required>${areaOptions}</select>
        </div>
        <div class="rform__row">
          <label for="rf-service">What do you need</label>
          <select id="rf-service" name="service" required>${serviceOptions}</select>
        </div>
        <div class="rform__row">
          <label for="rf-detail">What is happening</label>
          <textarea id="rf-detail" name="detail" rows="3" required
            placeholder="For example: the outdoor unit is running but the vents blow warm air."></textarea>
        </div>
        <div class="rform__row rform__row--hp" aria-hidden="true">
          <label for="rf-website">Leave this field empty</label>
          <input id="rf-website" name="website" type="text" tabindex="-1" autocomplete="off">
        </div>
        <button class="btn btn--call btn--full" type="submit"${pending ? ' disabled' : ''}>Send request</button>
        <p class="rform__status" id="rf-status" role="status" aria-live="polite"></p>
        <p class="rform__note">No cost to you. HVAC companies pay for the referral.</p>
      </form>
    </div>
  </div>
</div></section>`;
}

/* ---------- reusable blocks ---------- */
export function faqBlock(faqs) {
  if (!faqs?.length) return '';
  return `<div class="faq">
${faqs
  .map(
    (f) => `  <details class="faq__i"><summary class="faq__q">${esc(f.q)}</summary>
    <div class="faq__a">${esc(f.a)}</div></details>`
  )
  .join('\n')}
</div>`;
}

export function cloud(items) {
  return `<ul class="cloud">${items
    .map((i) => `<li><a href="${i.href}">${esc(i.label)}</a></li>`)
    .join('')}</ul>`;
}

export function serviceRows(items) {
  return `<div class="rows">
${items.map((i) => `  <a class="row${i.urgent ? ' row--urgent' : ''}" href="${i.href}">
    <span class="row__t">${i.tag ? `<span class="tag">${esc(i.tag)}</span>` : ''}${esc(i.title)} <span class="arw">&rarr;</span></span>
    ${i.body ? `<span class="row__d">${esc(i.body)}</span>` : ''}
  </a>`).join('\n')}
</div>`;
}

export function cardGrid(items, cls = 'grid grid--3') {
  return `<div class="${cls}">
${items
  .map(
    (i) => `  <a class="card${i.urgent ? ' card--urgent' : ''}" href="${i.href}">
    <span class="card__t">${esc(i.title)} <span class="arw">&rarr;</span></span>
    ${i.meta ? `<span class="card__m">${esc(i.meta)}</span>` : ''}
    ${i.body ? `<span class="card__d">${esc(i.body)}</span>` : ''}
  </a>`
  )
  .join('\n')}
</div>`;
}

/* ---------- schema.org ----------
   Modelled honestly: AC Repair Houston is an Organization that provides a referral
   Service. It is NOT a LocalBusiness and carries no address, no geo, no rating,
   because it has no premises and no reviews we can attribute. */
export function orgSchema(cfg) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    '@id': cfg.origin + '/#organization',
    name: cfg.brand,
    url: cfg.origin + '/',
    description: cfg.disclosure,
    areaServed: { '@type': 'State', name: 'Texas' },
    contactPoint: {
      '@type': 'ContactPoint',
      contactType: 'customer service',
      areaServed: 'US',
      availableLanguage: 'English',
    },
  };
}

export function serviceSchema(cfg, { name, description, areaServed, path }) {
  return {
    '@context': 'https://schema.org',
    '@type': 'Service',
    '@id': cfg.origin + path + '#service',
    name,
    description,
    serviceType: name,
    provider: { '@id': cfg.origin + '/#organization' },
    areaServed,
    audience: { '@type': 'Audience', audienceType: 'Homeowners' },
  };
}

export function faqSchema(cfg, faqs, path) {
  if (!faqs?.length) return null;
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    '@id': cfg.origin + path + '#faq',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };
}

export function breadcrumbSchema(cfg, crumbs) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: crumbs.map((c, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: c.name,
      ...(c.href ? { item: cfg.origin + c.href } : {}),
    })),
  };
}
