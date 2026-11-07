# Copy schema

Every keyword-targeted page gets its prose from a JSON file in `data/copy/`.
The generator will not invent a sentence. If a field is missing the build fails
loud, so a page can never silently ship with template filler.

## Why this exists

The failure mode for a site like this is dozens of pages that are one page with
the city name swapped. Google reads that as a doorway network and deindexes the
lot. So the prose is written per area, and the build refuses to run if two pages
come out too similar.

## Hard rules for every field

1. **No em dashes.** Periods, commas, colons, parentheses.
2. **Never claim AC Repair Houston employs anyone.** It is a referral service
   that passes requests to independent HVAC companies. Never "our technicians",
   "our trucks", "we are licensed", "our team of HVAC pros". Correct: "the HVAC
   company we connect you with", "the technician who takes your job", "the
   company that covers your area".
3. **No invented numbers.** No review counts, no star ratings, no "over 500 jobs",
   no years in business, no response-time promise, no price. If a number would
   help, leave it out. You may state verifiable local facts (Houston summer
   humidity, coastal salt exposure, the February 2021 freeze) because those are
   true and checkable. You may not state facts about this business.
4. **No address, no map, no storefront, no phone number.** This is a
   service-area referral business with no premises.
5. **Write like an HVAC technician talking, not a marketer writing.** Short
   sentences. Concrete. A homeowner reads these while their house is 90 degrees.
6. **Do not repeat the area name more than the prose naturally wants.** Twice in a
   paragraph is stuffing. The page ranks on relevance, not density.
7. **Never mention a specific HVAC company, brand, or technician by name.**

## `data/copy/service-{slug}.json` (national service page)

```json
{
  "intro": "2 to 3 sentences. What the problem actually is and what happens on the request. Must NOT name a city.",
  "whatHappens": ["3 to 5 short strings. What the technician does on arrival."],
  "howPriced": "2 to 3 sentences on what drives the cost. No dollar figures. Name the variables: access, time of day, parts, whether it is a repair or a replacement.",
  "faqs": [
    { "q": "...", "a": "2 to 4 sentences." }
  ],
  "_faqsNote": "5 to 6 FAQs. Cost first. Use the phrasing a person types, not a marketer's phrasing."
}
```

## `data/copy/area-{slug}.json`

```json
{
  "intro": "2 to 3 sentences opening the area page. Ground it in this area specifically, using the traits supplied. Not interchangeable with any other area.",
  "localAngle": "A full paragraph, 60 to 110 words, on what makes AC work in THIS area different. Use the real traits: heat and humidity load, housing stock age, coastal salt exposure, tree debris, attic temperature, grid reliability. This is the paragraph that must be impossible to paste onto another area.",
  "commonCalls": ["3 to 5 strings. The calls that are genuinely common HERE, and why."],
  "landmarks": ["6 to 10 real neighborhoods, highways, or places in this area. Real places only."],
  "faqs": [{ "q": "...", "a": "..." }],
  "_faqsNote": "4 to 5 FAQs specific to this area. At least two must reference a real local condition.",

  "services": {
    "{service-slug}": {
      "intro": "2 to 3 sentences for the area x service page. Must be about this service IN this area, and must not restate the area page intro.",
      "localNote": "40 to 80 words tying THIS service to THIS area's traits. The single highest doorway-risk field on the site. If this could be pasted onto another area, rewrite it.",
      "faqs": [{ "q": "...", "a": "..." }],
      "_faqsNote": "2 to 3 FAQs, at least one genuinely local."
    }
  }
}
```

Each area file must contain a `services` block for **exactly** the services that
area gets a page for. `src/check.mjs` fails the build on a missing block, and
warns on a block that no page renders.

## `data/copy/neighborhood-{slug}.json` (Houston neighborhoods)

Same shape as an area file, plus three title fields:

```json
{
  "h1": "AC Repair in The Heights, Houston",
  "title": "AC Repair The Heights, Houston | AC Repair Houston",
  "description": "50 to 60 characters of local angle. No dollar figures.",
  "intro": "2 to 3 sentences. What is distinct about this neighborhood's AC work.",
  "localAngle": "A full paragraph, 60 to 100 words. Housing stock, tree cover, roof type, layout.",
  "commonCalls": ["3 to 5 strings."],
  "landmarks": ["5 to 8 real local streets, parks, shopping centers, or landmarks."],
  "faqs": [{ "q": "...", "a": "..." }]
}
```

## `data/copy/page-*.json` (home and static pages)

```json
{
  "intro": "...",
  "sections": [{ "h": "Heading", "p": "Paragraph." }]
}
```

The home page also uses `heroIntro`, `whyRequest`, `steps` and `faqs`.

## What the build checks

- Every required field present and non-empty, else hard fail.
- No em dash anywhere.
- No banned phrase from `config.positioning.neverClaim`.
- No `$` followed by a digit (no invented prices).
- **Shingle similarity** between every pair of same-type pages. Any pair over
  0.15 fails the build and names both files, because that pair is the doorway
  risk.
- **Local fact consistency.** A coastal area that denies salt exposure, or a
  subdivision of 2000s homes described as 1950s housing, fails the build.
