# Prompt pack — build toward her vision

Copy/paste these into Cursor.  
Attach docs so the agent raises quality without stealing creative control.

## Global opener (use often)

```text
Read and obey these docs first:
- docs/VISION.md (her decisions win over recommendations)
- docs/DEMO_SCRIPT.md
- docs/PRODUCT_RULES.md (Must / Should / May)
- docs/CAPABILITIES.md
- docs/TECH_GUARDRAILS.md

Rules of engagement:
- Obey Musts.
- Improve Shoulds with good taste.
- For May/creative choices: propose 2 directions with tradeoffs, recommend one, and wait for my pick before implementing UI personality decisions.
- Do not add new product scope unless I explicitly ask.
- Prefer polishing the showcase hero path over new pages.
- If vision details are missing, ask me enhancing questions from the docs instead of inventing a new product identity.
- Show a short plan first (files + acceptance checks), then wait for OK.
```

---

## 1) Vision capture (no code)

```text
Use docs/VISION.md as a coaching worksheet.
Interview me with the most important unanswered questions first (max 8).
For each question:
- why it matters for the product
- a recommended direction based on PRD.md
- space for my decision
Do not write code.
After I answer, update the proposed wording I should paste into VISION.md.
```

---

## 2) Demo script lock (no code)

```text
Using docs/DEMO_SCRIPT.md and the current app routes, draft a 90-second demo script.
Ask me what must be on stage vs backstage.
Recommend a default, but keep my choices.
Call out any honesty risks (features shown in UI but not built).
Do not write code yet.
```

---

## 3) Product audit → polish plan (no code first)

```text
Run a product audit using docs/AUDIT_SCORECARD.md against the running app mindset and docs/DEMO_SCRIPT.md.
Score each item 0–2 with evidence.
Then propose the top 5 polish changes that would raise scores without adding features.
For each change: why, where, acceptance check, and whether it’s Must/Should/May.
Wait for me to pick which ones to do.
```

---

## 4) Creative explore (keeps her in charge)

```text
I want creative improvement, not restriction.
Target: [home / cabinet / symptoms / detail].
Obey docs Musts.
Propose 2 distinct experience directions that still support the hero demo moment.
For each: feeling words, what changes on screen, risks, and why it fits VISION.md.
Recommend one. Do not implement until I choose.
```

---

## 5) Implement a chosen polish (code OK)

```text
Implement only this approved polish:
[paste the chosen item]

Constraints:
- No new routes/features
- Obey PRODUCT_RULES Musts
- Keep high-school-readable code
- Mobile ~390px
- Tell me how to verify with DEMO_SCRIPT inputs

If you discover a vision decision is missing, ask me instead of guessing brand/tone/scope.
```

---

## 6) Hero moment upgrade (symptoms → compartment)

```text
Improve the symptom → cabinet match experience so the wow is unmistakable.
Obey safety Musts (OTC-only, not medical advice).
Ask me 3 enhancing questions about how dramatic vs calm the compartment emphasis should feel.
Then propose 2 UI approaches and wait for my choice before coding.
```

---

## 7) Honesty / scope cleanup

```text
Audit the UI for claims that outpace capabilities (especially Scanner/hardware, reminders, naming drift Pillio vs MedCabinet).
Recommend the gentlest fixes that preserve teammate work (hide, relabel, coming soon) rather than deleting useful stretch code.
Ask me what we still want to proudly show.
Then implement only what I approve.
```

---

## 8) Capabilities refresh

```text
Update docs/CAPABILITIES.md statuses from the codebase and README/PRD.
Mark Hero/Core/Optional/Hide/Future.
Ask me enhancing questions where Showcase role is ambiguous.
Do not change application code.
```

---

## 9) Tech audit (CTO mode, coaching)

```text
Run docs/AUDIT_SCORECARD.md technology section.
Be a coach, not a fear-monger.
For each yellow/red: explain risk in plain language, ask what demo day looks like, and recommend a practical student-team fix.
No big rewrites unless I ask.
```

---

## 10) “I’m stuck / details missing” coach

```text
I’m not sure about [topic].
Using VISION.md coaching questions and PRODUCT_RULES decision helper, help me think.
Give:
1) clarifying questions
2) 2 viable directions
3) a recommendation for an M&TSI showcase prototype
4) what to postpone
I will decide. Do not code yet.
```

---

## 12) MUST DO FOR COMPETITION — polish P0/P1 win path (no new features)

Use with `docs/COMPETITION_WIN_PLAN.md`. Prefer this before building net-new features near showcase.

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

## 11) MUST IMPLEMENT (after hero solid, or behind flag) — OTC label search (flag default OFF)

Use after `git pull`. Full brief: `docs/MANYA_NEXT_SESSION.md` + `docs/OTC_LABEL_SEARCH_SPEC.md`.

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

---

## Tips for her (so creativity doesn’t disappear)

- Use explore prompts (#4, #6) before implement prompts (#5).
- If an agent sounds bossy about taste, remind it: “May = my choice.”
- If an agent invents features, stop it with: “Park that in CAPABILITIES idea parking lot.”
- Save great answers back into `VISION.md` so the next prompt gets smarter.

## Tips for mentors/parents

- Help her fill vision questions; don’t fill them for her.
- Veto unsafe claims and demo dishonesty, not aesthetic experiments.
- Praise decisions, not just features shipped.
