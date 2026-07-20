# Manya — next Cursor session (must-do)

**From:** Dad (product coach)  
**To:** Manya (product lead)  
**Status:** Docs on `main` — **read these first next time you’re in Cursor**  
**Dad is not building the app code** — these briefs are your handoff.

---

## Priority order (do not skip #1)

### 1) Win the competition first — `docs/COMPETITION_WIN_PLAN.md`
**This is the most important doc for showcase week.**

- What to product **on stage** (P0/P1) vs backstage  
- 90-second winning script  
- Prototype polish order (hero → expiry → demo ops)  
- **Beyond the app:** pitch, hardware theater, teacher trust language, team roles, rehearsal checklist  
- Reminder: judges reward a reliable wow, not more pages  

**Winning sentence to memorize:**  
> “I feel something → Pillio finds what I already own from the FDA label → shows the exact compartment → the cabinet lights up.”

**Product the demo as:** medicine cabinet OS (location + freshness).  
**Not as:** doctor / recommender / pharmacy marketplace.

### 2) Then — low-risk market label feature — `docs/OTC_LABEL_SEARCH_SPEC.md`
Super low-risk **public OTC label search** + optional Amazon hop, behind feature flag **default OFF**.

- Teachers can leave it **off** — zero demo risk  
- Implement only after hero path is rehearsal-solid (or in parallel *behind the flag* without putting it on stage)  
- Full UX + implementation details in the spec  
- Build prompt in § below and `PROMPT_PACK.md` #11  

### 3) Do not build for demo
- Google / user authentication — not worth it  
- Symptom → “recommended drugs to buy” without the label-reference framing  
- More Twilio/reminder complexity as the lead story  

---

## What you must do next session

1. `git pull origin main`  
2. Read **`COMPETITION_WIN_PLAN.md`** (win plan + beyond-app)  
3. Read **`OTC_LABEL_SEARCH_SPEC.md`** (flagged feature when you’re ready)  
4. Choose path for this session:  
   - **A (recommended before showcase):** polish P0/P1 hero + expiry using the competition plan prompts  
   - **B:** implement OTC label search behind flag OFF (prompt below)  
5. Update `DEMO_SCRIPT.md` if your on-stage path changed  
6. Rehearse until two clean runs in a row  

---

## Prompt A — polish to win (use this before adding features)

```text
Read and obey:
- docs/COMPETITION_WIN_PLAN.md
- docs/DEMO_SCRIPT.md
- docs/PRODUCT_RULES.md

Task: Polish ONLY the competition P0/P1 path.
- Symptoms → OTC cabinet label match → compartment clarity → flash if present
- Expiry soon/expired clarity
- Trust copy: not medical advice; label match in your cabinet
No new features. Keep OTC market/Amazon flag OFF / unadvertised.
Mobile ~390px.
First: list files + acceptance checks. Wait for OK, then implement.
When done: give me the exact 90s demo taps to rehearse.
```

---

## Prompt B — implement OTC label search (flag default OFF)

```text
Read and obey:
- docs/MANYA_NEXT_SESSION.md
- docs/OTC_LABEL_SEARCH_SPEC.md
- docs/COMPETITION_WIN_PLAN.md
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
- Do not put this on the competition demo path unless teachers approved and flag is intentionally ON

First: list files you will create/change and acceptance checks.
Wait for my OK, then implement.
When done: tell me how to verify with flag OFF and flag ON.
```

---

## Why the market label approach is still recommended (when you have time)

Teachers worried about symptom → medication recommendations. The spec reduces that risk by:

- Searching **official FDA label text** (not inventing advice)  
- Saying clearly: **not medical advice / not a recommendation**  
- Showing **where the data came from** on every result  
- Making Amazon a **secondary external hop**  
- Shipping behind a **feature flag that defaults OFF**  

If a teacher doesn’t like it: **leave the flag off**. Enabling later is one env flip — not a rewrite.

---

## Definition of “ready to compete”

- [ ] P0 hero path works cold twice in a row  
- [ ] Trust language clean (no “recommended for headache”)  
- [ ] Expiry second punch works  
- [ ] Hardware flash or backup line ready  
- [ ] Roles assigned (Narrator / Driver / Hardware / Watcher)  
- [ ] Market label flag OFF for showcase (unless teacher OK in writing)  
- [ ] Team can say the winning sentence without notes  

---

## Related docs

| Doc | Why |
|-----|-----|
| `docs/COMPETITION_WIN_PLAN.md` | **Win playbook** — demo, roadmap, beyond-app |
| `docs/OTC_LABEL_SEARCH_SPEC.md` | Flagged label search UX + implementation |
| `docs/DEMO_SCRIPT.md` | Keep in sync with on-stage path |
| `docs/PRODUCT_RULES.md` | Must: not a doctor; reference not recommendation |
| `docs/PROMPT_PACK.md` | Prompts #11 (labels) + #12 (win polish) |
