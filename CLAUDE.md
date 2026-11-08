# CLAUDE.md

Behavioral guidelines to reduce common LLM coding mistakes. Merge with project-specific instructions as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:
- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them - don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes, simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:
- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it - don't delete it.

When your changes create orphans:
- Remove imports/variables/functions that YOUR changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: Every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:
- "Add validation" → "Write tests for invalid inputs, then make them pass"
- "Fix the bug" → "Write a test that reproduces it, then make it pass"
- "Refactor X" → "Ensure tests pass before and after"

For multi-step tasks, state a brief plan:
```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
3. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it work") require constant clarification.

---

**These guidelines are working if:** fewer unnecessary changes in diffs, fewer rewrites due to overcomplication, and clarifying questions come before implementation rather than after mistakes.

# AC Repair Houston

A rank-and-rent lead generation site for AC repair across Houston and Greater
Houston. Static site generator, zero runtime dependencies. `data/` holds the
content, `src/` holds the generator, `npm run build` writes plain HTML to
`dist/`.

Read `docs/PROJECT-BRIEF.md` and `docs/HANDOFF.md` before changing anything.

## Never invent a fact about this business

This site is a referral service with no operator, no premises, no phone number
and no Google Business Profile. The build enforces this, and so must you.

- No phone number, not even a placeholder. Every call to action points at the
  request form.
- No street address, no map, no storefront, no `LocalBusiness` schema, no `geo`.
- No review counts, star ratings, awards, job counts, years in business,
  response-time promises, or prices.
- No claim that this business employs technicians, or that it is licensed,
  bonded, certified or insured.
- No Google Business Profile, and no hint that one exists. A lead-generation
  property with no operator is not eligible.
- No specific HVAC company, product brand, or technician by name.

`data/config.json` lists what may never be claimed. The build fails on any of
it, but only if you do not also fix the copy.

## The copy is the product

Every page's prose lives in exactly one file in `data/copy/`. The generator
never invents a sentence.

- Copy is written **per page**, not templated with the area name swapped. An
  automated audit fails the build if two same-type pages are more than 15
  percent similar on 8-gram word overlap.
- Area pages carry real, checkable local conditions: housing stock era, coastal
  salt exposure, tree debris, attic temperatures, grid behaviour. The build
  fails if a page contradicts its own traits in `data/areas.json`.
- No em dashes anywhere. No `$` followed by a digit.
- Write like a technician explaining something to a homeowner whose house is
  too hot. Short sentences, concrete, no marketing voice.

## The build gates are the point

`npm test` must pass before anything ships. It runs the source checks, the copy
audit self-test, and a clean build. The build fails on a missing copy file, a
banned claim, a duplicated page, a local fact contradiction, a heading
structure problem, a missing alt text, an undefined CSS class, an orphan page,
or a dangling link.

Do not weaken a gate to make a build pass. Fix the copy.

## Adding things

- A new service: entry in `data/services.json`, a `data/copy/service-{slug}.json`,
  and a `services` block in each area copy file that should carry it.
  `npm run check` reports missing and unused blocks.
- A new area: entry in `data/areas.json` with its traits, a
  `data/copy/area-{slug}.json`, and a rebuild. Links, sitemap and nav pick it up.
- A new page type: a template in `src/templates.mjs`, a builder in
  `src/build.mjs`, and the SEO gate in `src/build.mjs` will check it.

Non-Houston areas carry the fourteen services that a live search shows have
dedicated pages of their own. Houston is the pillar market and carries all
twenty. Widening that set further produces near-duplicate pages, which is the
failure mode the whole copy-audit system exists to prevent.
