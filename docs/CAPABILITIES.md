# Capabilities inventory

Track what the product can do, what the showcase needs, and what to evolve next.  
Update statuses after each build session. This file should stay honest.

## Status key

| Status | Meaning |
|--------|---------|
| Demo-ready | Rehearsed; proud to show |
| Works | Functions, needs polish |
| Partial | Some pieces exist |
| Not built | Don’t claim it |
| Stretch | Cool, optional for showcase |
| Hide | Exists but keep off-stage for now |
| Out | Explicitly out of scope |

## Showcase role key

| Role | Meaning |
|------|---------|
| Hero | Center of the wow |
| Core | Needed for the story |
| Support | Helpful, not central |
| Future | Roadmap |
| Optional | Nice if rehearsed |

---

## Inventory (starter from current repo + PRD)

Fill **Owner**, **Her note**, and adjust Showcase role as the team decides.

| Capability | Evidence (approx.) | Status | Showcase role | Owner | Her note / next evolution |
|------------|--------------------|--------|---------------|-------|---------------------------|
| Drug search (RxNorm → openFDA) | `/api/drugs/search`, `DrugSearch` | Works | Core | | |
| Drug detail + OTC/Rx badge | `/drugs/[slug]` | Works | Core | | |
| Add / edit / remove cabinet meds | cabinet APIs + forms | Works | Core | | |
| Cabinet grid (modules / compartments) | `/cabinet` | Works | Core | | |
| Jump search in cabinet | `CabinetJumpSearch` | Works | Support | | |
| Out-of-cabinet marking | `outOfCabinet` | Works | Support / Optional | | |
| Symptom → OTC cabinet match | `/symptoms`, `/api/symptoms` | Works → aim Demo-ready | **Hero** | | |
| Take this + usage history | take + history APIs | Works | Hero | | |
| Seeded demo cabinet | `prisma/seed.ts` | Works | Core | | |
| Prescription schedules | prescriptions + forms | Stretch | Optional | | |
| Calendar dose checkoff | `/calendar` | Stretch | Optional | | |
| Due-dose banner | `DueDosesBanner` | Stretch / Hide | Optional / Hide | | Hidden from layout for demo freeze |
| Browser dose notifications | settings toggle | Stretch | Hide unless stable | | |
| Phone call reminders (Twilio) | settings + dispatch | Stretch | Hide unless rehearsed | | |
| Settings screen | `/settings` | Stretch | Support / Hide | | |
| Home dashboard cards | home feature cards | Partial product risk | Support | | Decide doorway |
| Scanner CTA in UI | home card copy | Partial / Not built | Future or Hide | | Honesty check |
| Hardware `POST /api/scan` | PRD §6 | Not built | Future | | |
| Scan pending review flow | schema has `pending_review` | Not built | Future | | |
| Auth / multi-user | — | Out | Out | | Not worth it for demo |
| Push notifications | — | Out | Out | | |
| Rx recommendations for symptoms | — | Out (safety) | Out | | |
| Public OTC label search + Amazon hop | Spec: `OTC_LABEL_SEARCH_SPEC.md` | **Not built** | Future / flag-gated | Manya | Implement behind flag OFF after hero solid; **not on stage** unless teachers OK |
| Competition win path (cabinet + symptoms + flash + expiry) | `COMPETITION_WIN_PLAN.md` | Works → polish | **Hero / on-stage** | Manya + team | **Priority before new features** — rehearse 90s script |

---

## Coaching: how to evolve capabilities without chaos

When you want something new, answer:

1. Does this make the **Hero** clearer?
2. Is it a new capability, or craft on an existing one?
3. Can we demo it reliably twice?
4. What do we de-emphasize to make room?

### Recommendation
Default evolution order:
1. Hero craft (symptoms + compartment moment)
2. Core clarity (search, detail, cabinet)
3. Honesty fixes (scanner claims, naming)
4. Optional stretch polish
5. Net-new capabilities only after 1–4 feel good

You may reorder if your vision says reminders *are* the product — but decide that in `VISION.md` first.

---

## Showcase freeze snapshot

Before a practice or showcase, copy a freeze here:

**Date:** 2026-07-19  
**On stage:** Home search, Cabinet, Symptoms, Settings; Scanner card left as partner WIP / known dead-end  
**Backstage:** Calendar (URL only), due-dose banner, browser notifications, Twilio call reminders  
**Known inputs:** `Tylenol`, `Advil`, `headache`, `broken arm`  
**Forbidden claims:** medical advice; Rx meds in symptom results; Scanner as finished hardware ingest  

---

## Idea parking lot (creativity welcome)

Park ideas here so they don’t get lost — and don’t sneak into the build without a decision.

| Idea | Why it’s exciting | Risk | Decision (Now / After showcase / Never) |
|------|-------------------|------|-----------------------------------------|
| Public OTC **label** search + Amazon hop (flagged) | High value; teacher-safe if flag OFF | Lower if reference-not-recommendation (see `OTC_LABEL_SEARCH_SPEC.md`) | **Now — Manya next session** (flag default OFF) |
| Symptom → “meds that help” → in-app recommend/order | Feels magical | High — medical recommendation | Never for showcase |
| Google / user auth | Multi-user polish | Overkill for demo | Never for this demo |

### Prompts to fill the parking lot
- What would make the cabinet feel alive on screen?
- What’s an empty state only our team would write?
- What happens after someone taps Take this — emotionally, not only technically?
- How should Pillio greet someone who opens it at 1 a.m.?
