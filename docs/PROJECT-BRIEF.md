# Project Brief

## Identity

- Business and site name: AC Repair Houston
- Operating status: rank-and-rent lead generation property. No operator is
  assigned, no premises, no Google Business Profile. One call tracking line
  forwards to a partner company.
- Primary service: AC repair (the pillar service)
- Primary market: Houston, Texas (the pillar area)
- Build mode: autopilot
- Stack: static site generator, zero runtime dependencies, Node 18 or newer

## Services and coverage

Twenty AC services, one of which is the pillar service. The pillar service
is `ac-repair`. Every other service hangs off it as a child:

**Urgent tier**

- Emergency AC Repair
- AC Not Cooling

**Core tier**

- AC Repair (pillar)
- AC Installation
- AC Replacement
- AC Maintenance
- Condenser Repair
- Compressor Repair
- Refrigerant Leak Repair
- Refrigerant Recharge
- Evaporator Coil Repair
- Blower Motor Repair
- HVAC Electrical Repair
- Condensate Drain Repair
- Thermostat Installation
- Ductless Mini-Split Installation
- Ductless Mini-Split Repair
- Heat Pump Repair
- Commercial AC Repair
- AC Cleaning

**Area coverage**

Houston is the pillar area and carries all twenty services. Within it, sixteen
Houston neighborhoods each get a page. Around it, twenty-four Greater Houston
municipalities each get a page and the fourteen services that a live search
shows have dedicated pages of their own:

Katy, Sugar Land, Pearland, The Woodlands, Spring, Humble, Cypress, League City,
Pasadena, Missouri City, Friendswood, Alvin, Manvel, Richmond, Cinco Ranch,
Clear Lake City, Bellaire, West University Place, Santa Fe, Jersey Village,
La Porte, Dickinson, Baytown, Tomball.

## Lead routing

- Phone status: one call tracking line, configured under `phone` in
  `data/config.json`. It is published in the header, the ribbon, the fixed
  mobile bar, the request form and the `Organization` schema. It forwards to
  a partner company. `phone.verified` is the gate: the build refuses to let a
  placeholder be marked verified, and refuses any phone number in the built
  HTML that is not the published one.
- Form destination: `POST /api/leads`, currently in a pending state
- Form fields: name, phone, email (optional), service area, service type, and
  a description of the problem

## Address and Google Business Profile

- Address status: none
- Publishable storefront address: none
- Google Business Profile status: not eligible. A lead-generation property
  with no operator is ineligible under Google's service-area business rules, so
  no profile has been created, claimed, or implied.

The site publishes no street address, no `LocalBusiness` schema, no `geo`, no
telephone, no `aggregateRating`, and no review markup. Structured data is
limited to `Organization`, `Service`, `WebSite`, `FAQPage`, and
`BreadcrumbList`.

## Brand and references

- Brand: AC Repair Houston. Wordmark is a condensed uppercase lockup in bone
  paper, ink and cold blue.
- Direction: utility and dispatch, dense information, condensed display type,
  mono labels. Blue is the brand color. Orange is reserved strictly for urgent
  work so it keeps its meaning.
- Typography: Archivo Narrow for display, Archivo for body, DM Mono for labels.
  Self-hosted WOFF2, 59.7 KB total, no external font request.
- Imagery: original SVG illustrations rendered to WebP. The reference material
  this project was built from carried plumbing photography, which does not
  belong on an AC site, and the reference pack itself advises commissioning
  original imagery for a real client.
- Domain: not purchased. The build uses `acrepairhouston.example`, an RFC 2606
  reserved name, so a half-finished site cannot point at a real third-party
  domain. One value in `data/config.json` controls every canonical, sitemap
  URL, `og:url` and schema `@id`.
- Preferred host: any static host that can run a small serverless function for
  the lead handler.

## Positioning

The site is a free referral service. It matches Houston-area AC problems with
independent HVAC companies that cover that area. Those companies pay a referral
fee, which is never passed to the homeowner. The site does not employ anyone,
does not perform work, and has no physical location. The agreement for the
actual job is between the homeowner and the HVAC company that takes it.

This framing is enforced in the build. `data/config.json` lists what may never
be claimed, and the build fails on any of it.

## The truth policy this build follows

- Never claim to be a licensed contractor without a real license number on
  file.
- Never publish a fake, example, inactive, or competitor phone number, and
  never mark a placeholder number as verified.
- Never publish an address, a map, a storefront, or a physical location.
- Never invent reviews, ratings, awards, years in business, job counts, prices,
  or response times.
- Never imply a Google Business Profile exists.
- Record future work as an unchecked item in `docs/LAUNCH-BLOCKERS.md` with the
  exact files that have to change.

## Verification

`npm test` runs the source checks, the copy audit, a clean build, the SEO
audit and the link audit. The copy audit is the shingle similarity gate over
every same-type pair of pages, and it is now wired into `npm test` rather
than only being available as a separate command. The build itself enforces
copy completeness, banned claims, local fact consistency against each area's
traits, heading structure, title and description lengths, canonical and social
metadata, alt text on every image, CSS class coverage, the phone number rules,
and the internal link graph with zero orphans and zero dangling links.
