# Vision (draft from PRD — complete in your voice)

> Status: **Draft starter** from `PRD.md` + current app naming (“Pillio”).  
> This is not locked. Rewrite any section that doesn’t feel like your product.

## 1. One-sentence product

**Starter (from PRD):**  
Pillio is the companion app for a smart medicine cabinet — it helps you find medications (via live FDA labels), know which physical compartment they live in, and quickly match a symptom to OTC medicine you already own.

**Your version (fill in):**  
> ________________________________________________________________ _

### Coaching questions
- If a judge remembers only one sentence, what do you want it to be?
- Is this more “find what’s in my cabinet,” “feel better faster,” “never lose a bottle,” or something else?
- Does “smart medicine cabinet companion” feel exciting to you, or too hardware-first?

### Recommendation (optional — accept/change/reject)
Lead with the **human job** first, hardware second.  
Example direction: “Know what you have, where it is, and what might help — from your own cabinet.”  
You decide the exact wording.

---

## 2. Official name

**Observed in repo today:**
- UI / metadata: **Pillio**
- PRD / package naming: **MedCabinet**

**Decision needed:** pick one public name for the demo.

- [ ] Pillio
- [ ] MedCabinet
- [ ] Other: __________

### Coaching questions
- Which name feels like *your* product?
- Say both out loud in a pitch — which one are you prouder to say?
- Do you want the name to sound soft/friendly (Pillio) or descriptive/functional (MedCabinet)?

### Recommendation
Use **one name everywhere** before showcase (UI, README intro, pitch). Renaming is a product decision, not a coding flex. Consistency reads as “real product.”

---

## 3. Who is this for?

**Starter from PRD:** single user; mobile-first; demoed on a phone. No accounts.

**Your primary user (fill in):**  
> Who is standing at the cabinet? ______________________________  
> What just happened before they open the app? _________________  
> How stressed / rushed / careful are they? ____________________

### Coaching questions
- Family kitchen at night? Dorm room? Parent helping a teen? Caregiver?
- Are they trying to avoid taking the wrong thing, or just find the right bottle faster?
- Do they trust the cabinet hardware, or do they need the phone to feel in control?

### Recommendation
Choose **one primary demo persona** even if real life has many. Products feel sharper with one clear “hero user,” then expand later.

---

## 4. The job to be done

**Starter jobs from PRD (ranked for a strong demo):**
1. “I feel ___ — what OTC in *my* cabinet might match the label?”
2. “Where is that bottle right now?” (compartment)
3. “What is this medicine, according to the FDA label?”
4. Later: scan a new bottle in; remind me about prescriptions

**Your ranked jobs (1 = most important for showcase):**  
1. ________________________________  
2. ________________________________  
3. ________________________________

### Coaching questions
- If you could only perfect one job before Thursday/demo day, which one?
- Is search the doorway, or is symptom→compartment the doorway?
- Are reminders part of your pride story, or a bonus?

### Recommendation
Make **symptom → cabinet match → compartment** the emotional center. Search and cabinet management support that story. Reminders/calendar can be proud stretch — not the opening act — unless *you* decide otherwise.

---

## 5. The wow moment

**Starter wow from PRD Phase 3:**  
User types a symptom → sees OTC meds already in the cabinet → big compartment number (and in the live demo, the physical LED would light).

**Your wow (fill in):**  
> In the demo, people should lean forward when: _________________

### Coaching questions
- Is the wow “the app understood my symptom,” “it knew what I own,” “it pointed to a physical place,” or “phone + cabinet together”?
- What should be huge on screen in that second — med name, compartment, excerpt from label, or something else?
- What would make a classmate say “whoa” without needing a long explanation?

### Recommendation
Design the UI so the **compartment number** and **med you already own** are impossible to miss. That’s a rare physical+software story most student apps don’t have. Use it.

---

## 6. Product feeling (tone)

PRD asks for clean, readable, mobile-first — but not a full brand feeling.

**Pick words that fit your vision** (circle/add):
- Calm / Clinical / Friendly / Smart / Soft / Bold / Homey / Futuristic / Minimal / Playful  
- Other: __________

**We want people to feel:** ______________________________  
**We do *not* want people to feel:** _______________________

### Coaching questions
- If this were a place, would it be a quiet bathroom shelf, a bright clinic, or a friendly kitchen?
- Should copy sound like a careful nurse, a helpful sibling, or a smart gadget?
- Does “Take this” feel right, or too pushy for medicine?

### Recommendation
Aim **calm + clear + trustworthy**. Medicine UI that feels like a party app loses trust; medicine UI that feels like a hospital can feel cold. Your call on the exact vibe — just pick one and stay consistent.

---

## 7. Principles you believe (starter set)

Rewrite these until they sound like you:

1. We help people use **what they already have**, not shop randomly.
2. We show **FDA label facts** and cabinet context — we don’t play doctor.
3. The cabinet is physical — **location matters** as much as information.
4. The demo should feel magical **and** honest about what isn’t built yet.
5. Simple beats clever when someone doesn’t feel well.

**Add your own principles:**  
6. ________________________________  
7. ________________________________

---

## 8. What we are proudly not

From PRD out-of-scope (keep unless you consciously change the PRD):
- Accounts / multi-user
- Push notifications as a core bet
- Recommending prescription meds for symptoms
- Pharmacy integration
- Face scanning
- Medical advice language

**Anything else you want to proudly refuse?**  
> ________________________________

### Coaching questions
- Saying “no” is part of vision. What feature request will you smile and decline?
- Is phone-call reminding core to *your* story, or a cool experiment to keep backstage?

### Recommendation
Protect the “not a doctor” line fiercely. It’s both ethics and product clarity. Stretch tech (calls, advanced reminders) can exist without being the identity of Pillio.

---

## 9. Success for this program prototype

**Starter:** a working companion-app demo that proves the cabinet concept end-to-end on a phone.

**Your success definition:**  
> Judges/instructors should walk away believing: _________________

### Coaching questions
- Is success “it works,” “it feels real,” “hardware+software story,” or “we shipped more features than other teams”?
- What would make *you* proud even if a stretch feature fails?

### Recommendation
Define success as: **one unforgettable, reliable hero journey** + honest roadmap. Feature count rarely wins student showcases; clarity and craft do.

---

## 10. Open decisions log

Use this table whenever you’re unsure. Recommendations are starters — you choose.

| Topic | PRD / current default | Recommendation | Her decision | Date |
|-------|------------------------|----------------|--------------|------|
| Public name | Pillio in UI, MedCabinet in PRD | Pick one; prefer Pillio if brand mark exists | Pillio for user-facing | 2026-07-19 |
| Hero journey | Symptom → compartment | Keep as centerpiece | Keep | 2026-07-19 |
| Home page job | Search hub + dashboard cards | Evolve toward brand + primary action; keep her personality | Defer UI redesign | 2026-07-19 |
| Scanner in UI | Mentioned before `/api/scan` exists | Be honest: hide or “coming soon” until real | Keep card; partner-owned dead-end for now | 2026-07-19 |
| Reminders/Twilio | Stretch / present in code | Optional pride feature; don’t let it steal the hero story | Settings stays in nav; due-dose banner backstage | 2026-07-19 |
| Feeling/tone | Not specified | Calm, clear, trustworthy | Defer visual identity | 2026-07-19 |

---

## How to evolve this doc

When something feels unclear, don’t wait for perfect answers:

1. Write a messy draft in the “Your version” lines.
2. Ask the team which sentence feels most true.
3. Update this file.
4. Only then ask Cursor to build toward it.

Vision gets better by **deciding in public**, not by guessing in code.
