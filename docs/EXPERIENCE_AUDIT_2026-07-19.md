# Experience audit — 2026-07-19

Reviewed the running app (home, cabinet, symptoms, calendar, settings), the search flow, and component code.  
Lenses: **Chief Creative Officer**, **Chief UX Officer**, **Chief Product Officer**.

Scores are 0–10, a professional mirror — not a grade.  
**Every recommendation is a proposal. The decisions belong to the product lead.**

> How to use this file: score-check against `AUDIT_SCORECARD.md`, log decisions in
> `VISION.md` §10, then act via `PROMPT_PACK.md` (start with #4 creative explore and
> #3 audit → polish plan).

---

## Executive snapshot

| Lens | Score | Verdict |
|------|-------|---------|
| Chief Creative Officer | 4/10 | Competent, calm, generic. Looks like a scaffold, not a brand. No art direction or emotional signature yet. |
| Chief UX Officer | 6.5/10 | Thoughtful flows and states; hurt by jargon, a dashboard-y home, and weak hierarchy. |
| Chief Product Officer | 7/10 | Rare, strong hero concept (symptom → physical location). Undermined by scope sprawl and dead/dishonest surfaces. |

**Core truth:** the product *thinking* is ahead of the *craft*. The idea is genuinely
differentiated (software that points to a physical place). The presentation makes it look
like a class assignment. Closing that gap is where "world-class demo" lives — mostly craft
and focus, not more features.

---

## 1. Chief Creative Officer

**What’s there:** default Geist font, stone/zinc neutrals, one sage nav, black buttons, two brand color tokens.

| Dimension | Score |
|-----------|-------|
| Brand identity | 3 |
| Art direction / visual craft | 3 |
| Emotional resonance | 3 |
| Differentiation expressed | 4 |
| Typography & color system | 4 |
| Motion / delight | 2 |

**Findings**
- **C1 No art direction (critical).** Swap the logo and it’s any generic health CRUD app. No signature color, type personality, imagery, or motion. Brand is invisible.
- **C2 Emotionally flat.** Touches people when unwell / caregiving, but reads like a spreadsheet ("Take this", "Take out", "0 of 3 doses taken"). Name promises a *companion*; tone delivers an *inventory system*.
- **C3 Weak brand-to-first-viewport.** Name is a tiny eyebrow; logo 32px in nav. First impression = admin panel.
- **C4 The one distinctive asset is under-dramatized.** The physical cabinet + compartment is the unfair advantage, but the compartment number is small gray text except on symptom results.
- **C5 Utilitarian, inconsistent voice.** "Big bays: 15 and 18", "medium/thin/big" vs softer "What are you feeling?".

**Recommendations (she chooses)**
1. Define one feeling in `VISION.md` §6 (proposed: calm, trustworthy, quietly smart).
2. Real palette + type pairing (one warm accent beyond sage; display face for headers).
3. Make the cabinet the hero image / signature asset.
4. One signature delight: compartment "lights up" on a symptom match (mirrors the LED).
5. Write a voice; rewrite ~10 key strings to match.

---

## 2. Chief UX Officer

**Genuinely good (don’t break):**
- Cabinet-first search, then progressive "Show more (N to add)" for the FDA catalog — a mature pattern.
- Loading / empty / error states exist across search, symptoms, calendar (`role="status"`, `role="alert"`).
- Accessibility basics: labels, aria roles, nav `aria-label`.
- Safety UX: symptom results OTC-only + "not medical advice".

| Dimension | Score |
|-----------|-------|
| Information architecture | 6 |
| Task flow clarity | 6 |
| Loading/empty/error states | 8 |
| Visual hierarchy | 5 |
| Microcopy clarity | 5 |
| Accessibility | 7 |
| Mobile fit (390px) | 6 |
| Consistency | 6 |

**Findings**
- **U1 Home is a dashboard, not a doorway (high).** Search + Today doses + out-of-cabinet banner + 2×2 grid all compete. No single obvious action.
- **U2 Domain jargon leaks (high).** "medium/thin/big", "Module A (1–9)", "Big bays: 15 and 18" are internal hardware config shown as UI.
- **U3 Hierarchy inversion (medium).** Compartment number (most valuable) is tiny gray; size label and "Take out" get more weight.
- **U4 Ambiguous verbs (medium).** "Take this" (log a dose) vs "Take out" (remove from cabinet) mean opposite things — risky in a medicine app.
- **U5 Dead / dishonest surface (high).** Home "Scanner" card advertises scanning but links to `/cabinet`; no `/api/scan` exists. A tap = dead end.
- **U6 Dev copy in product (medium).** Settings tells the user to "Run `npm run reminders:watch`".
- **U7 Nav overload (medium).** Five equal top-level links on a phone dilute the story.
- **U8 Inconsistent empty states.** Symptom empties are lovely; cabinet’s many "Empty #N thin" cells look unfinished.

**Recommendations (she chooses)**
1. Make home one doorway (proposed: the "how are you feeling?" entry — the hero).
2. Hide/translate hardware jargon; keep module math internal.
3. Promote the compartment number to hero in the cabinet too.
4. Disambiguate verbs ("I took this" vs "Remove"/"Mark as out").
5. Remove/relabel the Scanner dead end honestly.
6. Strip dev instructions from Settings (README only).
7. Trim nav to the demo story; park Calendar/Settings.

---

## 3. Chief Product Officer

| Dimension | Score |
|-----------|-------|
| Value proposition clarity | 7 |
| Differentiation | 8 |
| Focus / scope discipline | 5 |
| Positioning consistency | 5 |
| Demo readiness | 7 |
| Trust / credibility | 6 |
| Roadmap honesty | 6 |

**Findings**
- **P1 Strong, rare value prop.** "Find the OTC medicine you already own for how you feel, and know exactly where it physically is." Software → physical world is a story most teams can’t tell. Protect it.
- **P2 Scope sprawl (high).** Beyond the core, the app carries prescription schedules, a full month calendar, due-dose banner, browser notifications, and Twilio phone-call reminders with a background watcher. The PRD marked reminders as *stretch, skip unless 1–4 done*; they got built anyway. Each adds failure surface and dilutes the pitch.
- **P3 Split identity (high).** Symptom→cabinet finder vs prescription reminder system get equal billing on home. A world-class product picks one soul.
- **P4 Honesty gaps (high).** Marketing Scanner while `/api/scan` doesn’t exist undercuts the real work.
- **P5 Naming drift (medium).** UI "Pillio" vs PRD/package "MedCabinet". Pick one.
- **P6 No win condition.** No single sentence for what a judge should believe in 90 seconds.

**Recommendations (she chooses)**
1. Name the one job in `VISION.md`; let it win the home screen.
2. Freeze stretch systems (Twilio, notifications, maybe calendar) to backstage — hide, don’t delete teammates’ work.
3. Fix honesty: no Scanner claim until real; one product name.
4. Define the win sentence: "Judges should believe ___."
5. Reframe reminders as roadmap unless she decides reminders *are* the product.

---

## Cross-cutting: 7 highest-leverage moves

Ranked by impact-to-effort for a world-class **demo**. None require new features.

| # | Move | Lens |
|---|------|------|
| 1 | One name, everywhere | CPO/CCO |
| 2 | Give it an actual visual identity (palette + type + one accent) | CCO |
| 3 | Turn home into one clear doorway | CXO |
| 4 | Dramatize the cabinet + compartment as the signature moment | CCO/CXO |
| 5 | Remove jargon + dev copy + dead Scanner | CXO/CPO |
| 6 | Freeze stretch features for the demo | CPO |
| 7 | Write one product voice; rewrite ~10 strings | CCO/CXO |

---

## What’s already strong — do not break

- Cabinet-first progressive search.
- Comprehensive loading/empty/error handling.
- Server-enforced OTC-only safety + "not medical advice".
- Believable seeded world (12 real meds, correct OTC/Rx).
- The compartment-as-physical-location concept — the whole moat.

---

## Reality check: will acting on this "significantly lift" the experience?

**This document does not lift the experience — the decisions and edits it triggers do.**

- Moves **1, 5, 6** (naming, remove dead/dev/jargon, freeze scope): small effort, remove
  the biggest "student project" tells. High confidence, low risk.
- Moves **2, 3, 4, 7** (identity, doorway, hero drama, voice): where the real jump from
  "6/10 competent" to "8–9/10 memorable" happens. More design judgment; needs her taste
  and 2–3 focused iterations, not a rewrite.

Expected trajectory if pursued with focus:
- Creative 4 → 7–8, UX 6.5 → 8, Product 7 → 8–9.

But only if the team **resists adding features** and spends the effort on craft + focus.
Adding more capability now would likely *lower* the scores. The lift is real, and it is
earned through restraint and polish — not more surface area.
