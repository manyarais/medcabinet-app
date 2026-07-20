# Competition win plan — for Manya

**From:** Dad (product coach)  
**To:** Manya (product lead) + team  
**Purpose:** What to build, what to demo, and what to do *beyond the app* to win.  
**Status:** Roadmap + playbook checked into `main`. Dad is not building the code — you and the team execute.

> **Reminder:** Judges reward a clear story, a reliable wow, and craft — not the longest feature list.  
> Pillio’s unfair advantage is **phone ↔ physical cabinet**. Win with that.

Also read: `docs/MANYA_NEXT_SESSION.md` (feature handoffs) and `docs/DEMO_SCRIPT.md` (update to match this plan).

---

## 0. The winning sentence (memorize this)

> “I feel something → Pillio finds what I already own from the FDA label → shows the exact compartment → the cabinet lights up.”

If that path is flawless on a phone in **90 seconds**, you can beat teams with more features.

**Product the demo as:** *Medicine cabinet OS* — location + freshness for what you own.  
**Do not product the demo as:** AI doctor / drug recommender / pharmacy marketplace.

---

## 1. What to product ON STAGE (demo set)

### P0 — must be perfect (the win)
| Feature | Why judges care | Demo beat |
|---------|-----------------|-----------|
| Cabinet grid + huge compartment # | Unique, visual, memorable | “Here’s where it lives” |
| Symptom → *your* OTC labels → location | Core story, teacher-safe if framed right | Hero moment |
| Hardware flash / LED (or honest backup) | The “whoa” | Light the bay |
| Trust line | Teachers + credibility | “Label match in *your* cabinet — not medical advice” |

### P1 — second punch (high value, safer than recommend)
| Feature | Why | Demo beat |
|---------|-----|-----------|
| Expiry soon / expired | Real household pain | “And it warns before meds you use go bad” |
| Seeded demo + reset | Separates pros from flaky demos | Cold start confidence |

### P2 — optional only if rehearsed cold twice
| Feature | Rule |
|---------|------|
| Scan → pending → assign bay | Cut if it fails once in rehearsal |
| Printable report | 20s closer max — never the opener |

### P3 — backstage (do not lead)
- Twilio call reminders  
- Full calendar complexity as the story  
- Public OTC market / Amazon labels (`OTC_LABEL_SEARCH_SPEC.md`) — **flag OFF** unless teachers explicitly approve  
- Auth / Google login — not worth it for demo  

---

## 2. Prototype work before demo day (implementation roadmap)

Do these in order. Stop adding random pages until P0 is boringly reliable.

### Sprint A — Hero reliability (do first)
- [ ] Cold start → seed / demo reset → known inputs always work  
- [ ] Inputs locked: `Tylenol`, `headache`, `broken arm` (empty state)  
- [ ] Symptom framing copy: label match / not medical advice / OTC-only  
- [ ] Compartment number is the visual hero on results + cabinet  
- [ ] Flash compartment works *or* backup line rehearsed  

**Cursor prompt (polish hero):**
```text
Read docs/COMPETITION_WIN_PLAN.md, docs/DEMO_SCRIPT.md, docs/PRODUCT_RULES.md.
Polish ONLY the P0 hero path: symptoms → OTC cabinet match → compartment clarity → flash if present.
No new features. Flag market labels stay off. Mobile 390px.
Plan files + acceptance checks first; wait for OK.
```

### Sprint B — Expiry punch
- [ ] Expiry badges clear on cabinet  
- [ ] `/expiry` (or home card) shows soon/expired in one glance  
- [ ] Pitch line ready: freshness for meds you actually keep  

### Sprint C — Demo ops (beyond code)
- [ ] One “demo director” owns the script  
- [ ] Nav mentally trimmed: Home → Cabinet → Symptoms → Expiry (ignore the rest on stage)  
- [ ] Hardware checklist (below)  
- [ ] Two clean full rehearsals in a row  

### Sprint D — Flagged upside (only after A–C)
- [ ] Implement `docs/OTC_LABEL_SEARCH_SPEC.md` behind flag **OFF**  
- [ ] Teacher review optional; showcase stays OFF unless approved  

---

## 3. The 90-second winning demo script

| Time | What you do | What you say |
|------|-------------|--------------|
| 0:00–0:10 | Show home / brand | “Pillio is the companion for our smart medicine cabinet — it knows what’s in each bay.” |
| 0:10–0:25 | Search `Tylenol` | “Here’s a med we already own — and which compartment it’s in.” |
| 0:25–0:65 | Symptoms → `headache` → big # → flash LED | “We’re not recommending treatment — we match FDA label text of what you already own, and show where it is.” |
| 0:65–0:80 | Expiry | “It also warns before the meds you keep go bad.” |
| 0:80–0:90 | Close on hardware+software | “Find it. See it light up. Keep the cabinet trustworthy.” |

**Optional +20s** (only if perfect): scan assign **or** report PDF.

**Empty-state proof (10s if asked):** `broken arm` → intentional empty — proves you’re not faking matches.

---

## 4. Beyond the app — what wins competitions

Judges score the **whole team moment**, not just commits.

### A. Story & pitch
- [ ] One sentence ICP: who stands at the cabinet?  
- [ ] One job: location + freshness for what you own  
- [ ] Proudly refuse: “We’re not a doctor app”  
- [ ] Name consistency: **Pillio** only in speech and UI  

### B. Hardware theater
- [ ] LED/flash works on cue **or** calm backup: “Here’s the bay on screen — on the physical unit the strip lights the same number.”  
- [ ] Pre-demo: power, network, camera/scan path checked 30 min before  
- [ ] Assign roles: Narrator / Phone driver / Hardware / Watcher  

### C. Trust & teachers
- [ ] Never say “recommended for your headache”  
- [ ] Say “label match / your cabinet / not medical advice”  
- [ ] Market/Amazon feature **OFF** unless written teacher OK  
- [ ] OTC-only rule verified with a seeded Rx (must not appear)  

### D. Rehearsal discipline
- [ ] Two clean runs back-to-back  
- [ ] API-down line ready: “While lookup thinks, here’s the seeded cabinet — daily use is about what you already own.”  
- [ ] Timebox to 90s; cut P2 if anything wobbles  

### E. Team presence
- [ ] Everyone can explain the hero in one sentence  
- [ ] One person answers Q&A; others don’t contradict live  
- [ ] Know your “what’s next” (expiry intelligence, restock-same-product) without promising illegal claims  

---

## 5. Feature priority table (build vs demo)

| Priority | Feature | Build now? | On stage? |
|----------|---------|------------|-----------|
| P0 | Cabinet + compartment clarity | Yes — polish | Yes |
| P0 | Symptom → cabinet OTC labels → location | Yes — polish | Yes — hero |
| P0 | Flash / LED story | Yes — make reliable | Yes |
| P1 | Expiry soon/expired | Yes — polish | Yes — second punch |
| P1 | Demo seed/reset reliability | Yes | Invisible but critical |
| P2 | Scan ingest | Only if stable | Optional |
| P2 | Report PDF | Light polish OK | Optional closer |
| P3 | Calendar / Twilio | Freeze | No |
| P3 | Public label market + Amazon | Implement flagged OFF | No unless teacher OK |
| Out | Auth / Google login | No | No |
| Out | Symptom → “buy these drugs” as recommendations | No | No |

---

## 6. Competition-day checklist

### Morning of
- [ ] Phone charged, brightness up, 390px comfortable  
- [ ] `git pull` / deploy / local seed verified  
- [ ] Demo reset works  
- [ ] Market label flag **OFF**  
- [ ] Hardware powered; flash tested  
- [ ] Backup lines memorized  

### Roles
| Role | Person | Job |
|------|--------|-----|
| Narrator | | Speaks the story |
| Driver | | Taps only the script paths |
| Hardware | | LED / scan / recovery |
| Watcher | | Time + failure recovery |

### Forbidden on stage
- Wandering through Settings / Twilio  
- Claiming Scanner if it isn’t working  
- Medical advice language  
- Apologizing for 30 seconds — recover in one sentence and move  

---

## 7. If something breaks live

| Failure | Recovery line |
|---------|----------------|
| openFDA slow | “Daily use is your cabinet — here’s the seeded bay map.” |
| LED fails | “On screen bay N — same index the strip would light.” |
| Wrong tap | Driver returns to Home; Narrator continues without panic |
| Symptom empty unexpectedly | Try `headache`; show empty with `broken arm` as intentional |

---

## 8. After you win the rehearsal (stretch roadmap)

Only after two clean rehearsals:

1. Teacher-safe public label search (`OTC_LABEL_SEARCH_SPEC.md`) behind flag  
2. Restock-**same**-product deep links for expired items you already own  
3. Usage-based “you use this often and it’s expiring” ranking for *expiry*, not treatment  

Still never: diagnose, recommend Rx, auto-ship drugs for a symptom.

---

## 9. Reminder to Manya

1. **Pull `main`.**  
2. Read this file + `MANYA_NEXT_SESSION.md`.  
3. **Win path first:** polish P0 + P1 + rehearse — before new features.  
4. Implement OTC market labels **only** behind flag OFF (spec already written).  
5. Product the demo as **cabinet OS**, not doctor app.  
6. Beyond app: pitch, hardware, roles, two clean rehearsals.

You’ve already built more than enough surface. **Winners focus and rehearse.** Make one moment inevitable — compartment light-up after a safe label match — then prove usefulness with expiry.
