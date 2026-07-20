# OTC label search — full UX + implementation spec

**Status:** Spec ready for Manya to implement (not built yet)  
**Handoff:** See `docs/MANYA_NEXT_SESSION.md`  
**Feature flag (default OFF):** `NEXT_PUBLIC_ENABLE_OTC_MARKET_LABEL_SEARCH`  
**Auth:** Do **not** add Google/login — out of scope for demo

---

## 0. Note to Manya

Dad and the coach reviewed the teacher constraint (no “recommended meds for symptoms”) and the desire for a market-style “what’s out there / buy” path.

**Recommendation:** implement this **super low-risk** version:

| High risk (avoid) | This approach (build) |
|-------------------|------------------------|
| App recommends a drug for your headache | App searches **public FDA label text** for a word |
| “Best for / you should take” | “Label mentions… / not a recommendation” |
| Pillio sells or ranks treatments | Optional **View on Amazon** (user leaves Pillio) |
| Always on in demo | **Flag OFF by default** — teachers can veto instantly |

If teachers dislike it after review: leave the flag off. **No demo risk.**

---

## 1. Risk and liability analysis

### 1.1 Why teachers pushed back
Symptom → “here are drugs for you” looks like **medical advice / product recommendation**, even for OTC.

### 1.2 Why this design is lower risk
1. **Reference, not recommendation** — we surface *what labels say*, attributed to openFDA  
2. **No effectiveness ranking** — text match only; equal cards  
3. **Honest provenance** on every card  
4. **Persistent disclaimers** — not medical advice; not a recommendation  
5. **Commerce is external** — Amazon search deep-link; Pillio doesn’t checkout or ship  
6. **Friction before leave-app** — confirm sheet  
7. **OTC-only** — never Rx  
8. **Fail closed** — API down ⇒ empty/error, never invented results  
9. **Feature flag default OFF** — school demo safe until approved  

### 1.3 Honest limit
This **reduces** recommendation risk; it does **not** create zero legal liability.  
Disclaimer alone is not enough if the UI still *behaves* like a recommender — so copy, hierarchy, and banned phrases matter as much as the API.

### 1.4 Teacher gate
Before setting the flag to `true` in any shared/demo env, get an explicit OK on this sentence:

> “We don’t recommend drugs. We search official FDA OTC label text and show matches with sources. Buying, if any, happens on Amazon after you leave Pillio.”

---

## 2. Product definition

### 2.1 Name
**Search OTC labels** (UI). Internal: OTC market label search.

### 2.2 What it does
User types a symptom-related word → Pillio queries **openFDA** OTC drug labels → shows products whose **Uses / indications / purpose** text contains that word → each result shows source + match reason + warnings entry → optional **View on Amazon**.

### 2.3 What it is not
- Not a diagnosis tool  
- Not a treatment recommender  
- Not a pharmacy  
- Not an Amazon affiliate integration in v1 (plain search URL is enough)  
- Not Google auth / multi-user  

### 2.4 Separation from existing `/symptoms`
| Route | Role |
|-------|------|
| `/symptoms` | Match labels of meds **already in the household cabinet** + compartment |
| `/labels` | Search **public** OTC labels (flagged); optional Amazon hop |

Do **not** mix public market results into the cabinet symptom list.

---

## 3. Feature flag

### 3.1 Name
```bash
NEXT_PUBLIC_ENABLE_OTC_MARKET_LABEL_SEARCH=false
```

Unset or any value other than `true` / `1` ⇒ **OFF**.

Document in `.env.example`:
```bash
# Public OTC label search (/labels) + optional Amazon hop. Default off (teacher-safe).
# NEXT_PUBLIC_ENABLE_OTC_MARKET_LABEL_SEARCH=true
```

### 3.2 Behavior matrix

| Surface | Flag OFF | Flag ON |
|---------|----------|---------|
| Nav / TabBar / home shortcut | Hidden | Show “Labels” → `/labels` |
| `/labels` page | 404 or redirect home | Full UX |
| `GET /api/labels/search` | 404 or 403 `{ error: "Feature disabled" }` | Live openFDA search |
| Amazon buttons | N/A | Secondary + confirm |
| `/symptoms` cabinet flow | Unchanged | Unchanged |

### 3.3 Why this is easy for teachers
- Demo day: flag **OFF** — feature invisible  
- Teacher review: flag **ON** locally — show the framing  
- Dislike ⇒ turn OFF — no code delete, no emergency rewrite  

---

## 4. Full UX design

### 4.1 First viewport (`/labels`)
One calm composition (not a deal site):

1. Title: **Search OTC labels**  
2. One line: “Look up what product labels say. Not medical advice. Not a recommendation.”  
3. Search field + **Search labels** (primary CTA)  
4. Trust strip: “Sources: openFDA public labels · Optional shopping: Amazon (external)”  
5. **Non-dismissible disclaimer banner** (sticky mini version after scroll):

> Pillio does not recommend medications or treatments. Results are public label text matches only. Always read the full Drug Facts and talk to a pharmacist or doctor. If you buy, you leave Pillio and Amazon’s terms apply.

### 4.2 Results header
- “Results for “{query}””  
- Subhead: **Label text matches — not ranked by effectiveness**

### 4.3 Result card anatomy
Every card must include, in this priority order:

1. Brand name + OTC badge (+ generic if present)  
2. **Why this appeared** — “Uses text on the FDA label includes “{query}””  
3. **Verbatim excerpt** from label  
4. **Warnings** — collapsed/expand or link to full label; never hide that warnings exist  
5. **Source** — “openFDA drug label · retrieved {ISO timestamp}”  
6. Actions:  
   - Primary-ish text button: **Read full label details**  
   - Secondary outline: **View on Amazon** (never the only/biggest CTA)

### 4.4 Amazon confirm sheet (required)
On **View on Amazon**:

> You’re leaving Pillio to Amazon.  
> Pillio doesn’t sell medicine and didn’t recommend this treatment.  
> Continue to Amazon search for “{brand} {generic}”?  
> [Cancel] [Continue ↗]

Then open in a new tab:
`https://www.amazon.com/s?k={urlencoded brand + generic}`

**Button copy rules**
- Use: View on Amazon / Search this product on Amazon  
- Avoid: Buy now / Get this for your headache / Recommended purchase  

### 4.5 Loading / empty / error
| State | Copy |
|-------|------|
| Loading | “Searching openFDA label records…” |
| Empty | “No OTC label records matched that text. Try a simpler word. We don’t suggest products to buy.” |
| Error | “We couldn’t reach openFDA right now. Try again later. We won’t show guessed results.” |

### 4.6 Copy system

**Allowed:** label mentions · according to openFDA · text match · View on Amazon · not medical advice · not a recommendation  

**Banned:** recommend / recommended / best for / you should take / treatment for / cures / we suggest / top pick  

### 4.7 Mobile (390px)
- One column  
- Sticky mini-disclaimer  
- Large type  
- Amazon never visually louder than disclaimer/source  

---

## 5. Data provenance

### 5.1 Sources
| Source | Role |
|--------|------|
| **openFDA** `drug/label.json` | Primary — brand, generic, product_type, purpose / indications_and_usage, warnings |
| **RxNorm** (optional) | Normalize messy query spelling only — not scoring “best drug” |

### 5.2 Filters
- `product_type` must map to **OTC** only (reuse `mapProductType` patterns in `src/lib/openfda.ts`)  
- Drop PRESCRIPTION / UNKNOWN from market label results  

### 5.3 User-visible honesty
On page + every card:
- Source name: openFDA (U.S. FDA public drug label API)  
- Match reason tied to label field  
- “Not from Pillio doctors, AI medical advice, or Amazon medical staff”  
- “Purchase, if any, happens on Amazon (third party)”  

Missing fields ⇒ “Not listed on this label record” — never invent.

---

## 6. Implementation plan (for Cursor + Manya)

### 6.1 Flag helper
Add something like `src/lib/featureFlags.ts`:
```ts
export function isOtcMarketLabelSearchEnabled(): boolean {
  const v = process.env.NEXT_PUBLIC_ENABLE_OTC_MARKET_LABEL_SEARCH?.trim().toLowerCase();
  return v === "true" || v === "1";
}
```

### 6.2 API
`GET /api/labels/search?q=`

- If flag OFF → `404` or `403` with clear error  
- If missing `q` → `400`  
- Normalize via RxNorm (optional, best-effort)  
- Query openFDA for OTC labels matching indications/purpose text  
- Return JSON:
```ts
{
  query: string;
  retrievedAt: string; // ISO
  source: "openFDA";
  results: Array<{
    brandName: string;
    genericName: string | null;
    productType: "OTC";
    matchExcerpt: string;
    matchField: "purpose" | "indications";
    warnings: string | null;
    // enough to deep-link / show detail
  }>;
}
```
Reuse / extend helpers in `src/lib/openfda.ts`, `src/lib/rxnorm.ts`, `src/lib/symptoms.ts` (`excerptAroundMatch`).

### 6.3 UI
- `src/app/labels/page.tsx` — page shell + disclaimer  
- `src/components/LabelSearch.tsx` (client) — search, states, cards  
- `src/components/AmazonLeaveConfirm.tsx` — confirm sheet  
- `src/lib/amazonSearchUrl.ts` — build search URL safely  

### 6.4 Navigation wiring (flag-gated only)
- `src/components/AppNav.tsx` and/or `src/components/ui/TabBar.tsx`  
- Optional home shortcut in `src/app/page.tsx` — only if flag ON  
- Do not overwhelm nav; one clear “Labels” entry is enough  

### 6.5 Detail
Prefer linking to existing drug detail `/drugs/[slug]?from=labels` **or** an in-page drawer showing purpose/uses/warnings with attribution. Keep Amazon secondary there too.

### 6.6 Tests
- Unit: OTC filter rejects Rx  
- Unit: Amazon URL encoding  
- Unit/API: flag OFF rejects  
- Unit: excerpt/match helpers still safe on empty input  
- Manual: 390px, disclaimer visible, confirm before Amazon  

### 6.7 Docs / env
- Update `.env.example` with the flag (commented)  
- Update root `README.md` project structure one line pointing at `/labels` (flagged)

### 6.8 Suggested build order
1. Flag helper + API (fail closed)  
2. `/labels` page + cards + disclaimer  
3. Amazon confirm + deep-link  
4. Nav/home wiring behind flag  
5. Tests + README/env note  
6. Manual verify OFF vs ON  

---

## 7. Acceptance checklist

- [ ] Flag defaults OFF; OFF ⇒ feature invisible / API disabled  
- [ ] ON ⇒ `/labels` usable on phone (~390px)  
- [ ] Every result shows openFDA source + match reason + retrieved time  
- [ ] OTC-only; no Rx  
- [ ] No banned recommendation language  
- [ ] Warnings accessible from each result  
- [ ] Amazon is secondary + confirm interstitial  
- [ ] openFDA error ⇒ human empty/error, no fake rows  
- [ ] No auth added  
- [ ] Cabinet `/symptoms` unchanged and not mixed with market results  

---

## 8. Out of scope (v1)

- Amazon Product Advertising / affiliate API  
- Real checkout, cart, or shipping inside Pillio  
- Auto-order / subscriptions  
- Ranking by “best treatment”  
- AI-written medical advice  
- Prescription products  
- Google / any user authentication  
- Replacing the cabinet symptom hero for school demo (keep flag OFF unless teachers approve)

---

## 9. Rollout advice

1. Implement behind flag (this spec)  
2. Teacher review with flag ON locally  
3. School showcase: flag **OFF** unless they signed off  
4. After program: decide if Labels becomes a proud pillar or stays labs-only  

---

## 10. Prompt reminder

Full copy-paste prompt lives in `docs/MANYA_NEXT_SESSION.md` and `docs/PROMPT_PACK.md`.  
Attach this file when building.
