# Pillio

Companion web app for a smart medicine cabinet: search live FDA drug labels (via RxNorm normalization + openFDA), track which physical compartment each medication lives in, and (in later phases) look up OTC options by symptom and accept scans from the Raspberry Pi hardware.

## Setup

1. **Install dependencies**

   ```bash
   npm install
   ```

2. **Configure the database URL**

   Copy the example env file (SQLite file path):

   ```bash
   cp .env.example .env
   ```

3. **Create tables and seed sample cabinet data**

   ```bash
   npm run db:setup
   ```

   This runs `prisma db push` (creates/updates the SQLite tables), then seeds 6 medications (including Amoxicillin as a prescription) so the OTC/Rx badge and “In cabinet” state are visible immediately.

4. **Start the dev server**

   ```bash
   npm run dev
   ```

   Open [http://localhost:3000](http://localhost:3000).

## Phone call reminders (optional / stretch)

Twilio call reminders stay off-stage for the main demo. To enable them locally:

1. Add to `.env`: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_FROM_NUMBER`, `REMINDER_PHONE_NUMBER`.
2. Start the app: `npm run dev`
3. In another terminal: `npm run reminders:watch` (polls `/api/reminders/dispatch` so calls can fire with the browser closed).
4. Open `/settings` directly (not in primary nav during demo freeze) to toggle auto-call and message text.

Do not put npm scripts or `.env` paths in the in-app UI.

## Testing the scan endpoint

The hardware scan endpoint (`POST /api/scan`) ships in **Phase 4** and is not available yet. Example curl for when it lands:

```bash
curl -X POST http://localhost:3000/api/scan \
  -H "Content-Type: application/json" \
  -d "{\"name\":\"Tylenol Extra Strength\",\"expirationDate\":\"2027-03\",\"dosageStrength\":\"500 mg\"}"
```

## Project structure

| Area | Where it lives |
|------|----------------|
| PRD | `PRD.md` |
| Product docs (vision, rules, prompts, audits) | `docs/` — start at `docs/README.md` |
| Prisma schema + seed | `prisma/` |
| RxNorm / openFDA helpers | `src/lib/rxnorm.ts`, `src/lib/openfda.ts`, `src/lib/drugs.ts` |
| **Phase 1** — search API, home search, detail page | `src/app/api/drugs/search/`, `src/app/page.tsx`, `src/app/drugs/[slug]/` |
| **Phase 2** — cabinet grid, add / edit / remove | `src/app/cabinet/`, `src/app/api/cabinet/`, `src/lib/compartments.ts`, `src/components/AddToCabinetForm.tsx`, `src/components/CabinetMedicationActions.tsx` |
| **Phase 3** — symptom lookup + usage log | `src/app/symptoms/`, `src/app/api/symptoms/`, `src/lib/symptoms.ts`, `src/components/SymptomSearch.tsx` |
| Phase 4 — `POST /api/scan` + review | _(not built yet)_ |
| Phase 5 — prescription reminders | _(stretch — not built yet)_ |

## Phase 1 quick test

- Home search: [http://localhost:3000](http://localhost:3000) — try `Tylenol`, `Advil`, and misspelling `Tylenl` (should normalize via RxNorm).
- Seeded cabinet detail (badge): [http://localhost:3000/drugs/Tylenol](http://localhost:3000/drugs/Tylenol) and [http://localhost:3000/drugs/Amoxicillin](http://localhost:3000/drugs/Amoxicillin) (Rx badge).

## Phase 2 quick test

- Cabinet grid: [http://localhost:3000/cabinet](http://localhost:3000/cabinet) — Module A (1–9) and Module B (10–18). Sizes: medium 1–8 / 13–14 / 16–17, thin 9–12, big 15 / 18.
- Add: search a med not in the seed → detail → Add to cabinet (empty slot). Trying an occupied slot shows a clear error.
- Edit / Remove: open a seeded med from the cabinet grid → Edit fields or Remove from cabinet.

## Phase 3 quick test

- Symptoms: [http://localhost:3000/symptoms](http://localhost:3000/symptoms)
- `headache` → seeded OTC pain relievers (e.g. Tylenol, Advil); Amoxicillin must never appear.
- `broken arm` → empty-state message only.
- Tap **I took this** → row appears under “You've used before”.
