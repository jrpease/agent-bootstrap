# Copy

The words are a designed system like type or colour, and they fail the same way — by defaulting.

Read at **Spec** (step 5), and again while building each section. Copy written after the layout
exists is caption-writing; the page ends up well-directed and under-sold.

**Why this file exists.** Every other discipline in this skill got a repertoire and a floor. Copy
had 79 words, most of them prohibitions. A live build came back well-art-directed with flat
positioning — good sentences wherever real product mechanics existed, category description
everywhere the page had to say what the product *was*. Prohibitions produce that: they tell you
what not to write and nothing about what to write.

---

## The measured reference

Shipped hero copy from `canon.md`, extracted from the live pages 2026-08-18.

**The lines that work:**

```
FULL TOURS, NO EXCUSES.                             #42 Truck'N Roll
On–Demand Design Department                         #17 px push
we just have great taste in friends                 #53 e2.vc
Pear makes you appear.                              #57 Pear
  ↳ You pay nothing to start: no retainer, no project fee,
    no hours on a clock. We carry the cost.
Not a style, a perspective.                         #36 noth.in
```

**The line that does not:**

```
Our Network Infrastructure Drives Modern
Autonomous Platforms                                #22 BotBlox
```

**What separates them.** Every working line either **makes a promise with stakes in it**
("FULL TOURS, NO EXCUSES" — the thing a promoter is actually afraid of), or **names the offer as a
thing you can have** ("On–Demand Design Department" — that is the product, stated as a noun), or
**says something only this company could say** ("we just have great taste in friends" — a VC whose
differentiator is its network). The failing line names a category and a set of adjectives.

**BotBlox is the canon's weakest entry on every other measure too.** The correlation is not an
accident: a page that reaches for the default sentence reaches for the default typeface.

**Pear is the model to study.** A memorable line *plus* a subhead that states the offer in terms a
reader can check: *no retainer, no project fee, no hours on a clock.* Most pages ship the first
half and skip the second, which is how a site ends up atmospheric and unsold.

**One exception, and know why it is one.** Studio sites in the canon run flat category descriptions
— "Global creative & technology studio," "AI production house in Paris." They can, because the
*work* on the page is the argument and the copy only has to label it. **If your page has no
portfolio doing the arguing, you do not get this exemption.**

---

## The jobs

Each piece of copy on the page has one. Write to the job, not to the space.

| Piece | Its job | Fails when |
|---|---|---|
| **Hero line** | Make the promise, or name the offer | It sets a mood and leaves the reader unable to say what this is |
| **Hero subhead** | State the offer concretely enough to be checked | It restates the headline in longer words |
| **Section claim** | Assert one thing the section then substantiates | It is a topic label — "Features", "How it works", "Our approach" |
| **Body** | Substantiate the claim with a mechanism | It describes the product's parts rather than what they do for the reader |
| **Label / eyebrow** | Locate the reader | It repeats the headline, or exists only to have something above the headline |
| **CTA** | Name the action and what happens next | "Learn more", "Get started" with no object |
| **Close** | Leave the argument resolved | It is a second CTA with a different verb |

**The hero rule.** A mood line is legitimate — half the canon uses one — **but only paired with an
offer line.** "It starts in a back room" is a good sentence that tells a tournament organiser
nothing about what they get. Pair it, or replace it.

**The stranger test.** Show only the first screen to someone who has never heard of the product.
Can they say what it is and who it is for? If not, the hero has not done its job, however well it
reads.

---

## Method

1. **Find the real problem.** Not the category, not the feature list. What is the reader afraid of,
   tired of, or unable to do today? "Full tours, no excuses" exists because promoters lose money
   on cancelled dates.
2. **Write the offer in one plain sentence, badly.** "We run your tournaments so you don't manage
   brackets in a spreadsheet." Ugly and clear beats elegant and vague. This sentence is what you
   are decorating.
3. **Find what only this company can say.** A fact, a stance, a piece of the mechanism nobody else
   has. That is the headline candidate.
4. **Cut every sentence that would survive on a competitor's site unchanged.** This is the
   convergence test applied to words, and it is the fastest edit in this file.
5. **Read it aloud.** Copy that cannot be spoken has not been written, it has been assembled.

---

## Craft floor — mechanical, pass/fail

- **The offer appears above the fold**, in the hero line or its subhead. Not in section two.
- **No section claim is a topic label.** "Features", "How it works", "Benefits", "Our approach",
  "Why us" are headings, not claims. Replace with the assertion the section proves.
- **Every number is real** and traceable to something true. No rounded-up proxies.
- **Sentence rhythm varies.** Three consecutive sentences of similar length and structure is a
  default cadence; break one.
- **No sentence over ~28 words** in body copy. Display lines much shorter — the canon's run 2–6
  words.
- **The CTA has an object.** "Start a tournament", "Send the application", "Book a call" — not
  "Learn more", "Get started", "Explore".
- **Second person, mostly.** The reader is the subject; the company is not the hero of the page.
- **Read the labels last** and delete the ones that repeat what is directly below them.

---

## Never fabricate

Customers, metrics, integrations, certifications, awards, testimonials, pricing, case studies, or
logos. This is absolute and outranks every other instruction here. A page that would be better with
a statistic does not get one; it gets a mechanism instead.

Mark placeholders clearly and visibly — `{{LIKE_THIS}}` — never as plausible-looking real content.
Client-supplied copy is not an exemption from the tell list; an unexamined cliché from the brief is
still shipped on your page.

## Ban list

Filler that survives because nobody read it back: *unlock seamless workflows · powerful AI-driven
insights · built for modern teams · supercharge productivity · next-generation platform ·
all-in-one solution · empower your team · take it to the next level · reimagine · effortlessly ·
robust · cutting-edge · best-in-class · industry-leading.*

**Two structural clichés**, both of which pass the word-level ban and still read as generated:

- **The antithesis triple** — "One player, one record, one bracket." Also its cousin, the
  "40 X. One Y." formula already on `SKILL.md`'s tell list. Once on a page is a device; twice is a
  tic.
- **The category restatement** — "Zygarden runs the tournaments and holds the communities of
  competitive Pokémon." Accurate, unobjectionable, and it argues nothing. This is the most common
  hero failure and no ban list catches it, because every word in it is fine.

---

## In `DESIGN.md`

```
Hero line: <the promise or the offer>
Offer line: <what the reader gets, checkable>
Section claims: <one assertion per section, in order>
CTA: <verb + object>
```

The critic reads the shipped copy against the tell list and against these four fields. A hero line
that names a category, or a section claim that is a topic label, is a finding at ordinary severity
regardless of how well the page is art-directed.
