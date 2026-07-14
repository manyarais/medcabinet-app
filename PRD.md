# MedCabinet App — Prototype PRD

**Goal:** A working demo of the smart medicine cabinet companion app by Thursday. This PRD covers the software prototype only. Build features in the order listed; each phase must work end-to-end before starting the next.

## 1. Overview

MedCabinet is a smart medicine cabinet that scans and identifies medications, tracks which physical compartment each one lives in, reminds users when prescriptions are due, and helps users find the right OTC medication for a symptom. This prototype is the companion web app. The physical cabinet (Raspberry Pi + camera + LED compartments) integrates through a single API endpoint defined in Section 6.

**Prototype constraints:**

- Single user. No authentication, no accounts.
- Mobile-first responsive web app (it will be demoed on a phone).
- All medication data comes live from the openFDA API — do not build or seed a local drug database.
- Persist only medications the user adds to their cabinet.

## 2. Tech Stack

- **Framework:** Next.js (App Router, TypeScript, Tailwind) — already scaffolded in this repo
- **Persistence:** SQLite via Prisma (single local file). Keep the schema minimal.
- **External APIs** (all free, no keys needed):
  - **openFDA drug label endpoint** (`https://api.fda.gov/drug/label.json`) — primary source for label data (indications, warnings, dosage, OTC/Rx type).
  - **NIH RxNorm** (`https://rxnav.nlm.nih.gov/REST/`) — use for name normalization: resolve whatever the scanner or user typed (brand name, misspelling, generic) to a canonical drug name + RxCUI via the approximate-match endpoint, then query openFDA with the normalized name. This makes search and scanning far more forgiving.
  - **NIH DailyMed** (`https://dailymed.nlm.nih.gov/dailymed/services/`) — fallback for label data when a medication is missing from openFDA.
- **Lookup flow:** user/scanner input → RxNorm normalize → openFDA label → DailyMed fallback if openFDA returns nothing.
- **Deployment target:** Vercel. Note: Vercel's filesystem is ephemeral, so for the deployed demo use Vercel Postgres OR fall back to running locally with `npm run dev` — decide at deploy time, keep the data layer swappable behind Prisma.

## 3. Data Model

### Medication (in cabinet)

- `id` (autoincrement)
- `brandName` (string)
- `genericName` (string, nullable)
- `productType` (string: `"OTC"` | `"PRESCRIPTION"`, derived from openFDA `openfda.product_type`)
- `indications` (text — raw `indications_and_usage` from openFDA, used for symptom matching)
- `purpose` (text, nullable)
- `warnings` (text, nullable)
- `dosage` (text, nullable)
- `expirationDate` (string, nullable — user-entered, labels rarely include it)
- `compartment` (int, nullable — which physical compartment it lives in, 1–12; null while pending)
- `status` (string: `"active"` | `"pending_review"` — scanned medications start as `pending_review` until the user confirms/corrects them)
- `addedAt` (datetime)
- `rawLabelText` (text, nullable — full OCR text from hardware scan, for debugging/reprocessing)

### UsageLog

- `id`
- `medicationId` (FK → Medication)
- `symptom` (string — what the user searched when they took it, nullable)
- `takenAt` (datetime)

### Prescription (stretch goal only — Phase 5)

- `id`, `medicationId` (FK), `dosesPerDay` (int), `pillsPerDose` (int), `startDate`, `endDate`

## 4. Features (build in this order)

### Phase 1 — Medication search & detail

1. API route `GET /api/drugs/search?q=` — queries openFDA after RxNorm normalization. Returns: brand name, generic name, product type, purpose, indications_and_usage, warnings, dosage_and_administration. Important: openFDA fields are inconsistent — every field can be missing. Handle missing fields gracefully; never crash on absent data. Fields arrive as arrays of strings; join them.
2. Search page (home page): search box, results list showing brand name, generic name, and an OTC/Rx badge.
3. Detail page per medication: all fields above in a clean readable layout. If the medication is already in the cabinet, show a prominent "In cabinet — Compartment N" badge.

### Phase 2 — The cabinet

4. "Add to cabinet" button on the detail page → small form asking compartment number (1–12) and optional expiration date → saves Medication row.
5. Cabinet page (`/cabinet`): 3×4 grid mirroring the physical cabinet. Each occupied cell shows the medication name and an OTC/Rx badge; tapping a cell opens the detail page. Empty cells render as empty compartments.
6. Edit & remove: an "Edit" action on the detail page letting the user correct any stored field (name, expiration date, compartment, dosage) at any time, plus a "Remove from cabinet" action.

### Phase 3 — Symptom lookup (the core demo moment)

7. Symptom page (`/symptoms`): a single input ("What are you feeling? e.g. headache").
8. On submit, show TWO result sections:
   - **"Medications in your cabinet for this"** — cabinet medications whose indications or purpose text contains the symptom term (case-insensitive substring match is fine for the prototype).
   - **"You've used before"** — medications from UsageLog where symptom matches, most recent first.
9. Each result shows medication name + compartment number, large and prominent (in the live demo this is when the physical LED lights up).
10. A "Take this" button on each result: creates a UsageLog row with the symptom and timestamp.

### Phase 4 — Hardware integration endpoint

11. `POST /api/scan` accepting the payload defined in Section 6:
    - Runs the name through RxNorm normalization, then the openFDA lookup (DailyMed fallback).
    - Creates a Medication row with `compartment = null` (pending assignment) and `status = "pending_review"`.
    - Returns the created medication JSON.
12. Scan review screen: if any medication is pending review, the cabinet page shows a banner: "New medication scanned: {name} — review & assign." Tapping it opens a review form showing every scanned/looked-up field (name, generic name, expiration date, dosage, OTC/Rx type) as editable inputs pre-filled with the detected values, plus the compartment picker. The user can correct anything the scanner got wrong before confirming. Confirming sets `status = "active"`. There must also be a "Wrong medication — re-search" option that lets the user run a fresh name search and swap the matched drug entirely while keeping the scan's physical details (expiration, compartment).

### Phase 5 — Prescription reminders (STRETCH ONLY — skip unless Phases 1–4 are done and tested)

13. On Rx-type medications, allow adding a Prescription (doses/day, pills/dose, start, end).
14. `/calendar` page: simple day list showing which prescriptions are due today and a checkbox to log each dose (writes UsageLog).

## 5. Out of Scope (do not build)

- User accounts, login, multi-user support
- Push notifications
- Recommending prescription medications for symptoms (prescriptions are reminder-only — never surface an Rx medication in symptom search results)
- Pharmacy contact/integration
- Face scanning
- Any medical advice language. The symptom feature only surfaces what the FDA label explicitly states and what the user has personally logged.

## 6. Hardware API Contract (for the Raspberry Pi team)

The physical cabinet integrates through exactly one endpoint. The Pi reads the label on-device and sends as much structured data as it can extract — only name is required, everything else is optional. The app must handle any combination of missing optional fields.

```
POST /api/scan
Content-Type: application/json
Body: {
  "name": "Tylenol Extra Strength",   // REQUIRED — best-guess medication name from label
  "genericName": "acetaminophen",     // optional
  "expirationDate": "2027-03",        // optional, any reasonable format
  "dosageStrength": "500 mg",         // optional
  "rawLabelText": "...",              // optional — full OCR text dump, stored for debugging/reprocessing
  "bottleSize": "small"               // optional: small | big | long — used later for compartment fit
}
Response 200: { medication object }
Response 404: { "error": "not found in openFDA or DailyMed", "receivedName": "..." }
```

**Server behavior:** run name through RxNorm normalization first (scanner OCR will produce imperfect names — "Tylenl Extr Strngth" should still resolve). Prefer Pi-supplied values (like `expirationDate`) over label-database values, since the Pi read the actual physical bottle. Store `rawLabelText` on the Medication row (add a nullable `rawLabelText` text column) so failed scans can be diagnosed and reprocessed without rescanning.

## 7. Repo & Collaboration Rules

- Work directly on main — no branching for this sprint. Commit after each phase (and after any significant fix) with a clear message like `Phase 2: cabinet grid + add/edit/remove`, and remind me to push after each commit.
- Never commit the SQLite database file or any `.env` file — ensure both are in `.gitignore`.
- Maintain a `README.md` for teammates who clone the repo. It must always contain: one-paragraph project description, setup steps (`npm install`, database setup command, `npm run dev`), how to test the scan endpoint with a sample curl command, and a short "project structure" section pointing to where each phase's code lives. Update the README at the end of each phase.
- Create a seed script that loads 5–6 realistic medications into the cabinet so any teammate (or demo run) starts from a populated state instead of an empty app.
- Write code a motivated high-school student can follow: descriptive names, a brief comment at the top of each non-obvious file explaining its role, no clever one-liners where a readable version exists.

## 8. Working Style (how to collaborate with me)

This is a collaborative build, not a fire-and-forget spec. Follow these rules:

- Before starting each phase, briefly state your plan (files you'll create/change, any libraries you'll add) and ask any clarifying questions. Wait for my go-ahead if anything is ambiguous.
- Ask, don't assume, when the PRD is silent or ambiguous — especially on UI layout choices, data edge cases, and anything touching the hardware contract.
- When there are multiple reasonable approaches, present 2 options with a one-line tradeoff each and a recommendation. Don't present more than 2–3; pick a lane.
- After finishing each phase, summarize what was built, how to test it manually (exact URLs / example inputs), and anything you noticed that the PRD should address.
- If something in the PRD seems wrong or will cause problems later, say so — push back rather than silently building it.
- Never expand scope on your own. If you think a feature beyond the current phase is worth adding, propose it and wait.
- I am learning parts of this stack as we go — when you make a non-obvious technical choice, add one sentence explaining why.

## 9. Quality bar

- Mobile-first: everything must look right at 390px width.
- Loading and error states on every API call (openFDA can be slow).
- Empty states: cabinet page and symptom results must look intentional when empty.
- Commit after each phase with a message naming the phase.
