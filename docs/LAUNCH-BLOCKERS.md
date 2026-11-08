# Launch blockers

Everything on this list must be resolved before the site goes live and starts
taking real requests. Each item names the exact files that have to change.

## 1. Domain and DNS

- [ ] Purchase the production domain.
- [ ] Point DNS at the host (A records for the apex, CNAME for `www`).
- [ ] Update `data/config.json`:
  - `domain` (currently the RFC 2606 placeholder `acrepairhouston.example`)
  - `origin` (currently `https://acrepairhouston.example`)
  - `domainConfirmed` (currently `false`, must become `true`)
- [ ] Update `site.config.json` if the host needs a base URL there.
- [ ] Rebuild and re-run the schema check. Canonical URLs, `sitemap.xml`,
  `robots.txt`, `og:url` and every schema `@id` derive from `origin`, so one
  value change covers all of them.
- [ ] If the domain redirects to a `www` host or an `https` upgrade, make sure
  the canonical points at the final address, not the redirect.

**Why:** the site cannot be indexed or shared with a `.example` host. The
placeholder is deliberate so a half-finished site can never point at a real
third-party domain, but it has to be replaced before launch.

## 2. The request form has to actually work

- [ ] Deploy a handler for `POST /api/leads` alongside the static site
      (a Cloudflare Worker, a Netlify Function, or equivalent).
- [ ] Set `conversion.status` to `"active"` in `data/config.json`
      (currently `"pending"`).
- [ ] Confirm the handler stores or forwards: name, phone, email if given,
      service area, service type, and the problem description.
- [ ] Confirm the handler routes by area. A request for League City must reach
      a company that covers League City.
- [ ] Test a real submission end to end, on desktop and on a phone.
- [ ] Add rate limiting and a spam filter to the handler. The form has a
      honeypot field, but that is a first line, not a control.

**Why:** while `status` is `"pending"`, the form renders in an honest
not-connected state and the submit button is disabled. That is correct for
staging and completely wrong for a live site. A homeowner who cannot submit
is a homeowner who calls someone else.

## 3. Put the real call tracking number in place

There is one phone number on the site, and it is a call tracking line that
forwards to a partner company. It lives in `data/config.json`:

```json
"phone": {
  "display": "(713) 555-0100",
  "e164": "+17135550100",
  "publish": true,
  "verified": false
}
```

The current value is a placeholder. The call button is built and wired
everywhere it belongs: the sticky header, the emergency ribbon, the fixed
mobile bar, the request form and the `Organization` schema. So the swap is
two fields and one flag.

- [ ] Buy the call tracking number. It has to forward to a partner company
      that is actually taking work, because a call that rings nobody is worse
      than no button at all.
- [ ] Set `display` to the human-readable form and `e164` to `+1` followed by
      ten digits.
- [ ] Set `verified` to `true`.
- [ ] Run `npm run build`. The build fails if the number is marked verified
      while it still matches a placeholder pattern, and it fails if any phone
      number or `tel:` link anywhere in the built HTML is not the one in the
      config. Both of those are the point: they are what stops a placeholder
      or an invented number reaching production.
- [ ] Confirm the tracking provider records the source of the call, so a
      call can be attributed to the page that produced it.
- [ ] Confirm the number is answered. If nobody answers, the footer already
      tells the visitor to use the request form instead, and the form is
      live once item 2 is done.

**Do not** publish a placeholder number, a 555 line, or a number belonging to
an unrelated business. The build fails on invented contact details for a
reason.

**Also note:** the copy now claims that every company the site sends work to
holds a current Texas Air Conditioning Contractors license. That claim is
only true once item 8 below is done. Do not launch before it is.

## 4. The retired same-day URL set

The `same-day-ac-repair` service was retired. Its search results were the same
pages as the `ac-repair` results, which is the signal that two URLs are
fighting over one query, so the intent was folded into the AC repair pages
instead of standing on its own.

The URLs that were dropped are:

- `/services/same-day-ac-repair/`
- `/service-areas/{city}/same-day-ac-repair/` for all 25 areas

- [ ] If a staging or preview deployment of the earlier build exists
      anywhere, add a 301 from each of those 26 paths to the matching
      `/services/ac-repair/` page, and delete them from that deployment's
      sitemap.
- [ ] If no deployment of the earlier build exists, there is nothing to
      redirect. The site has never run on a real domain, so these paths have
      never been published and no external link can point at them.

**Why:** a 301 is the right answer when something has to be preserved, and
a 410 is the right answer when a page is gone on purpose. Neither is needed
for a URL that was never live, and a 404 on a path that never existed is not
an error worth logging. Do not add redirect rules "just in case" on a site
with no inbound links: every permanent redirect is a tax on crawl budget.

## 5. Google Business Profile

A lead-generation referral property with no operator is **not eligible** for a
Google Business Profile. Google treats online-only brands and lead-generation
agencies as ineligible for the service-area business model.

- [ ] Do not create, claim, or imply a Business Profile for this site.
- [ ] The site publishes no `LocalBusiness` schema, no address, and no `geo`,
      and that is correct. Do not add them.
- [ ] If an operator is later assigned and takes over the site, revisit
      eligibility then. At that point the operator's verified listing becomes
      the source of truth for name, phone, hours, and service area, and the
      site's copy and schema have to be brought into line with it.

**Why:** a Business Profile for a site with no operator is the fastest way to
get a listing suspended, and it puts the client on the wrong side of a
consumer-protection issue.

## 6. Analytics and consent

- [ ] Decide what is measured. Current plan is aggregate page and form
      analytics only, no advertising pixels, no cross-site tracking.
- [ ] If analytics are added, add a consent notice to
      `data/copy/page-privacy.json` and update the privacy copy to describe
      what is actually collected.
- [ ] Do not load a third-party script before the consent decision, because
      loading it is itself the act that needs consent.

## 7. Photography

The site now ships four photographs and three original SVG illustrations. The
photographs live in `src/img/` and the diagrams in `src/svg/`, and
`npm run build-images` renders both into `public/img/`.

| Slot | Source | Kind |
| --- | --- | --- |
| `ac-repair-near-me-houston` | `src/img/` | Photograph, the home hero and its social card |
| `ac-repair-houston-residential-street` | `src/img/` | Photograph, every area page |
| `emergency-ac-repair-thermostat` | `src/img/` | Photograph, the urgency service pages |
| `ac-repair-refrigerant-gauges` | `src/img/` | Photograph, the sitemap social card |
| `ac-repair-unit-anatomy` | `src/svg/` | Labelled diagram of a split system |
| `ac-repair-airflow-diagram` | `src/svg/` | Labelled airflow diagram |
| `ac-repair-coil-comparison` | `src/svg/` | Coil comparison diagram |

The three diagrams stay diagrams. A photograph of a duct cannot do what the
airflow diagram does, and replacing them with stock photography would make
the site less informative.

- [ ] Commission more photography to replace the shared images. One file
      serves many pages, so the pages sharing a file currently share its file
      name too. `docs/IMAGE-AUDIT.md` lists every conflict and the name each
      replacement should take.
- [ ] Keep shooting equipment, gauges, coils, ductwork and work in progress.
      Do not shoot a person presented as this site's technician. This site
      employs nobody, the LRA builder's rule is not to fabricate staff, and a
      real identifiable person needs a model release.
- [ ] Keep the equipment unbranded. The copy brief bans naming product
      brands, so a legible badge on a condenser in a photograph is a problem
      in the same way a brand name in a sentence is.
- [ ] Write the alt text to describe the scene. Never write "our technician".
      Alt text is indexed, and the build fails on a missing alt.

## 8. Partner companies

- [ ] Sign HVAC companies before the site takes requests. A ranked site with
      nobody to answer a request is worse than no site.
- [ ] Verify each company's Texas license through the Department of Licensing
      and Regulation and record the number.
- [ ] Confirm each company covers the areas it is being routed requests for.
- [ ] Set up the routing in the `/api/leads` handler per area.
- [ ] Confirm each company has agreed to be identified as a referral partner
      and understands that the homeowner sees their name and contact details.

### 8a. Decide how many companies receive a request

This is still open. The business plan is to sell the leads now, and to rent the
site out to a contractor later if the site reaches position one. The copy is
written so that it stays honest either way, so this does not block the build,
but it does need an answer before the site goes live.

- [ ] Decide whether a request goes to **one company per area** (exclusive)
      or to **several companies** (shared), or exclusive for urgent work and
      shared for routine work.
- [ ] If it is shared, the number of companies a homeowner can receive a call
      from has to be set in the `/api/leads` handler, and the copy below has
      to be revisited.
- [ ] If it is exclusive, the routing in the handler has to guarantee it, or
      the copy is wrong.

**Why it matters.** The FTC Lead Generator Rule requires the site to disclose,
before the consumer submits their information, that their details will be
shared with seller(s), and to disclose if they may go to more than one. The
copy currently says "the HVAC company or companies working your area", which
is the conservative disclosure and is compliant under either model. It does
not promise a count, so it does not have to change.

The homepage also promises the homeowner a callback rather than a specific
number of calls, and the buyer page says "We do not run an auction", meaning
companies are selected for the area they cover and the work they take, not by
who bids highest. If either of those stops being true, the copy is making a
promise the site does not keep, and contractor relationships are the thing
that breaks first.

Exclusive per area prices higher per lead, keeps the callback promise true,
and is the precondition for renting the site to that company later, because
the contractor holding the territory is the natural tenant.

## 9. Sanity checks before going live

- [ ] `npm test` passes: source checks, copy audit, and a clean build.
- [ ] `npm run build` reports zero orphans, zero dangling links, and zero
      content violations.
- [ ] Open the built site at a phone width and a desktop width and read it.
      Automated checks are a floor, not a visual approval.
- [ ] Check the 404 page.
- [ ] Check the request form on a real phone, including the keyboard
      behaviour on the phone and email fields.
- [ ] Submit a real request and confirm it arrives.
- [ ] Verify `robots.txt` and `sitemap.xml` point at the production domain.
- [ ] Set `STAGING` off. The build reads `process.env.STAGING` and adds
      `noindex,nofollow` to every page when it is set.
