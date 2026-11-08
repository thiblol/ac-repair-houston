# Copy brief

The house style for writing or editing copy in `data/copy/`. Read it before
writing a new block or lifting an existing one. It is not a style guide for
marketing prose in general and it does not apply outside `data/copy/`.

You are writing copy for one service area page set on a real client site for
AC Repair Houston. The site is a **free referral service**. It has no office,
no technicians of its own, and no Google Business Profile. It does publish one
call tracking number, which forwards to a partner company. A request goes to
an independent HVAC company that covers the area, and that company sends its
own technician.

## The voice

Write like a technician explaining something to a homeowner whose house is too
hot. Short sentences. Concrete. No marketing voice. No adjectives where a fact
would do. Read the existing copy in the city's own area file before you write
and match its register exactly.

The site is the dispatch desk, and it speaks in the first person. Everything
AC Repair Houston actually does is "we": we take the request, we check that a
company covers the street, we pass it on, we make sure somebody calls back, we
keep it free, we check licenses, we answer questions.

The contractor stays third person, always. "the company that covers your area",
"the company we send it to", "the technician who takes the job", "the company
covering Katy". Never "our technician", never "our AC", never "we repair".

Where copy used to apologise, it now says what we stand behind. A line that
used to say "we do not employ anyone and we do not do the work" becomes a line
about the license check. A line that used to say "we do not control response
times" becomes a line about making sure the request reaches a company that
covers your street. Keep the honest limit where it genuinely matters, but put
it after the thing we do stand behind, not instead of it.

Lead with the homeowner's problem. If a sentence has to open with the routing
mechanism, it usually does not: the routing clause belongs later in the
sentence, or on its own.

Five rules, in order of how often they come up:

1. **"We" is the dispatch desk.** "We send it to a company that already works
   your area", not "your request goes to a company that already works your
   area".
2. **The contractor stays third person.** Never "our technician", "our AC",
   "our HVAC", "our team".
3. **Accountability replaces apology.** Say what we do and what we stand
   behind before saying what we cannot promise.
4. **Lead with the homeowner's problem.** The routing clause goes later in the
   sentence.
5. **Keep the facts.** The rewrite changes the actor and the promise. It never
   changes what is true.

6. **Never promise a count of companies.** Whether a request reaches one
   contractor or several has not been decided. When the copy has to state the
   fact, say "the HVAC company or companies working your area". Never write
   "one company", "a single company", "only the company" or "exactly one".
   Where the copy makes a promise to the homeowner, promise the callback
   rather than the number of callers.

## Section titles

A section title is a promise about what is underneath it. It has to be direct,
it has to describe the thing that follows, and it has to carry a semantic
keyword, the location, or both.

- **Direct.** "Signs you need AC Repair in Houston" beats "When people request
  this". If the title could sit on top of any page on the site, it is too
  vague.
- **Describes what is beneath it.** A title over a symptom list should say so.
  A title over a pricing paragraph should say so.
- **Keyword or location.** "AC repair problems common in League City" carries
  both. "Everything under ac repair" carries neither and reads like a
  template.

Never write a title in lower case to force it into a sentence, and never use
"our" in a title. If a service name is an acronym, leave it alone: "AC Repair",
not "ac repair".

## Hard rules the build enforces

Every one of these fails the build. Check each one before you finish.

1. **No em dashes.** Use a full stop, a colon, or a comma. Never type the
   character `—`. Hyphens are fine.
2. **No dollar figures.** No `$` followed by a digit, anywhere. Describe what
   moves a price, never the price itself.
3. **No ratings or counts.** No "5 stars", no "200 reviews", no "50 jobs
   completed", no "10 years in business", no "20 years of experience".
4. **No first-person contractor claims.** "We" is allowed for what we do. It is
   not allowed for what the contractor does. Never "our technicians", "our
   HVAC", "our AC", "our team", "our trucks", "our crew", "our staff", "our
   installers". Never "we are licensed", "we are certified", "we are bonded",
   "we are insured", "we arrive", "we dispatch our", "we send our".
5. **No guarantees.** Do not offer one, do not imply one, do not promise a
   result. You may say "no guarantee", "nobody can promise", "there is no
   guarantee", and you may write a question that asks whether a guarantee
   exists. That is allowed. "We guarantee" is not.
6. **No street address, no map, no storefront, and no phone number.** The site
   publishes one call tracking number, in `data/config.json`. It is the only
   number that may appear anywhere, and it is added by the templates, not by
   copy. Never type a number into a copy file.
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
