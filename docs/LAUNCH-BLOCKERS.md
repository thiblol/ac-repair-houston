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

## 3. Decide on a phone number

There is currently no phone number anywhere on the site, in the copy, or in the
structured data. That is the correct default for a referral business that does
not employ anyone, and it is why every call to action points at the form.

If a number is added later, these are the places it has to go:

- [ ] `data/config.json`: add `phone` (display) and `phoneE164`, and add a
      `phone.publish` flag set to `true`.
- [ ] `src/templates.mjs`: the header CTA, the dispatch card, the ribbon and
      the mobile call bar all currently render a form link. They need a
      `tel:` branch.
- [ ] `src/templates.mjs`, `orgSchema()`: `contactPoint` currently has no
      `telephone` property. Add it only when the number is real and
      controlled.
- [ ] `data/copy/`: every page that says "free to request" or "no cost to
      you" needs to reflect the new path.
- [ ] Every service page's `intro` and `howPriced` copy assumes a form
      request, not a call. That copy needs a rewrite, not a patch.

**Do not** publish a placeholder number, a 555 line, or a number belonging to
an unrelated business. The build fails on invented contact details for a
reason.

## 4. Google Business Profile

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

## 5. Analytics and consent

- [ ] Decide what is measured. Current plan is aggregate page and form
      analytics only, no advertising pixels, no cross-site tracking.
- [ ] If analytics are added, add a consent notice to
      `data/copy/page-privacy.json` and update the privacy copy to describe
      what is actually collected.
- [ ] Do not load a third-party script before the consent decision, because
      loading it is itself the act that needs consent.

## 6. Photography

The site ships original SVG illustrations rendered to WebP, not photographs.
That is a deliberate choice: the reference material this project was built
from carried plumbing photographs, and reusing them would put unrelated
imagery on an AC site.

- [ ] Commission or shoot real photographs of AC work in Houston, and replace
      `src/svg/*.svg` with them.
- [ ] If you replace them, keep the same filenames and the same
      `src/build-images.mjs` widths, or update `IMG` in `src/templates.mjs` to
      match.
- [ ] Write the alt text to describe the scene. Never write "our technician".
      This site does not employ anyone, and the alt text is indexed.

## 7. Partner companies

- [ ] Sign HVAC companies before the site takes requests. A ranked site with
      nobody to answer a request is worse than no site.
- [ ] Verify each company's Texas license through the Department of Licensing
      and Regulation and record the number.
- [ ] Confirm each company covers the areas it is being routed requests for.
- [ ] Set up the routing in the `/api/leads` handler per area.
- [ ] Confirm each company has agreed to be identified as a referral partner
      and understands that the homeowner sees their name and contact details.

## 8. Sanity checks before going live

- [ ] `npm test` passes: source checks, copy audit self-test, and a clean
      build.
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
