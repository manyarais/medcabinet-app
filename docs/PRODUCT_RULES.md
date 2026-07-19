# Product rules — raise the bar, don’t cage the vision

These rules help Cursor and the team improve experience quality.  
They use **Must / Should / May** so creativity stays alive.

- **Must** = trust, safety, demo reliability (few of these)
- **Should** = quality direction (flexible how)
- **May** = creative playground (invent here)

If a rule blocks a taste decision, it’s too tight — loosen it.  
If a rule prevents a broken or unsafe demo, keep it.

---

## How to use this file in prompts

Tell Cursor:

> Obey Musts. Improve Shoulds with taste. For Mays, propose options and let me choose.  
> Do not add new product scope unless I explicitly ask.

---

## A. Must (non-negotiable)

### M1. Not a doctor
The product surfaces FDA label text, cabinet inventory, and user logs.  
It must not diagnose, prescribe, or sound like medical advice.

**Done means:** key flows (especially Symptoms) include clear “not medical advice” framing, and copy never says “you should take X for Y” as clinical guidance.

### M2. Symptom results are OTC-only
Prescription medications must never appear as symptom matches — even if label text mentions the symptom.

**Done means:** a seeded Rx med cannot show up for `headache` (or similar).

### M3. Golden path reliability
The demo path in `DEMO_SCRIPT.md` works on a phone from a seeded database.

**Done means:** cold start → seed → known inputs succeed without heroics.

### M4. Honest capability claims
Do not present Scanner / hardware ingest as finished if `POST /api/scan` (or equivalent) isn’t working in this build.

**Done means:** UI either works end-to-end, or is clearly future/coming-soon/hidden.

### M5. Mobile-first at demo size
Primary flows are usable around **390px** width.

**Done means:** no essential tap target or label is clipped/unusable on a phone.

### M6. Ask before expanding scope
New pages, new integrations, or new product pillars need a human yes.

**Done means:** polish prompts don’t quietly invent auth, shopping, social, diagnosis, etc.

---

## B. Should (quality bar — flexible how)

### S1. Brand is unmistakable
Someone should recognize the product identity on the first screen — not only in a tiny nav mark.

**Enhancing question:** If you removed the nav, would a stranger still know this is *your* product?

**Recommendation:** Make the name a first-viewport signal. You choose how expressive or minimal.

### S2. One clear primary action per screen
Each screen should have a main job. Secondary actions can exist; they shouldn’t compete equally.

**Enhancing question:** What’s the one thing a rushed person should do here?

**Recommendation:** Home’s primary action is probably search *or* “I’m not feeling well” — pick the doorway that matches your vision in `VISION.md`.

### S3. Three states for every fetch
Loading, empty, and error should feel intentional.

**Enhancing question:** What would a kind product say when nothing matches?

### S4. Compartment is a first-class object
When location matters, compartment number should be easy to see quickly.

**Enhancing question:** Could a parent see the number from arm’s length?

### S5. Words are part of the product
Labels, empty states, and button names should sound like one product voice.

**Enhancing question:** Do you sound like a sibling, a nurse, or a gadget? Pick and stay consistent.

### S6. Showcase clutter control
Things not in the demo script can exist, but shouldn’t steal attention on the opening screens.

**Enhancing question:** Is this link earning its place in the first 10 seconds?

**Recommendation:** Prefer hide/de-emphasize over deleting teammates’ stretch work.

### S7. Seeded world feels real
Demo data should feel like a believable cabinet, not placeholder junk.

### S8. Prefer evolving the hero over adding side quests
If time is short, improve symptom→compartment clarity before adding a new page.

---

## C. May (creative sandbox — invent here)

You are encouraged to explore:

- Visual identity, color atmosphere, illustration, texture (beyond flat defaults)
- Motion that adds presence (entrance, feedback, LED-related delight)
- Personality in microcopy (as long as Must safety holds)
- Cabinet visualization ideas (physical feel, modules, empty bay beauty)
- Alternative home compositions that still honor a clear primary action
- Sound/haptics experiments if available and tasteful
- Naming of sections, onboarding one-liners, demo theatricality

### Creative prompts when you’re stuck
1. “What would make this feel like a product we’d keep using after the showcase?”
2. “What detail would only *our* team have thought of?”
3. “If the cabinet had a personality, how would the UI speak?”
4. “Where can we show craft without adding features?”

### Soft boundaries inside the sandbox
- Avoid fake medical authority styling that conflicts with M1.
- Avoid clutter trophies (stat strips, sticker spam) that hide the hero action.
- Avoid building a second product in Settings.

---

## D. Decision helper (when details are missing)

When the PRD is silent, don’t freeze — decide with this ladder:

1. **What would make the wow moment clearer?**
2. **What would make the demo more honest?**
3. **What would make the UI feel more like our vision words?**
4. **What can wait until after showcase?**

Write the decision in `VISION.md` §10 (Open decisions log), then build.

---

## E. Anti-patterns (watch for these)

Not banned forever — just pause and ask “is this helping the vision?”

- Turning home into a dashboard of equal cards before the story is clear
- Adding features to impress instead of sharpening the hero path
- Copy that sounds like diagnosis
- Scanner buttons that go nowhere
- Design that could belong to any random health startup with the logo swapped
- Huge reminder systems overshadowing cabinet+symptom identity

If the team loves an anti-pattern for a good reason, capture why in `VISION.md` and proceed consciously.

---

## F. Definition of “better” for this project

Better means:
- clearer story
- stronger trust
- more reliable demo
- more distinctive craft
- more of *her* vision visible

Better does **not** automatically mean:
- more screens
- more APIs
- more settings
- more AI features
- more enterprise architecture
