# Manya — next Cursor session (must-do)

**From:** Dad (product coach)  
**To:** Manya (product lead)  
**Status:** Docs checked in on `main` — **you implement next time you’re in Cursor**  
**Dad is not building the app code** — this brief + the full spec are your handoff.

---

## What we found

A **super low-risk, high-value** feature:

> **Search public OTC product labels** (openFDA) by a symptom *word*, show **honest source attribution + disclaimers**, and optionally let the user **View on Amazon** (they leave Pillio).  
> This is **label reference search**, not “Pillio recommends a drug.”

Teachers worried about symptom → medication recommendations. This approach **reduces that risk a lot** by:

- Searching **official FDA label text** (not inventing advice)
- Saying clearly: **not medical advice / not a recommendation**
- Showing **where the data came from** on every result
- Making Amazon a **secondary external hop** (Pillio doesn’t sell or ship medicine)
- Shipping behind a **feature flag that defaults OFF**

If a teacher doesn’t like it: **leave the flag off**. Zero demo risk. Enabling later is one env flip after they approve the framing — not a rewrite.

---

## What you must do next session

1. `git pull origin main`
2. Read this file, then **`docs/OTC_LABEL_SEARCH_SPEC.md`** (full UX + implementation)
3. In Cursor, paste the prompt in § “First prompt to paste” below
4. Implement **behind the flag, default OFF**
5. Do **not** add Google/login auth (not worth it for the demo)
6. When done: verify flag OFF hides the feature; flag ON shows `/labels` with sources + Amazon confirm

---

## First prompt to paste into Cursor

```text
Read and obey:
- docs/MANYA_NEXT_SESSION.md
- docs/OTC_LABEL_SEARCH_SPEC.md
- docs/PRODUCT_RULES.md
- docs/TECH_GUARDRAILS.md

Task: Implement the OTC public label search feature exactly as specified in OTC_LABEL_SEARCH_SPEC.md.

Hard requirements:
- Feature flag NEXT_PUBLIC_ENABLE_OTC_MARKET_LABEL_SEARCH defaults to false / unset = OFF
- When OFF: no nav entry, no home shortcut, /labels not advertised (404 or redirect OK)
- When ON: /labels works as reference label search (not recommendations)
- openFDA OTC-only; verbatim excerpts; source + match reason on every card
- Strong not-medical-advice / not-a-recommendation copy
- Amazon = "View on Amazon" secondary button + leave-app confirm; deep-link search only
- No auth / Google login
- No ranking by effectiveness; no "best for" / "recommended" language
- Fail closed if openFDA errors — never invent matches
- Mobile ~390px

First: list files you will create/change and acceptance checks.
Wait for my OK, then implement.
When done: tell me how to verify with flag OFF and flag ON.
```

(Also in `docs/PROMPT_PACK.md` as the must-implement prompt.)

---

## Why this is high value

- Keeps a “symptom word → useful OTC info” story for demos **if teachers allow it**
- Stays honest about sources (openFDA)
- Optional Amazon path without Pillio becoming a pharmacy
- Flag = easy teacher veto without deleting code

---

## Definition of done (your checklist)

- [ ] Spec implemented behind flag (default OFF)
- [ ] `/labels` UX matches the spec (disclaimer, source, match reason, warnings entry, Amazon confirm)
- [ ] OTC-only; no Rx in results
- [ ] Tests or clear manual checks for flag OFF / ON + OTC-only + fail-closed
- [ ] README or `.env.example` documents the flag
- [ ] School demo script can run with flag **OFF** safely

---

## Related docs

| Doc | Why |
|-----|-----|
| `docs/OTC_LABEL_SEARCH_SPEC.md` | Full UX, risk analysis, implementation plan |
| `docs/PRODUCT_RULES.md` | Must: not a doctor; reference not recommendation |
| `docs/CAPABILITIES.md` | Inventory row for this capability |
| `docs/PROMPT_PACK.md` | Copy-paste build prompt |
