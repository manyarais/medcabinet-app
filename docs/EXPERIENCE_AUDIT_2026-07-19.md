# Experience audit — 2026-07-19

Reviewed the running app (home, cabinet, symptoms, calendar, settings), the search flow, and component code.  
Lenses: **Chief Creative Officer**, **Chief UX Officer**, **Chief Product Officer**.

Scores are 0–10, a professional mirror — not a grade.  
**Every recommendation is a proposal. The decisions belong to the product lead.**

> How to use this file: score-check against `AUDIT_SCORECARD.md`, log decisions in
> `VISION.md` §10, then act via `PROMPT_PACK.md` (start with #4 creative explore and
> #3 audit → polish plan).
>
> **Each finding below carries its own inline “→ Next step”** with the concrete action,
> the file(s) involved, an effort size (S/M/L), an owner blank, and an acceptance check.
> The fuller specs (palette hex values, type pairing, string rewrites) live in
> `EXPERIENCE_UPLIFT_PLAN.md`, referenced by Move number. **No code is changed by these
> docs — they are the next-steps backlog; the decisions stay with the product lead.**

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

**Findings + detailed next steps**

- **C1 No art direction (critical).** Swap the logo and it’s any generic health CRUD app. No signature color, type personality, imagery, or motion. Brand is invisible.
  - **→ Next step (Move 2, M):** Build a real design system in `src/app/globals.css`. Recommended starter palette: warm paper bg `#f6f4ee`, warm ink `#20302c`, confident brand green `#3f6f66`, honey CTA accent `#e08a4b`, distinct Rx caution `#b4791f`. Add a radius scale (cards `rounded-2xl`) and one soft elevation shadow. Owner: ____ · Decision (palette): log in `VISION.md` §10.
  - **Acceptance:** with the logo hidden, a stranger can tell this is an intentional, distinct brand.

- **C2 Emotionally flat.** Touches people when unwell / caregiving, but reads like a spreadsheet ("Take this", "Take out", "0 of 3 doses taken"). Name promises a *companion*; tone delivers an *inventory system*.
  - **→ Next step (Move 7, S):** Pick one voice in `VISION.md` §6 (proposed: “calm sibling who knows medicine”). Rewrite ~10 core strings (see the string table in `EXPERIENCE_UPLIFT_PLAN.md` Move 7). Owner: ____.
  - **Acceptance:** one consistent, warm voice across home, cabinet, symptoms.

- **C3 Weak brand-to-first-viewport.** Name is a tiny eyebrow; logo 32px in nav. First impression = admin panel.
  - **→ Next step (Move 3, M):** In `src/app/page.tsx`, lead with brand + a one-line promise as a real hero (e.g. “Find what to take — and where it is.”). Elevate the name from eyebrow to headline-level presence.
  - **Acceptance:** the brand + promise is the dominant element above the fold at 390px.

- **C4 The one distinctive asset is under-dramatized.** The physical cabinet + compartment is the unfair advantage, but the compartment number is small gray text except on symptom results.
  - **→ Next step (Move 4, M/L):** In `src/app/cabinet/page.tsx` (`CompartmentCell`), make the compartment number the hero of each cell (large, `--brand`, `tabular-nums`); give modules a physical “cabinet door” feel with subtle depth. This is the screenshot-worthy screen.
  - **Acceptance:** compartment number is the first thing the eye lands on; cabinet looks screenshot-worthy.

- **C5 Utilitarian, inconsistent voice.** "Big bays: 15 and 18", "medium/thin/big" vs softer "What are you feeling?".
  - **→ Next step (Move 4 + 7, S):** Remove hardware jargon from user-facing copy (cabinet sub-header + cell size labels); align remaining copy to the one voice. Keep module math internal in `src/lib/compartments.ts`.
  - **Acceptance:** no `medium/thin/big` or “Big bays” text visible to users.

**Recommendation summary (she chooses):** define the feeling → build palette + type pairing → make the cabinet the signature asset → add a “light up on match” delight → write and apply one voice.

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

**Findings + detailed next steps**

- **U1 Home is a dashboard, not a doorway (high).** Search + Today doses + out-of-cabinet banner + 2×2 grid all compete. No single obvious action.
  - **→ Next step (Move 3, M):** Rebuild `src/app/page.tsx` around one dominant action (proposed: “How are you feeling?” → Symptoms in `--accent`), search as clear second, a quiet cabinet-status line, and no competing grid. Restyle/retire `HomeFeatureCard.tsx` / `HomeTodayCard.tsx`.
  - **Acceptance:** one action is visually dominant above the fold at 390px.

- **U2 Domain jargon leaks (high).** "medium/thin/big", "Module A (1–9)", "Big bays: 15 and 18" are internal hardware config shown as UI.
  - **→ Next step (Move 4/5, S):** Remove size labels from `CompartmentCell` and the “Big bays” sub-header in `cabinet/page.tsx`. Express size (if needed) via cell proportions, not text.
  - **Acceptance:** no hardware jargon visible to users.

- **U3 Hierarchy inversion (medium).** Compartment number (most valuable) is tiny gray; size label and "Take out" get more weight.
  - **→ Next step (Move 4, M):** Re-weight `CompartmentCell`: compartment number largest/brand-colored; demote the toggle button; drop the size label.
  - **Acceptance:** compartment number is the clear focal point of a filled cell.

- **U4 Ambiguous verbs (medium).** "Take this" (log a dose) vs "Take out" (remove from cabinet) mean opposite things — risky in a medicine app.
  - **→ Next step (Move 7, S):** In `SymptomSearch.tsx` change “Take this” → “I took this”; in `CabinetOutToggleButton.tsx` change “Take out” → “Mark as out” (keep “Put back”). Never reuse “take” for both actions.
  - **Acceptance:** log-a-dose and remove-from-cabinet use clearly different verbs.

- **U5 Dead / dishonest surface (high).** Home "Scanner" card advertises scanning but links to `/cabinet`; no `/api/scan` exists. A tap = dead end.
  - **→ Next step (Move 5, S — do first):** Remove the Scanner card from `page.tsx`. Optionally replace with a non-clickable “Coming with the cabinet” note.
  - **Acceptance:** no link on home leads nowhere.

- **U6 Dev copy in product (medium).** Settings tells the user to "Run `npm run reminders:watch`".
  - **→ Next step (Move 5, S — do first):** Strip npm/`.env`/file-path text from `CallReminderPanel.tsx`; move any setup notes to `README.md`.
  - **Acceptance:** no `npm run …`, `.env`, or paths appear in the UI.

- **U7 Nav overload (medium).** Five equal top-level links on a phone dilute the story.
  - **→ Next step (Move 6, S):** Trim `AppNav.tsx` to the hero story (e.g. Home, Cabinet, Symptoms); keep Calendar/Settings reachable by URL, not in primary nav.
  - **Acceptance:** nav shows only the demo story.

- **U8 Inconsistent empty states.** Symptom empties are lovely; cabinet’s many "Empty #N thin" cells look unfinished.
  - **→ Next step (Move 4, S):** Design the empty bay in `CompartmentCell` as a calm, intentional “open” state (no size text).
  - **Acceptance:** empty bays look designed, not like scaffolding.

**Recommendation summary (she chooses):** one-doorway home → de-jargon + compartment hierarchy → verb disambiguation → remove Scanner dead end + dev copy → trim nav → intentional empties.

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

**Findings + detailed next steps**

- **P1 Strong, rare value prop.** "Find the OTC medicine you already own for how you feel, and know exactly where it physically is." Software → physical world is a story most teams can’t tell. Protect it.
  - **→ Next step (S):** Write this as the one-job sentence in `VISION.md` §1 & §5, and let it drive the home doorway (Move 3). Guardrail: don’t dilute it with new features.
  - **Acceptance:** the hero journey is the thing the product visibly optimizes for.

- **P2 Scope sprawl (high).** Beyond the core, the app carries prescription schedules, a full month calendar, due-dose banner, browser notifications, and Twilio phone-call reminders with a background watcher. The PRD marked reminders as *stretch, skip unless 1–4 done*; they got built anyway. Each adds failure surface and dilutes the pitch.
  - **→ Next step (Move 6, S):** Decide finder-vs-reminders soul (log in `VISION.md` §10). For the demo, hide `DueDosesBanner` from `layout.tsx` and drop Calendar/Settings from nav — **hide, don’t delete** teammates’ code. Record the freeze in `CAPABILITIES.md`.
  - **Acceptance:** no stretch feature can break the 90-second demo; code still present in repo.

- **P3 Split identity (high).** Symptom→cabinet finder vs prescription reminder system get equal billing on home. A world-class product picks one soul.
  - **→ Next step (Move 3/6, M):** Give the home screen a single identity (proposed: the finder). Reminders become a supporting act, not a co-headliner.
  - **Acceptance:** a viewer can name the product’s one purpose after seeing home.

- **P4 Honesty gaps (high).** Marketing Scanner while `/api/scan` doesn’t exist undercuts the real work.
  - **→ Next step (Move 5, S — do first):** Remove the Scanner CTA (see U5). If mentioned at all, label it clearly as future/roadmap.
  - **Acceptance:** nothing in the UI claims a capability that isn’t working in this build.

- **P5 Naming drift (medium).** UI "Pillio" vs PRD/package "MedCabinet". Pick one.
  - **→ Next step (Move 1, S — do first):** Choose one public name (recommended: Pillio); align all user-facing copy, `README.md`, `PRD.md`, and comments. (npm package name is internal — optional.)
  - **Acceptance:** UI, README, and PRD agree on one name.

- **P6 No win condition.** No single sentence for what a judge should believe in 90 seconds.
  - **→ Next step (S):** Fill the win sentence in `DEMO_SCRIPT.md`: “Judges should believe ____.” Use it to decide what’s on/off stage.
  - **Acceptance:** the demo script opens and closes on that one belief.

**Recommendation summary (she chooses):** name the one job → freeze stretch to backstage (hide, not delete) → fix honesty (Scanner, single name) → define the “judges should believe ___” sentence → reframe reminders as roadmap unless she decides otherwise.

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
