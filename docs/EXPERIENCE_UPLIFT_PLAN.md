# Experience uplift plan — from 6/10 to 9–10

Turns the findings in `EXPERIENCE_AUDIT_2026-07-19.md` into concrete, buildable specs.

**This is a specification, not an order.** Every value below (colors, fonts, words,
layout) is a *recommended starting point*. Change anything that doesn’t match your
vision — then write your choice in `VISION.md` §10 before building.

**How to use with Cursor:** pick one section, attach `docs/VISION.md`,
`docs/PRODUCT_RULES.md`, and this file, then use a prompt from `PROMPT_PACK.md`
(start with #4 explore, then #5 implement). Do one section per PR. Verify each
acceptance check on a real phone.

Effort key: **S** small · **M** medium · **L** larger (still no new features).

---

## The rule that makes this work

Every item below is **craft or focus** — none add features.  
If a change adds a new capability, it does not belong in this plan.  
The jump to 9–10 comes from restraint + polish, not more surface area.

---

## Move 1 — One name, everywhere (S) · CPO/CCO

**Problem:** UI says **Pillio**; `PRD.md` and `package.json` say **MedCabinet**. Naming drift reads as “unfinished.”

**Decision needed (hers):** the one public name.
- Recommended: **Pillio** (already the UI brand, softer, more product-like).

**Where it currently appears**
- UI / metadata: “Pillio” (`layout.tsx`, home header, nav logo alt)
- `package.json` `"name": "medcabinet-app"`
- `PRD.md` title + prose
- Prisma schema comment “Prisma schema for MedCabinet.”

**Spec**
- Choose one name; make every *user-facing* string match. (The npm package name is internal — optional to change.)
- Update `PRD.md` and comments to the same name for team clarity.

**Acceptance checks**
- [ ] No user-visible screen shows the non-chosen name.
- [ ] README, PRD, and UI agree.

---

## Move 2 — A real visual identity (M) · CCO  *(biggest perceived-quality lift)*

**Problem:** default Geist + neutral zinc/stone + one sage = generic. Two brand tokens total. Swap the logo and it’s any health CRUD app.

**Decision needed (hers):** the feeling (VISION §6). Recommended: **calm, trustworthy, quietly smart, warm.**

### 2a. Color system (recommended starting palette — change freely)
Current tokens live in `src/app/globals.css`:

```3:8:src/app/globals.css
  --background: #f7faf9;
  --foreground: #18181b;
  --brand-sage: #cfe0dd;
  --brand-sage-deep: #5a7a74;
```

Recommended expansion (a warm, trustworthy “apothecary” direction):

| Token | Value (starter) | Role |
|-------|-----------------|------|
| `--bg` | `#f6f4ee` | warm paper background (replaces cold stone) |
| `--surface` | `#ffffff` | cards |
| `--ink` | `#20302c` | primary text (warm near-black, not pure zinc) |
| `--brand` | `#3f6f66` | primary brand green (deeper, more confident sage) |
| `--brand-soft` | `#cfe0dd` | tints, OTC badge (keep existing) |
| `--accent` | `#e08a4b` | warm honey accent for primary CTAs / highlights |
| `--rx` | `#b4791f` | Rx / caution (distinct from CTA accent) |
| `--muted` | `#6b7772` | secondary text |

> Note: today the primary buttons are pure black (`bg-zinc-900`) and Rx uses amber.
> If you adopt a warm `--accent` for CTAs, keep Rx visually distinct so “caution”
> and “do this” never look the same.

### 2b. Type pairing (recommended — change freely)
- Keep **Geist** for body/UI (already loaded via `next/font/google` in `layout.tsx`).
- Add a **display face for headings** to create personality. Candidates:
  - *Fraunces* (warm, human, slightly editorial) — recommended for “companion” warmth
  - *Newsreader* / *Source Serif* (calm, trustworthy)
- Load it the same way Geist is loaded (`next/font/google`), expose a CSS var, and use it only for `h1/h2` and the hero number.
- The repo rule requires reading `node_modules/next/dist/docs/01-app/01-getting-started/13-fonts.md` before adding fonts — it self-hosts Google fonts, so no runtime request.

### 2c. Surface & depth
- Introduce a soft radius scale (e.g. cards `rounded-2xl`) and one gentle shadow token for elevation, instead of flat 1px borders everywhere.
- Add generous vertical rhythm; medicine UI should feel unhurried.

**Acceptance checks**
- [ ] With the logo hidden, a stranger can tell this is a distinct, intentional brand.
- [ ] Headings use the display face; body stays Geist.
- [ ] CTA color ≠ Rx/caution color.
- [ ] Passes contrast (text on `--bg`/`--brand` meets WCAG AA).

---

## Move 3 — Home becomes one doorway (M) · CXO

**Problem (U1):** home is a dashboard — search + “Today” doses + out-of-cabinet banner + a 2×2 grid (Cabinet/Symptoms/Calendar/Scanner) all compete. No single obvious action.

**Decision needed (hers):** the primary doorway. Recommended: **“How are you feeling?”** (the hero journey), with search as the clear second option.

**Spec (recommended structure)**
1. **Brand + one-line promise** (hero). Example promise to adapt:
   *“Find what to take — and exactly where it is.”*
2. **Primary action:** a single prominent entry to Symptoms (large, `--accent`).
3. **Secondary action:** “Search your medicines” (search field or link).
4. **Quiet utility strip:** a small “X in your cabinet · Y need attention” line linking to Cabinet — not four equal cards.
5. **Remove the Scanner card entirely** (see Move 5).
6. Demote/remove the “Today’s doses” block from home *if* reminders are backstage (Move 6). If kept, make it clearly secondary.

Files involved: `src/app/page.tsx`, `HomeFeatureCard.tsx`, `HomeTodayCard.tsx`.

**Acceptance checks**
- [ ] One action is visually dominant above the fold at 390px.
- [ ] No dead-end links on home.
- [ ] A stranger states the app’s purpose in <10s.

---

## Move 4 — Dramatize the cabinet + compartment (M/L) · CCO/CXO  *(your signature)*

**Problem (C4, U2, U3, U8):** the physical cabinet is your unfair advantage but it’s under-designed — the compartment number is tiny gray text, engineering jargon (`medium/thin/big`, “Module A (1–9)”, “Big bays: 15 and 18”) is shown to users, and empty cells look unfinished.

**Spec**
- **Compartment number = hero** in each occupied cell (large, `--brand`, `tabular-nums`).
- **Hide hardware jargon** from users: remove the `medium/thin/big` size labels and “Big bays” copy. Keep module math internal (it already lives in `src/lib/compartments.ts`). If size matters visually, express it through *cell proportions*, not a text label.
- **Make it feel physical:** treat modules like a real cabinet — consistent bays, subtle depth/inset, a clear “door” feel. This is your logo-worthy screen; invest here.
- **Intentional empties:** empty bays should look designed (soft, calm “open” state), not like `Empty #10 thin` scaffolding.
- **Signature delight (see Move 6):** when arriving from a symptom match, the matched compartment visibly “lights up” (glow/pulse) to mirror the hardware LED.

Files: `src/app/cabinet/page.tsx` (the `ModuleGrid` / `CompartmentCell`), styling in `globals.css`.

**Acceptance checks**
- [ ] Compartment number is the first thing the eye lands on in a filled cell.
- [ ] No `medium/thin/big` or “Big bays” text visible to users.
- [ ] Empty bays look intentional.
- [ ] Cabinet screen looks “screenshot-worthy.”

---

## Move 5 — Remove the “student project” tells (S) · CXO/CPO  *(do first — high confidence)*

Three quick honesty/polish fixes:

**5a. Kill the Scanner dead-end (U5).**
Home shows a “Scanner — Scan a bottle when hardware is ready” card that links to `/cabinet`; there is no `/api/scan`.
- Recommended: remove it from home. Optionally keep an honest, non-clickable “Coming with the cabinet” note elsewhere.

**5b. Strip dev instructions from the product (U6).**
`CallReminderPanel.tsx` tells the *user* to run `npm run reminders:watch`, and to edit `.env`.
- Move all dev/setup instructions to `README.md`. User-facing copy should never mention npm scripts or `.env`.

**5c. De-jargon (part of Move 4)** — listed here too because it’s a quick tell.

**Acceptance checks**
- [ ] No link on any screen leads nowhere.
- [ ] No `npm run …`, `.env`, or file paths appear in the UI.

---

## Move 6 — Freeze stretch features for the demo (S, decision) · CPO

**Problem (P2, P3):** prescription calendar, due-dose banner, browser notifications, and Twilio phone calls sprawl past the hero and split the product’s identity. The PRD marked reminders as *stretch — skip unless 1–4 done*.

**Decision needed (hers):** is Pillio a **symptom→cabinet finder** (recommended soul) or a **reminder system**? Pick one to lead.

**Spec (recommended — hide, don’t delete teammates’ work)**
- Remove `Calendar` and `Settings` from the primary nav for the demo build; keep the routes reachable by URL.
- Remove the always-on `DueDosesBanner` from the global layout for the demo (it currently renders on every page via `layout.tsx`).
- Reframe reminders as a roadmap slide, not a live tab — unless she decides reminders *are* the product.

**Acceptance checks**
- [ ] Nav shows only the hero story (e.g. Home, Cabinet, Symptoms).
- [ ] No stretch feature can break the 90-second demo.
- [ ] Teammates’ reminder code still exists in the repo (hidden, not deleted).

---

## Move 7 — One product voice (S) · CCO/CXO

**Problem (C2, C5, U4):** copy is utilitarian and inconsistent; verbs are risky (“Take this” = log a dose vs “Take out” = remove from cabinet — opposite meanings, one tap apart).

**Decision needed (hers):** the voice. Recommended: **calm sibling who happens to know medicine** — warm, plain, never clinical, never salesy.

### Recommended string rewrites (adapt to your voice)

| Where | Now | Suggested |
|-------|-----|-----------|
| Home headline | “Your cabinet companion” | “Find what to take — and where it is.” |
| Home sub | “Search what you have, check today’s doses, and jump into any feature.” | “Tell Pillio how you feel, and it points to what’s already in your cabinet.” |
| Symptoms verb | “Take this” | “I took this” |
| Cabinet verb | “Take out” | “Mark as out” (and “Put back”) |
| Cabinet sub | “Two modules (1–9 and 10–18). Big bays: 15 and 18.” | “Everything in your cabinet, by compartment.” |
| Symptoms empty | “No medications in your cabinet list this symptom on their label.” | “Nothing in your cabinet matches that. Try another word, or search to add something.” |
| Detail back link | “← Back to search” | keep, or “← Back” |
| Symptoms disclaimer | keep “not medical advice” | keep (required by PRODUCT_RULES M1) |

**Verb-safety rule:** the dose-logging action and the inventory-removal action must never
use the same word (“take”). This is a trust issue in a medicine app.

**Acceptance checks**
- [ ] One consistent voice across home, cabinet, symptoms.
- [ ] Log-a-dose and remove-from-cabinet use clearly different verbs.
- [ ] “Not medical advice” still present where meds meet symptoms.

---

## Suggested order & sequencing

Do them as small, separate PRs so nothing snowballs:

1. **Move 5** (tells) + **Move 1** (name) — fast, high-confidence, low risk. *(S)*
2. **Move 7** (voice) — cheap, big trust/emotion gain. *(S)*
3. **Move 6** (freeze scope) — a decision + nav trim. *(S)*
4. **Move 2** (identity) — the perceived-quality jump. *(M)*
5. **Move 3** (home doorway) — depends on 2 + 6. *(M)*
6. **Move 4** (cabinet drama) — the signature; depends on 2. *(M/L)*

Expected trajectory if pursued with focus (from the audit): Creative 4→7–8, UX 6.5→8, Product 7→8–9.

---

## Guardrails while doing this (from PRODUCT_RULES)

- Obey Musts (safety, OTC-only, honesty, mobile 390px).
- Don’t add features. If tempted, park it in `CAPABILITIES.md` idea lot.
- Keep teammates’ stretch work in the repo (hide, don’t delete).
- Every PR: verify on a real phone with the demo inputs (`Tylenol`, `headache`, `broken arm`).
- Log each identity/voice/scope decision in `VISION.md` §10.

---

## What this plan deliberately does NOT do

- It does not choose your brand for you — it proposes and leaves the call to you.
- It does not touch the data model, APIs, or add pages.
- It does not delete the reminder/calendar work your teammates built.
- It does not guarantee a score — the lift comes from your decisions and iteration.
