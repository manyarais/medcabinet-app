# Demo script (draft — make it yours)

> **Competition playbook:** see `docs/COMPETITION_WIN_PLAN.md` for the winning on-stage set,
> beyond-app checklist, and what to keep backstage. Keep this script aligned with that plan.
>
> Goal: a ~90 second story that always works.  
> Polish the path below before inventing new paths.  
> Creative presentation is encouraged; unreliable tangents are not.

## Showcase promise (starter)

“We built Pillio — a phone companion for our smart medicine cabinet. It knows what’s in each compartment and can match a symptom to OTC medicine you already own.”

**Your pitch opening (fill in):**  
> ____________________________________________________________

### Coaching questions
- Can you say the opening without reading?
- Does the first sentence mention the cabinet, the phone, or the feeling of being unwell?
- What props do you need (phone + cabinet + LED story)?

---

## Golden path (default from PRD Phases 1–3)

Rehearse this until it’s boringly reliable:

| Step | Action | Expected result | Backup if it fails |
|-----:|--------|-----------------|--------------------|
| 1 | Open home on phone | Brand + clear way to start | Soft refresh / known URL |
| 2 | Search `Tylenol` | Results with OTC context | Use seeded cabinet detail URL |
| 3 | Open detail | Label fields readable; in-cabinet state if seeded | Skip to cabinet |
| 4 | Open **Cabinet** | Modules/compartments visible; Tylenol in a slot | Point at seed compartment #1 |
| 5 | Open **Symptoms**, type `headache` | OTC matches from cabinet; **compartment # large** | Try `Advil` / `fever` if needed |
| 6 | Tap **I took this** | Confirmation + appears in recent/history | Explain log intent; don’t panic |
| 7 | (Optional) Show empty state with `broken arm` | Intentional empty message | Proves you’re not faking matches |

### Known-good demo inputs
- Search: `Tylenol`, `Advil`, misspelling `Tylenl` (shows normalization if live APIs work)
- Symptoms: `headache` (match), `broken arm` (empty)
- Safety check: prescription meds (e.g. Amoxicillin) must **not** appear in symptom matches

---

## What is on stage vs backstage

### On stage (default recommendation)
- Search / detail
- Cabinet grid + compartment story
- Symptoms + I took this
- Hardware story told honestly (“when the Pi scans / LED lights…”)

### Backstage unless rehearsed cold
- Calendar / dose checkoff
- Settings
- Browser notifications
- Twilio phone-call reminders
- Home “Scanner” entry if `/api/scan` is not actually working

### Coaching questions
- Which stretch feature are you personally proudest of?
- Can you demo it in under 20 seconds with zero excuses?
- If it fails once in rehearsal, does it stay on stage?

### Recommendation
Only promote a stretch feature to “on stage” after **two clean rehearsals in a row**. Pride is good; flaky live demos hurt great products.

---

## Honesty rules for the pitch

These protect trust without limiting creativity:

1. Don’t claim bottle scanning as live if `POST /api/scan` isn’t working in *your* build.
2. Do paint the future: “Here’s how the cabinet will send a scan into review…”
3. Don’t imply the app diagnoses conditions.
4. Do say: label match + your cabinet + your log.

**Your honest one-liner about hardware status:**  
> ____________________________________________________________

---

## Creative freedom inside the demo

You can invent:
- How you tell the story
- What you emphasize on each screen
- Gestures, pauses, humor (careful with medicine humor)
- A short “why we built this” personal line

You should not invent:
- Fake capabilities
- Medical promises
- Last-minute untested flows as the opener

---

## Team roles during demo (fill in)

| Role | Person | Responsibility |
|------|--------|----------------|
| Narrator | | Speaks the story |
| Driver | | Taps the phone |
| Hardware | | Cabinet / LED / backup plan |
| Watcher | | Eyes on failure recovery |

### Coaching questions
- Who freezes if something breaks — and who jumps to backup?
- What’s the calm sentence when an API is slow?

**Suggested calm line:**  
“While FDA lookup thinks, here’s the cabinet we already seeded — this is the part that matters for daily use.”

---

## After-demo evolution prompts

If judges love the symptom moment, evolve:
- clearer excerpts, better empty states, stronger compartment visualization, LED sync story

If judges love reminders, evolve:
- calendar clarity — without letting calls become the whole product unless you choose that

If judges are confused, evolve:
- opening sentence + home first screen — not five new features

**Write what you heard after each practice:**  
> Feedback: ________________________________________________  
> We will change: __________________________________________  
> We will not change: ______________________________________
