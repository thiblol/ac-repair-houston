# Copy brief

The house style for writing or editing copy in `data/copy/`. Read it before
writing a new block or lifting an existing one. It is not a style guide for
marketing prose in general and it does not apply outside `data/copy/`.

You are writing copy for one service area page set on a real client site for
AC Repair Houston. The site is a **free referral service**. It has no office,
no phone number, no technicians of its own, and no Google Business Profile. A
request goes to an independent HVAC company that covers the area, and that
company sends its own technician.

## The voice

Write like a technician explaining something to a homeowner whose house is too
hot. Short sentences. Concrete. No marketing voice. No adjectives where a fact
would do. Read the existing copy in the city's own area file before you write
and match its register exactly.

The subject is always the HVAC company the customer is routed to, never us.
Write "the company that covers this area", "the HVAC company you are routed
to", "the technician who takes the job", "the company you send the request
to". Never "our technician", never "we".

## Hard rules the build enforces

Every one of these fails the build. Check each one before you finish.

1. **No em dashes.** Use a full stop, a colon, or a comma. Never type the
   character `—`. Hyphens are fine.
2. **No dollar figures.** No `$` followed by a digit, anywhere. Describe what
   moves a price, never the price itself.
3. **No ratings or counts.** No "5 stars", no "200 reviews", no "50 jobs
   completed", no "10 years in business", no "20 years of experience".
4. **No first-person contractor claims.** Never "our technicians", "our HVAC",
   "our AC", "our team", "our trucks", "our crew", "our staff", "our
   installers". Never "we are licensed", "we are certified", "we are bonded",
   "we are insured", "we arrive", "we dispatch our", "we send our".
5. **No guarantees.** Do not offer one, do not imply one, do not promise a
   result. You may say "no guarantee", "nobody can promise", "there is no
   guarantee", and you may write a question that asks whether a guarantee
   exists. That is allowed. "We guarantee" is not.
6. **No phone number, no street address, no map, no storefront.**
7. **No product brand and no company name by name.** No Carrier, no Trane, no
   Lennox, no York. Generic equipment terms only.
8. **No claim that the site employs people or holds credentials.**

## Local fact rules

Each city in `data/areas.json` has a `traits` object. The copy has to agree
with it or the build fails.

| Trait | What it means | Rule |
|---|---|---|
| `salt` | `none`, `low`, `moderate`, `high` | `none` means you may not describe salt corrosion or salt damage. `moderate` and `high` mean you may not deny salt. Saying "no coastal salt here" is allowed only where salt is `none`. |
| `housing` | e.g. `1950s-housing`, `2000s-onward` | Do not describe housing stock from a different era. Check the exact value. |
| `debris` | e.g. `cottonwood-and-mesquite`, `pine` | Use the tree that is actually named. Do not mix them. |
| `heat`, `humidity`, `grid`, `attic` | load, moisture, power behaviour, attic temperature | Use these as real reasons for a call. Do not contradict them. |

The traits are the reason two cities get different copy. A page about a dirty
condenser coil in League City has to be about salt and Galveston County
humidity. The same page in Katy has to be about pine needles and Fort Bend
housing. The job is not to swap the city name. The job is to write about a
different set of physical conditions.

## The JSON shape

Each area file is `data/copy/area-{slug}.json`. Inside it, `services` is an
object keyed by service slug. Every block looks like this:

```json
"condenser-repair": {
  "intro": "One or two sentences on what this job is in this city.",
  "localNote": "One or two sentences on why this job comes up here specifically.",
  "faqs": [
    { "q": "A question a homeowner would actually type.", "a": "Two to four sentences that answer it." },
    { "q": "Another one.", "a": "Another answer." }
  ],
  "_faqsNote": "6 FAQs. At least two reference a real local condition."
}
```

Rules for the JSON:
- Add new service blocks in the order given in your task, so the file reads
  in the same order as the service list.
- Do not reorder, rename, or delete any existing key.
- `_faqsNote` is a note to the next editor, not customer-facing. Keep it short.
- The file must stay valid JSON with two-space indentation.

## What `intro` and `localNote` are for

`intro` is the hero paragraph under the H1. It says what this job is and why
someone in this city would need it. It must not repeat the H1.

`localNote` is the "Why this comes up in {City}" paragraph. It is the local
one. It names the actual physical conditions of the city: the housing stock,
the salt, the debris, the humidity, the grid, the attic, the county, the
distance from the dispatcher, the age of the equipment on these particular
houses. A reader should be able to tell which city they are reading about
without the city name being in the sentence.

## What makes a good FAQ here

- Write the question the way a homeowner would type it into a search box.
  Lowercase is fine and matches the existing service pages. Mixed case is fine
  too. Match the file you are editing.
- The answer is two to four sentences. It should be specific enough that it
  could not be pasted onto another city's page unchanged.
- At least two of the FAQs on each page must be genuinely local. They should
  name a condition of this city and what it means for this job.
- At least one FAQ should answer an objection or a money question honestly.
  Cost questions get answered by explaining what moves the cost, never by
  quoting a number.
- Do not ask the same question twice on one page, and do not ask a question
  the answer does not actually address.

## The similarity gate

The build compares every page of the same type against every other page of
that type and fails above 15 percent shared 8-word sequences. That means:

- No sentence of yours may appear in another city's copy for the same
  service. Not one clause of eight words.
- Do not open every block with the same construction.
- Do not use a stock list of benefits that you would use for every service.
- Different vocabulary for the same idea is not enough on its own. Different
  facts are what pass.
