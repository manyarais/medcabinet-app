# Tech guardrails (CTO coach notes)

These are **enabling constraints**: they keep the prototype demo-safe and maintainable for a 16–17yo team, while leaving room to invent product experience.

They are not an enterprise architecture manual.

## Spirit

- Prefer reliable demo craft over impressive plumbing.
- Prefer readable code over clever code (also in `PRD.md`).
- Prefer asking a human over silent scope expansion.
- Stretch experiments are allowed — they just shouldn’t endanger the hero path.

---

## Must (tech)

### T-Must 1. Don’t break the seeded golden path
Changes should keep `DEMO_SCRIPT.md` inputs working.

### T-Must 2. Don’t commit secrets or local DB files
No `.env`, tokens, or database files in git.

### T-Must 3. Preserve safety invariants in code
Symptom matching stays OTC-only unless the human explicitly changes the PRD safety model (they shouldn’t for this program).

### T-Must 4. No silent product-scope expansion
Auth, multi-user, shopping, diagnosis engines, new cloud vendors “while we’re here” → ask first.

### T-Must 5. Match the project’s actual runtime story
If docs and schema disagree (example historically: SQLite README vs Postgres schema), **ask / fix docs** — don’t guess a migration during a polish task.

---

## Should (tech quality)

### T-Should 1. Keep high-school-readable code
Descriptive names, short file-top comments for non-obvious files, avoid clever one-liners.

### T-Should 2. Loading / empty / error for network calls
Especially openFDA / RxNorm paths.

### T-Should 3. Small diffs for polish work
Edit existing components before inventing new abstractions.

### T-Should 4. README stays usable
Setup steps should remain true for teammates.

### T-Should 5. Demo hosting plan is conscious
Local demo vs deployed demo may need different database realities. Decide before showcase week.

---

## May (tech creativity)

Allowed and encouraged when it serves the vision:
- UI structure experiments inside existing routes
- Better empty/error components
- Motion / interaction polish
- Compartment visualization improvements
- Copy systems / shared UI patterns if they reduce confusion
- Feature flags / simple hide-for-demo patterns for stretch areas

Ask first if it involves:
- New paid APIs
- New infrastructure services
- Database redesign
- Framework migration
- Background workers beyond what already exists

---

## Decision coach when tech details are missing

| Situation | Ask her / the team | Recommendation if unsure |
|-----------|--------------------|--------------------------|
| “Should we add a new library?” | Does current code fail without it? | Prefer no; use existing stack |
| “Should we build scan now?” | Is Phase 1–3 hero polished? | Polish hero first unless demo depends on scan |
| “Should Twilio be on stage?” | Two clean rehearsals? | Keep backstage until yes |
| “SQLite or Postgres?” | What will we actually run on demo day? | Pick one story; align `.env` + docs + schema |
| “Refactor for cleanliness?” | Does it reduce demo risk this week? | Only tiny refactors beside a user-visible win |
| “Add tests?” | Do we have time after hero polish? | A short manual checklist often wins pre-showcase |

---

## Pre-demo tech checklist (fill before showcase)

- [ ] Fresh setup works from README (`install` → db setup → `dev`)
- [ ] Seeded cabinet visible
- [ ] `Tylenol` / `headache` / `broken arm` verified on a real phone
- [ ] Rx does not appear in symptom results
- [ ] Team knows API-down backup lines
- [ ] Stretch features either rehearsed or hidden
- [ ] No secrets on shared laptops/screens

---

## Enhancing questions for the student CTO/tech lead

1. What’s the #1 way tomorrow’s demo could fail?
2. Which teammate can recover each failure calmly?
3. What complexity are we carrying that isn’t in the pitch?
4. If we deleted one stretch system, would the product story get clearer?
5. What do we wish we understood better before adding anything new?

Write answers here during tech audit:

> Top demo risk: ____________________________________________  
> Recovery plan: ____________________________________________  
> Complexity to freeze: _____________________________________  
