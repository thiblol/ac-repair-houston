# AC Repair Houston

A rank-and-rent lead generation website for AC repair across Houston and
Greater Houston.

Static site, zero runtime dependencies. All copy lives in `data/copy/`, all
structure lives in `src/`, and `npm run build` writes plain HTML to `dist/`.

## Quick start

```bash
npm install
npm run dev
```

Then open http://localhost:4173.

## Commands

| Command | What it does |
| --- | --- |
| `npm run build` | Generate `dist/` from `data/` and `src/` |
| `npm run dev` | Build, then serve `dist/` on port 4173 |
| `npm run check` | Source and data checks (taxonomy, copy coverage, assets) |
| `npm run audit:copy` | Shingle similarity audit across all copy |
| `npm run audit:seo` | Page by page SEO audit of the built site |
| `npm run audit:links` | Internal link architecture audit |
| `npm run build-images` | Render the illustrations and photographs to responsive WebP |
| `npm test` | Check, copy audit, build, then the SEO and link audits |

`npm run build-images` renders `src/svg/*.svg` and `src/img/*.jpg` to
responsive WebP in `public/img/`, plus one 1200 by 630 JPEG per image for the
social card. It only needs running when an image changes.

## Taxonomy

The pillar service is **AC repair**. The pillar area is **Houston**. Every
other page hangs off those two.

```
/                                    home
/services/{service}/                 20 service pages, location neutral
/service-areas/houston-tx/           PILLAR AREA, all 20 services
/service-areas/houston-tx/{service}/ Houston x service
/service-areas/houston-tx/neighborhoods/{name}/   16 Houston neighborhoods
/service-areas/{city}/               24 Greater Houston municipalities
/service-areas/{city}/{service}/     14 services per city
```

Non-Houston areas carry the fourteen services that a live search shows have
dedicated pages of their own, rather than all twenty. Twenty services across
twenty-five areas would be 500 pages of near-identical content, which is what
Google reads as a doorway network. The build enforces this, and it enforces the
opposite problem too: a page with no inbound internal link fails the build.

## Editing

**To change copy:** edit the matching file in `data/copy/`, then rebuild.
Every page's prose lives in exactly one place. `docs/COPY-BRIEF.md` is the
house style for new copy: the voice, the claims the site may never make, and
the local-fact rules each area's `traits` object imposes.

**To record that a page changed:** set its `lastmod` field to the date you
edited it. That date is what the sitemap publishes for the page. A build date
on every URL tells a crawler that everything changed every time, which is a
signal worth ignoring.

**To add a service:** add an entry to `data/services.json`, create
`data/copy/service-{slug}.json`, and add the service to the `services` block of
the area copy files that should carry it. `npm run check` reports any missing
or unused block.

**To add an area:** add an entry to `data/areas.json` with its traits, create
`data/copy/area-{slug}.json`, and rebuild. The link graph, sitemap, and nav
pick it up automatically.

**To change the design:** `public/assets/site.css`. The palette lives in
`:root` at the top.

## Build gates

The build fails rather than shipping a broken site. It checks that:

- every required copy field is present and non-empty
- no page contains an em dash, an invented price, or a banned
  first-person-contractor phrase
- no two same-type pages are more than 15 percent similar on 8-gram word
  overlap, which is the doorway-page failure mode
- no area page contradicts its own traits, such as a coastal area denying salt
  exposure
- every page has exactly one `h1`, no heading level jumps, a title under 62
  characters, and a description between 70 and 165 characters
- every internal link resolves and every page has inbound links
- every CSS class used in the HTML exists in the stylesheet
- every image has alt text
- every built page has one `h1`, a unique title and description in budget, a
  self-referential canonical, a working social card, and an entry in the
  sitemap

The last group is checked by `src/audit-seo.mjs`, which walks `dist/` rather
than the data, because the built output is what a crawler sees.

`src/audit-links.mjs` checks the link architecture: that the homepage links
every service, every area and every city, that the menu holds every service
page, that the footer holds the area directory, and that a service page links
the area x service versions of itself rather than the generic area pages.

## Before launch

The site is not ready to take requests yet. `docs/LAUNCH-BLOCKERS.md` lists
everything that has to happen first, including the domain, the lead handler,
and the partner companies.

## Stack

Node 18 or newer, and `sharp` as a build-time-only dependency for rendering
the illustrations. The shipped site is plain HTML, CSS, and one small script
for the request form.
