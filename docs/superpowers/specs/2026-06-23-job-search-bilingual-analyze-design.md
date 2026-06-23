# Design — Real Job Matching + Bilingual Analyze

**Date:** 2026-06-23
**Status:** Approved (pending implementation plan)

## Goal

Two independent enhancements to the ResumeLoka analyzer:

1. **Real job matching** — replace LLM-imagined job listings with real openings fetched
   from JobThai + JobsDB, then ranked against the candidate profile by the LLM.
2. **Bilingual Analyze** — the Analyze block (advantages / disadvantages /
   recommendations) is produced in both EN and TH up front so the existing EN/TH
   toggle swaps it instantly, client-side, with no extra API call.

Out of scope: `score` and `profile` stay in their original language; job-card *content*
is not translated (only the Analyze block swaps language).

---

## Feature 1 — Real Job Matching (JobThai + JobsDB)

### Current behaviour

`jobsSystemPrompt()` instructs the LLM to invent "a plausible real Thai-market employer".
The returned `query` only builds a JobThai/JobsDB deep-link. Listings shown are fictional.

### New flow (in `POST /api/analyze`)

After the analysis call (unchanged) the job step becomes:

1. **Derive search queries** from `profile.role` + top 2–3 `profile.skills` in code
   (no extra LLM call). Fall back to `profile.role` alone if skills are empty.
2. **Fetch concurrently** from JobThai + JobsDB for those queries.
3. **Dedupe** (by normalized title+company) and **cap to ~12** raw listings.
4. **LLM ranking call** — feed the real listings + profile to the LLM; it returns 3–5
   `JobMatch` objects. `match` and `tags` are LLM-derived; `title`, `company`, `area`,
   `salary`, `url`, `source` are copied from the chosen real listing (LLM picks by id /
   index, it does not rewrite factual fields).
5. **Fallback** — if step 2–3 yields zero listings (site blocked / markup changed), fall
   back to the existing LLM-imagined job generation so the feature never returns empty.

### New module — `lib/jobs/sources.ts`

```ts
export interface RawListing {
  title: string;
  company: string;
  area: string;     // location text
  salary: string;   // raw salary text, "" if absent
  url: string;      // direct link to the listing
  source: "jobthai" | "jobsdb";
  snippet: string;  // short description text for LLM context, may be ""
}

export async function searchJobThai(query: string, limit: number): Promise<RawListing[]>;
export async function searchJobsDB(query: string, limit: number): Promise<RawListing[]>;
```

- Server-side `fetch` with realistic `User-Agent` / `Accept-Language` headers and a hard
  timeout (~8 s) per request.
- Prefer a JSON/search endpoint where one exists; otherwise extract listings from the HTML
  with tolerant parsing.
- **Never throws** — on any error, timeout, or empty result it returns `[]`. The caller
  treats an empty array as "this source contributed nothing" and relies on the other
  source + fallback.

> Risk note: both sites are SPA / anti-bot heavy. Parsing selectors/endpoints may need
> iteration during implementation. The empty-array contract + LLM fallback guarantee the
> endpoint still returns jobs even if scraping degrades.

### Type change — `JobMatch`

Add two fields; keep `query` for fallback deep-linking:

```ts
export interface JobMatch {
  title: string;
  company: string;
  area: string;
  salary: string;
  match: number;
  tags: string[];
  query: string;
  url: string;                          // NEW — real listing URL, "" for fallback jobs
  source: "jobthai" | "jobsdb" | "";    // NEW — "" for fallback jobs
}
```

### Frontend — `Jobs` component

- Card with a real `url` → a **single** "View on {JobThai|JobsDB}" button linking straight
  to `j.url` (label + color chosen by `j.source`).
- Card without `url` (fallback) → keep the existing **dual** JobThai + JobsDB deep-link
  buttons built from `j.query`.

### Performance / safety

- External fetches run server-side only (route already `runtime = "nodejs"`).
- Concurrency limited to the two sources × the query set; per-request timeout caps latency.
- Listing fields fed to the LLM are plain text only (no HTML), reducing prompt-injection
  surface.

---

## Feature 2 — Bilingual Analyze (instant EN/TH swap)

### Current behaviour

`analysisSystemPrompt()` forces all human-readable strings to Thai. The EN/TH toggle
changes UI labels only; the Analyze content stays Thai.

### New shape

```ts
export interface BilingualAnalysis {
  en: ResumeAnalysis;   // { advantages, disadvantages, recommendations }
  th: ResumeAnalysis;
}
```

`AnalyzeResult.analysis` changes from `ResumeAnalysis` to `BilingualAnalysis`.
`AnalysisLLMResult.analysis` changes likewise.

### Prompt — `analysisSystemPrompt()`

Ask for a single JSON object whose `analysis` field holds both languages:

```
"analysis": {
  "en": { "advantages": [...], "disadvantages": [...], "recommendations": [...] },
  "th": { "advantages": [...], "disadvantages": [...], "recommendations": [...] }
}
```

EN and TH must convey the same points (parallel content, not literal translation
artifacts). Factual profile fields are unchanged.

### Validation — `validateAnalysis()` in `route.ts`

- Validate `analysis.en` and `analysis.th` independently with the existing
  per-language logic (reuse a helper that validates one `ResumeAnalysis`).
- Empty-check: reject only if **both** languages are entirely empty (triggers the single
  built-in retry). `maxTokens` bumped (~2400) to fit two languages.

### Frontend

- `analysis` state holds the `BilingualAnalysis` object.
- `Analysis` component reads `analysis[lang]` (from `useLanguage()`), so the existing
  EN/TH toggle swaps content with no API call and no refetch.
- Guard for the count badge / lists when a language sub-object is momentarily absent.
- Chat: pass `analysis[lang]` as the grounding context (one language is sufficient for
  grounding).

---

## Files touched

| File | Change |
|------|--------|
| `lib/jobs/sources.ts` | NEW — JobThai/JobsDB fetch + parse, empty-array contract |
| `lib/llm/types.ts` | `JobMatch` gains `url`/`source`; add `BilingualAnalysis`; update `AnalyzeResult`/`AnalysisLLMResult` |
| `lib/llm/prompts.ts` | `analysisSystemPrompt()` emits EN+TH; `jobsSystemPrompt()` reworked to rank real listings (+ keep a fallback variant) |
| `app/api/analyze/route.ts` | New job pipeline (fetch → dedupe → rank → fallback); bilingual `validateAnalysis`; validate `url`/`source` in `validateJobs` |
| `app/components/ResumeAnalyzer.jsx` | `Analysis` reads `analysis[lang]`; `Jobs` single-vs-dual button; chat passes `analysis[lang]` |

## Testing

No test runner configured. Manual verification:
- Upload a sample résumé → confirm Analyze shows EN content under EN, TH under TH, swap is
  instant with no network call.
- Confirm jobs show real companies with working direct links; simulate a fetch failure
  (force empty) → confirm fallback jobs still render with dual deep-link buttons.
- Confirm `npm run lint` and `npm run build` pass.
