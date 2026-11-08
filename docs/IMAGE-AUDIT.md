# Image filename and alt text audit

Run against the `Image-Filename-SEO-Audit-PRO` skill in the key-files library
(`2nd-(improve the content and seo)/seo/on-page/`), applied to the images on
this site.

The short version: every image on this site now carries a service term and a
location or a descriptor in its file name, every image is listed in the
sitemap next to the page that uses it, and every alt text describes the scene
rather than the service.

## Entity vocabulary

Extracted from the site itself. No invented terms.

| Class | Terms |
| --- | --- |
| Primary service | AC repair |
| Service variants | emergency AC repair, AC not cooling, condenser repair, compressor repair, refrigerant leak repair, refrigerant recharge, evaporator coil repair, blower motor repair, HVAC electrical repair, condensate drain repair, thermostat installation, ductless mini-split installation, ductless mini-split repair, heat pump repair, commercial AC repair, AC coil cleaning, AC installation, AC replacement, AC maintenance |
| Primary location | Houston, Texas |
| Geo modifiers | Greater Houston, 24 surrounding cities, 16 Houston neighbourhoods |
| Business name | AC Repair Houston |

## Phase 1 — diagnostic

### Before

| File name | Source | Status | Problem |
| --- | --- | --- | --- |
| `Air_conditioning_unit_outside_house_79ee5d5e_2K.jpg` | Downloads | GENERIC | Upper case, underscores, a hash, a resolution marker |
| `Residential_street_in_Houston_su…_eea555f1_2K.jpg` | Downloads | GENERIC | As above, and a literal ellipsis character in the name |
| `Thermostat_on_wall_showing_tempe…_81ec693e_2K.jpg` | Downloads | GENERIC | As above |
| `Hands_servicing_air_conditioner_4aac40e8_2K.jpg` | Downloads | GENERIC | As above |
| `hero-condenser` | SVG | WEAK | "hero" is a flagged vague descriptor, no location |
| `houston-skyline` | SVG | WEAK | Location but no service term |
| `thermostat` | SVG | WEAK | Service term but no location |
| `coil-compare` | SVG | WEAK | Service adjacent, no location |
| `gauges` | SVG | GENERIC | No service or location term |
| `unit-anatomy` | SVG | GENERIC | No service or location term |
| `airflow` | SVG | GENERIC | No service or location term |

### After

All seven are OPTIMIZED: service term present, lowercase, hyphenated, unique
across the site, and inside the sixty character budget.

| File name | Length | Serves |
| --- | --- | --- |
| `ac-repair-near-me-houston` | 26 | Homepage hero and social card |
| `ac-repair-houston-residential-street` | 41 | The 25 area pages and the areas index |
| `emergency-ac-repair-thermostat` | 31 | The two urgency service pages, and the social card for the 16 neighbourhood pages |
| `ac-repair-refrigerant-gauges` | 29 | Social card for the sitemap page |
| `ac-repair-unit-anatomy` | 23 | Homepage, and the social card for the 20 service pages and the services index |
| `ac-repair-airflow-diagram` | 27 | The 18 core service pages, and the social card for the 356 area x service pages |
| `ac-repair-coil-comparison` | 28 | Social card for the how it works, for HVAC companies, privacy, terms and 404 pages |

### Image Filename SEO Score

`(Optimized / Total) x 10`

| | Before | After |
| --- | --- | --- |
| Optimized | 0 of 7 | **7 of 7** |
| Score | **0** | **10** |

## Phase 2 — the rename briefs

Rename format rules applied: lowercase only, hyphens between words, maximum 60
characters including the extension, maximum two core terms per name, unique
across the whole site.

The rendered names carry the width suffix, so the longest served file is
`ac-repair-houston-residential-street-1600.webp` at 50 characters. Every size
variant of a name is renamed together.

| Priority | Page type | Target keyword | Renamed to |
| --- | --- | --- | --- |
| HIGH | Homepage, hero, social card | AC repair near me | `ac-repair-near-me-houston` |
| HIGH | Area page, hero, social card | AC repair in {city} | `ac-repair-houston-residential-street` |
| HIGH | Urgency service page, hero | Emergency AC repair near you | `emergency-ac-repair-thermostat` |
| HIGH | Service page, media | {service} near you | `ac-repair-airflow-diagram` |
| HIGH | Service page, social card | {service} near you | `ac-repair-unit-anatomy` |
| MEDIUM | Area x service page, social card | {service} in {city} | `ac-repair-airflow-diagram` |
| MEDIUM | Neighbourhood page, social card | AC repair in {neighborhood} | `emergency-ac-repair-thermostat` |
| LOW | Sitemap page, social card | none | `ac-repair-refrigerant-gauges` |
| LOW | Static pages, social card | AC repair | `ac-repair-coil-comparison` |

### Shared image conflicts

One physical file serves pages with different target keywords. The skill
resolves this by naming the file for the highest value page, using the
hierarchy homepage, money page, location page, authority page, supporting
page. Where two pages are the same type, the higher volume keyword wins.

| File | Owned by | Also appears on | Unique replacement needed |
| --- | --- | --- | --- |
| `ac-repair-near-me-houston` | Homepage | Nothing. No conflict. | none |
| `ac-repair-houston-residential-street` | Houston area page, the highest volume city | The other 24 city area pages | `{service}-ac-repair-{city}`, for example `ac-repair-league-city` |
| `emergency-ac-repair-thermostat` | The two urgency service pages, which are money pages | The 16 neighbourhood pages | `ac-repair-{neighborhood}`, for example `ac-repair-the-heights` |
| `ac-repair-airflow-diagram` | The 18 core service pages, which are money pages | The 356 area x service pages | `{service}-{city}`, for example `condenser-repair-league-city` |
| `ac-repair-unit-anatomy` | The 20 service pages, which are money pages | The homepage in the body, and the services index | `{service}-near-you`, for example `condenser-repair-near-you` |
| `ac-repair-coil-comparison` | The how it works page | For HVAC companies, privacy, terms, 404 | `{page}-ac-repair`, for example `how-it-works-ac-repair` |
| `ac-repair-refrigerant-gauges` | The sitemap page | Nothing. No conflict. | none |

This is a temporary state and it is accepted as one. The site has never run
on a real domain, so nothing is indexed and there is no ranking to protect
while the replacements are commissioned. The photographs that exist now are
the four that were shot; the rest is a commission decision, not a code
decision.

## Alt text

The skill wants alt text that reinforces the same entity signals as the file
name without repeating it word for word. The alt text here describes the
scene, because that is what a screen reader user needs and because the entity
signal is already carried by the name and the surrounding copy.

| File name | Alt text | Status |
| --- | --- | --- |
| `ac-repair-near-me-houston` | A residential air conditioning condenser unit on a concrete pad beside the side of a two-storey Houston home, with a mature live oak behind it. | Optimized |
| `ac-repair-houston-residential-street` | A wide residential street in the Houston area, with low-slope roof ranch houses, a mature live oak over the lawn and overhead utility lines. | Optimized |
| `emergency-ac-repair-thermostat` | A wall-mounted thermostat set to 72 degrees in a room reading 84 degrees, on the interior wall of a lived-in house. | Optimized |
| `ac-repair-refrigerant-gauges` | A refrigerant gauge set connected to the service valves on a condenser unit during a diagnostic. | Optimized |
| `ac-repair-unit-anatomy` | Diagram of a split air conditioning system showing the outdoor condenser, refrigerant lines and the indoor evaporator unit. | Optimized |
| `ac-repair-airflow-diagram` | Diagram of air moving through a duct into a ceiling vent and across an evaporator coil. | Optimized |

No image is missing an alt and none is decorative. The build fails on a
missing alt, so this is enforced rather than reviewed.

**One rule the alt text obeys:** it never says "our technician". These are
photographs of equipment and of work in progress, and this site employs
nobody. The copy brief bans the same phrase in prose.

## Sitemap

The sitemap now publishes an image entry for every picture on every page. The
list is read back out of the rendered HTML, so it cannot drift away from what
the page actually shows. 426 image entries.

An image entry carries the largest responsive variant rather than all three,
and the social card is listed only on pages that have no picture in the body,
so one picture never gets two indexable URLs.

`robots.txt` allows everything, so the images are crawlable. There are no
external images on this site, so there is nothing to exclude from the audit.

## Crawl impact

| | |
| --- | --- |
| Images moved from zero entity signal to full optimisation | 7 of 7, 100 percent |
| Pages affected | 425 |
| Entity reinforcement | Service plus location now present on every image name |
| Risk | LOW. Fewer than 50 images, and the site has never been indexed, so there are no old URLs to redirect and nothing to crawl back |
| Expected processing | Two to four weeks after launch |

This is directional. It is not a promise of a ranking change.

## What this audit does not cover

Image compression and Core Web Vitals, EXIF and GPS geotagging, image schema
markup, broken image link detection, and lazy loading optimisation. The first
is handled by the build, which renders WebP at quality 82 with explicit
dimensions so the browser reserves the space before the file arrives.

## The rule for the next image

One file name, one slot, one owner page. Lowercase, hyphens, a service term
and a location or a descriptor, under sixty characters with the extension,
unique across the site, and named for the page that matters most. The social
card is the same picture at a different size, so it never gets its own name.
