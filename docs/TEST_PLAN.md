# Test plan

**Status today: there are no automated tests and no test runner in the repo.**  
The only safety nets are ESLint (`npm run lint`) and TypeScript during `next build`.

This is a plan, not tests. It says *what* to verify, *in what order*, and *how you’d
know it passes* — so the team (or Cursor) can add tests later as a focused task.

**For the demo:** a rehearsed manual pass (`DEMO_SCRIPT.md`) matters more than coverage.  
**For confidence + not regressing safety rules:** the units in Tier 1 are worth it.

> How to use with Cursor: when ready, attach this file + `TECH_GUARDRAILS.md` and ask it
> to “set up Vitest and implement Tier 1 only; show the plan first.” Keep it small.

---

## Priorities (do in this order)

| Tier | What | Why | Effort |
|------|------|-----|--------|
| **1** | Safety + core pure logic (unit) | Protects the one rule you can’t get wrong on stage, plus the hero logic | S |
| **2** | Remaining `src/lib` pure functions (unit) | Cheap, stabilizes behavior | S–M |
| **3** | API route behavior (integration) | Confidence the endpoints do what the UI expects | M |
| **4** | Golden-path end-to-end (browser) | One rehearsed happy path automated | M |

Recommended stop point for a prototype: **Tier 1 (and maybe 2).** Tiers 3–4 only if time allows.

---

## Recommended tooling (proposal — team decides)

- **Unit / integration:** [Vitest](https://vitest.dev) — fast, TS-native, minimal config; pairs well with Next 16.
- **End-to-end (optional):** [Playwright](https://playwright.dev) — one script for the golden path on a mobile viewport.
- Add scripts (when implemented): `"test": "vitest run"`, `"test:watch": "vitest"`, optionally `"test:e2e": "playwright test"`.
- Keep tests colocated (`*.test.ts` next to the file) or in `src/**/__tests__/` — team’s choice.

> Note (`TECH_GUARDRAILS.md`): adding a test runner is an allowed dev dependency because it
> protects the demo. It should not change app behavior or the data model.

---

## Tier 1 — safety + core (write these first)

### T1.1 — SAFETY: prescriptions never appear in symptom results (highest priority)
- **Under test:** the OTC-only filter in `src/app/api/symptoms/route.ts`
  (`cabinetMeds.filter((med) => med.productType === "OTC")`).
- **Cases:**
  - A cabinet with an Rx med whose label text contains the symptom term → Rx med is **absent** from `matches`.
  - An OTC med whose label mentions the symptom → **present** in `matches`.
  - Mixed cabinet → only OTC come back.
- **Acceptance:** it is impossible for a `PRESCRIPTION` product to appear in symptom `matches`, even when its text matches.
- **Note:** this is the one invariant worth protecting even if nothing else gets tested. Best done as an integration test (see Tier 3 setup) or by extracting the filter+match into a pure function and unit-testing that.

### T1.2 — Symptom matching / excerpt logic
- **Under test:** `src/lib/symptoms.ts` — `excerptAroundMatch`, `findMatchExcerpt`.
- **Cases:**
  - Case-insensitive match (`Headache` matches `headache`).
  - Match found in `purpose` vs falling back to `indications`.
  - No match → returns `null`.
  - Excerpt trims with `…` on both sides when mid-string.
  - Empty/whitespace symptom or empty text → `null` (no crash).
- **Acceptance:** correct excerpt or `null` for each case; never throws.

### T1.3 — Compartment validation & occupancy
- **Under test:** `src/lib/cabinet.ts` (validation result) and `src/lib/compartments.ts`
  (`isValidAssignableCompartment`, `isScannerCompartment`, `sizeForCompartment`).
- **Cases:**
  - Non-integer / out-of-range (0, 19, 2.5) → rejected with a clear message.
  - Reserved/scanner slot → rejected.
  - Occupied slot → rejected, message names the occupant.
  - Valid free slot → ok, returns the expected size.
- **Acceptance:** every invalid case is rejected with a human message; valid case returns the right size.

### T1.4 — openFDA field handling (missing data)
- **Under test:** `src/lib/openfda.ts` — `mapProductType`, array-field joining, missing-field tolerance.
- **Cases:**
  - `product_type` containing “PRESCRIPTION” → `"PRESCRIPTION"`; “OTC” → `"OTC"`; unknown/missing → `"UNKNOWN"`.
  - Fields arriving as arrays of strings → joined into one string.
  - Every optional field missing → no throw; returns a well-formed object with nulls.
- **Acceptance:** never crashes on absent data (the PRD explicitly warns openFDA fields are inconsistent).

---

## Tier 2 — remaining pure logic

### T2.1 — Dose-time validation — `src/lib/doseTimes.ts`
- Wrong count vs `dosesPerDay` → error; bad format (`8:00`, `25:00`, `noon`) → error; valid `["08:00","20:00"]` → ok, sorted/unique.

### T2.2 — Date helpers — `src/lib/dates.ts`
- `isDateInInclusiveRange` at both boundaries and outside; `todayLocal`/`dayBoundsLocal` shape. (Watch timezone assumptions.)

### T2.3 — Search result refinement — `src/lib/drugSearchResults.ts`
- OTC sorted before non-OTC; already-in-cabinet items handled per current logic; `purposeOneLine` truncation/empty handling.

### T2.4 — Home dashboard aggregation — `src/lib/homeDashboard.ts`
- `taken` never exceeds `doses`; only active `PRESCRIPTION` in range counted; scheduled doses (symptom = null) counted correctly. (Needs a DB or a mocked Prisma — see Tier 3.)

---

## Tier 3 — API route behavior (integration)

Requires a test database (recommended: a disposable Postgres schema or SQLite test DB) seeded per-test, or a mocked Prisma client.

- `GET /api/symptoms?q=` — 400 on missing `q`; OTC-only matches (re-assert T1.1 end-to-end); `usedBefore` case-insensitive.
- `GET /api/drugs/search?q=` — shape of results; graceful handling when RxNorm/openFDA return nothing (mock the network).
- `GET /api/cabinet/search?q=` — returns cabinet hits with compartment.
- `POST /api/symptoms/take` — writes a `UsageLog`; bad payload → error.
- `POST/PATCH /api/cabinet` + `/api/cabinet/[id]` — add/edit/remove; occupied-slot rejection (re-assert T1.3).

**External APIs must be mocked** (RxNorm, openFDA, Twilio) — never call live services in tests; they’re slow and flaky.

**Acceptance:** each route returns the documented status + shape the UI relies on, with network dependencies mocked.

---

## Tier 4 — golden-path end-to-end (optional, Playwright)

One mobile-viewport (390px) script mirroring `DEMO_SCRIPT.md`:

1. Home → search `Tylenol` (mock or seeded) → detail renders.
2. Cabinet → seeded med visible in its compartment.
3. Symptoms → `headache` → OTC matches with compartment number; **no Rx** present.
4. “I took this” → appears in recent/history.
5. `broken arm` → intentional empty state.

**Acceptance:** the script passes headless on a 390px viewport with seeded data and mocked external APIs.

---

## What is explicitly NOT worth testing now

- Twilio call placement / phone integration (external, backstage for demo).
- Browser notification permissions.
- Calendar month rendering internals.
- Visual/pixel snapshots (brand is still changing — see uplift plan).

These are stretch/hidden features; testing them now spends effort where the demo doesn’t.

---

## Definition of “enough testing” for this prototype

- [ ] Tier 1 written and passing (esp. **T1.1 safety**).
- [ ] `npm run lint` clean and `next build` type-checks.
- [ ] `DEMO_SCRIPT.md` manual checklist rehearsed on a real phone.
- [ ] (Nice to have) Tier 2 units passing.

If Tier 1 + lint + build + a rehearsed manual pass are green, the prototype is in good shape
for the showcase. Deeper coverage is a post-showcase investment.

---

## Suggested first task (when you’re ready to leave docs)

> Set up Vitest (dev dependency + `test` script) and implement **Tier 1 only** from
> `docs/TEST_PLAN.md`, starting with T1.1 (the OTC-only safety invariant). Mock all
> external APIs. Do not change app behavior or the data model. Show the plan and the list
> of test files first, then implement.
