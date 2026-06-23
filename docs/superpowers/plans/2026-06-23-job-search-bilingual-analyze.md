# Real Job Matching + Bilingual Analyze — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make job matching use real JobThai/JobsDB listings ranked by the LLM, and produce the Analyze block in both EN+TH so the existing toggle swaps it instantly.

**Architecture:** Server-side `lib/jobs/sources.ts` fetches+parses real listings (empty-array on failure); `POST /api/analyze` ranks them via the LLM with a fallback to LLM-imagined jobs. The analysis LLM call emits both `en` and `th` Analyze content; the client renders `analysis[lang]` and swaps with no refetch.

**Tech Stack:** Next.js 16.2.9 / React 19, TypeScript, Typhoon LLM via OpenAI SDK (`lib/llm/`), Tailwind v4 (landing) + inline CSS string (analyzer).

## Global Constraints

- **No test runner exists.** Each task's "verify" cycle is `npm run lint` + `npm run build` + the manual check described. Never invent a `pytest`/`jest` command.
- Next.js 16.2.9 / React 19 — consult `node_modules/next/dist/docs/` before framework-level code; do not assume older Next.js APIs.
- All LLM calls go through `lib/llm/` (`completeJson`, `complete`, `ocr`) — never call the OpenAI SDK from components or `route.ts` directly.
- UI copy stays bilingual (EN + TH); preserve Thai diacritics exactly when editing strings.
- `ResumeAnalyzer.jsx` uses NO Tailwind — styles live in the inline `const CSS` template string. Edit CSS there, not via classes elsewhere.
- `validateAnalysis` / `validateJobs` must stay strict (throw on empty/invalid) so `completeJson`'s single built-in retry fires.
- Pages stay thin `.tsx`; real UI stays in `.jsx` `"use client"` components.
- Commit after every task. End commit messages with the `Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>` trailer.

---

## Task 1: Bilingual Analyze — types, prompt, validation

**Files:**
- Modify: `lib/llm/types.ts`
- Modify: `lib/llm/prompts.ts:19-48` (`analysisSystemPrompt`)
- Modify: `app/api/analyze/route.ts:136-151` (`validateAnalysis`), `:52-63` (maxTokens)

**Interfaces:**
- Produces: `BilingualAnalysis = { en: ResumeAnalysis; th: ResumeAnalysis }`; `AnalyzeResult.analysis: BilingualAnalysis`; `AnalysisLLMResult.analysis: BilingualAnalysis`.

- [ ] **Step 1: Add `BilingualAnalysis` and update result types**

In `lib/llm/types.ts`, after the `ResumeAnalysis` interface (line 41) add:

```ts
/** Analyze block produced in both languages so the UI can swap with no refetch. */
export interface BilingualAnalysis {
  en: ResumeAnalysis;
  th: ResumeAnalysis;
}
```

Then change the `analysis` field type in **both** `AnalyzeResult` (line ~56) and
`AnalysisLLMResult` (line ~64) from `ResumeAnalysis` to `BilingualAnalysis`:

```ts
export interface AnalyzeResult {
  score: number;
  profile: ResumeProfile;
  analysis: BilingualAnalysis;
  jobs: JobMatch[];
}

export interface AnalysisLLMResult {
  score: number;
  profile: ResumeProfile;
  analysis: BilingualAnalysis;
}
```

- [ ] **Step 2: Update `analysisSystemPrompt()` to emit EN+TH**

In `lib/llm/prompts.ts`, replace the Thai-only instruction line and the `"analysis"`
shape inside `analysisSystemPrompt()`. Change line 23 from the single Thai instruction to:

```ts
    "Write the Analyze block (advantages, disadvantages, recommendations) in BOTH English and Thai.",
    "The two languages must convey the SAME points in parallel — natural phrasing in each, not a literal word-for-word translation.",
    "Keep factual profile fields (name, email, github, skills, company names) in their original language.",
```

Then replace the `"analysis": { ... }` block (lines 38-42) with:

```ts
    '  "analysis": {',
    '    "en": {',
    '      "advantages": <string[] of 2-4 concrete strengths>,',
    '      "disadvantages": <string[] of 2-4 concrete weaknesses>,',
    '      "recommendations": <string[] of 3-5 specific, actionable fixes>',
    '    },',
    '    "th": {',
    '      "advantages": <string[] 2-4, Thai>,',
    '      "disadvantages": <string[] 2-4, Thai>,',
    '      "recommendations": <string[] 3-5, Thai>',
    '    }',
    "  }",
```

- [ ] **Step 3: Update `validateAnalysis()` to validate both languages**

In `app/api/analyze/route.ts`, add a one-language helper and rewrite `validateAnalysis`
(replace lines 136-151):

```ts
function validateOneAnalysis(v: unknown): ResumeAnalysis {
  const a = obj(v);
  return {
    advantages: asStringArray(a.advantages),
    disadvantages: asStringArray(a.disadvantages),
    recommendations: asStringArray(a.recommendations),
  };
}

function isEmptyAnalysis(a: ResumeAnalysis): boolean {
  return (
    a.advantages.length === 0 &&
    a.disadvantages.length === 0 &&
    a.recommendations.length === 0
  );
}

function validateAnalysis(v: unknown): AnalysisLLMResult {
  const o = obj(v);
  const a = obj(o.analysis);
  const en = validateOneAnalysis(a.en);
  const th = validateOneAnalysis(a.th);
  // Reject only if BOTH languages are empty, so completeJson() retries once.
  if (isEmptyAnalysis(en) && isEmptyAnalysis(th)) {
    throw new Error("Analysis was empty");
  }
  return {
    score: clampScore(o.score),
    profile: validateProfile(o.profile),
    analysis: { en, th },
  };
}
```

Add `ResumeAnalysis` to the type import at the top (line 8-13 block):

```ts
import type {
  AnalysisLLMResult,
  AnalyzeResult,
  JobMatch,
  ResumeAnalysis,
  ResumeProfile,
} from "@/lib/llm/types";
```

- [ ] **Step 4: Bump analysis `maxTokens` for two languages**

In `app/api/analyze/route.ts`, in the `completeJson<AnalysisLLMResult>` call, change
`maxTokens: 1500` (line 55) to `maxTokens: 2600`.

- [ ] **Step 5: Verify lint + build**

Run: `npm run lint`
Expected: no errors in `types.ts`, `prompts.ts`, `route.ts`.

Run: `npm run build`
Expected: build succeeds (the JSX still reads `analysis.advantages`; that breaks at
runtime, not build — fixed in Task 2). TypeScript only checks `.ts`, so this passes.

- [ ] **Step 6: Commit**

```bash
git add lib/llm/types.ts lib/llm/prompts.ts app/api/analyze/route.ts
git commit -m "feat: produce Analyze block in both EN and TH

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 2: Bilingual Analyze — frontend rendering + chat context

**Files:**
- Modify: `app/components/ResumeAnalyzer.jsx` — `Analysis` component (lines 561-587), its
  call site, and the chat `send()` context.

**Interfaces:**
- Consumes: `analysis` state is now `{ en: {...}, th: {...} }` (Task 1).

- [ ] **Step 1: Render `analysis[lang]` in the `Analysis` component**

In `app/components/ResumeAnalyzer.jsx`, replace the `Analysis` function (lines 561-587):

```jsx
function Analysis({ analysis }) {
  const { lang, t } = useLanguage();
  const a = analysis?.[lang];
  if (!a) return null;
  const blocks = [
    { key: "advantages", title: t("advantages"), icon: <ThumbsUp size={16} />, cls: "good", items: a.advantages },
    { key: "disadvantages", title: t("disadvantages"), icon: <AlertTriangle size={16} />, cls: "warn", items: a.disadvantages },
    { key: "recommendations", title: t("recommendations"), icon: <Lightbulb size={16} />, cls: "tip", items: a.recommendations },
  ];
  return (
    <div className="grid-analysis fade-up">
      {blocks.map((b) => (
        <div key={b.key} className={"card analysis-card " + b.cls}>
          <div className="ac-head">
            <span className="ac-icon">{b.icon}</span>
            <h3>{b.title}</h3>
            <span className="ac-count mono">{b.items.length}</span>
          </div>
          <ul className="ac-list">
            {b.items.map((it, i) => (
              <li key={i}><span className="ac-bullet"><Check size={12} strokeWidth={3} /></span>{it}</li>
            ))}
          </ul>
        </div>
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Pass the current language's analysis to the chat API**

Find the `send()` function's fetch to `/api/chat` (search for `"/api/chat"` in the file).
Where it sends `analysis` in the request body, change it to send the language slice. Locate
the body object passed to `JSON.stringify(...)` and replace `analysis` with
`analysis: analysis?.[lang] ?? null`. (The `lang` value is already in scope from the
top-level `useLanguage()` at line 101.)

Example — if the body reads:
```jsx
body: JSON.stringify({ profile, analysis, messages: history }),
```
change to:
```jsx
body: JSON.stringify({ profile, analysis: analysis?.[lang] ?? null, messages: history }),
```

- [ ] **Step 3: Verify build + manual swap**

Run: `npm run build`
Expected: success.

Run: `npm run dev`, upload a sample résumé image, wait for "ready":
- Click the EN/TH toggle. Expected: advantages/disadvantages/recommendations text swaps
  between English and Thai **instantly with no network request** (check the Network tab —
  no new `/api/analyze` call).
- Send a chat message in each language. Expected: the bot answers grounded in the résumé.

- [ ] **Step 4: Commit**

```bash
git add app/components/ResumeAnalyzer.jsx
git commit -m "feat: swap Analyze block EN/TH client-side from pre-generated content

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 3: JobThai/JobsDB fetch + parse module

**Files:**
- Create: `lib/jobs/sources.ts`

**Interfaces:**
- Produces: `RawListing`, `searchJobThai(query, limit)`, `searchJobsDB(query, limit)`,
  `searchAllSources(queries, perSource)` — all return `RawListing[]`, never throw.

- [ ] **Step 1: Probe the live response shape (investigation, no code yet)**

Run these and inspect the output to confirm the parsing strategy before writing selectors:

```bash
curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://www.jobthai.com/en/jobs?keyword=software%20engineer" | grep -o '__NEXT_DATA__' | head
curl -s -A "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36" \
  "https://th.jobsdb.com/th/jobs?keywords=software%20engineer" | grep -o 'window.SEEK_REDUX_DATA\|__NEXT_DATA__' | head
```

Expected: at least one embedded-JSON marker per site. Note which marker each site uses;
the parser in Step 2 keys off `__NEXT_DATA__` (Next.js) and falls back to a tolerant
listing-block regex. If a site returns no markers (hard block), its function will simply
return `[]` and the LLM fallback (Task 4) covers it — that is acceptable and expected.

- [ ] **Step 2: Write `lib/jobs/sources.ts`**

```ts
// Real Thai-market job listings fetched server-side from JobThai + JobsDB.
// Contract: every exported search function NEVER throws — on any network error,
// timeout, block, or markup change it returns []. Callers treat [] as "no contribution"
// and rely on the other source plus the LLM fallback in /api/analyze.

export interface RawListing {
  title: string;
  company: string;
  area: string;
  salary: string;
  url: string;
  source: "jobthai" | "jobsdb";
  snippet: string;
}

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 8000;

async function fetchHtml(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, "Accept-Language": "en,th;q=0.9" },
      cache: "no-store",
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

/** Pull the JSON embedded in a Next.js page's __NEXT_DATA__ script tag. */
function nextData(html: string): unknown | null {
  const m = html.match(
    /<script id="__NEXT_DATA__" type="application\/json">([\s\S]*?)<\/script>/,
  );
  if (!m) return null;
  try {
    return JSON.parse(m[1]);
  } catch {
    return null;
  }
}

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

/** Walk an arbitrary object tree collecting arrays of objects that look like job rows. */
function collectListingArrays(node: unknown, out: Record<string, unknown>[][]): void {
  if (Array.isArray(node)) {
    const rows = node.filter(
      (x) => x && typeof x === "object" && !Array.isArray(x),
    ) as Record<string, unknown>[];
    const looksLikeJobs =
      rows.length > 0 &&
      rows.every((r) => "title" in r || "jobTitle" in r || "position" in r || "name" in r);
    if (looksLikeJobs) out.push(rows);
    node.forEach((c) => collectListingArrays(c, out));
  } else if (node && typeof node === "object") {
    Object.values(node as Record<string, unknown>).forEach((c) =>
      collectListingArrays(c, out),
    );
  }
}

function pick(row: Record<string, unknown>, keys: string[]): string {
  for (const k of keys) {
    const v = row[k];
    if (typeof v === "string" && v.trim()) return v.trim();
    if (v && typeof v === "object") {
      const name = (v as Record<string, unknown>).name;
      if (typeof name === "string" && name.trim()) return name.trim();
    }
  }
  return "";
}

function rowsToListings(
  rows: Record<string, unknown>[],
  source: RawListing["source"],
  origin: string,
  limit: number,
): RawListing[] {
  const out: RawListing[] = [];
  for (const r of rows) {
    const title = pick(r, ["title", "jobTitle", "position", "name"]);
    if (!title) continue;
    const rawUrl = pick(r, ["url", "jobUrl", "link", "href", "slug"]);
    const url = rawUrl.startsWith("http")
      ? rawUrl
      : rawUrl
        ? origin + (rawUrl.startsWith("/") ? "" : "/") + rawUrl
        : "";
    out.push({
      title,
      company: pick(r, ["company", "companyName", "employer", "advertiser"]),
      area: pick(r, ["location", "area", "locationName", "province", "city"]),
      salary: pick(r, ["salary", "salaryText", "salaryRange", "wage"]),
      url,
      source,
      snippet: pick(r, ["description", "snippet", "summary", "teaser"]).slice(0, 280),
    });
    if (out.length >= limit) break;
  }
  return out;
}

export async function searchJobThai(query: string, limit: number): Promise<RawListing[]> {
  const url = `https://www.jobthai.com/en/jobs?keyword=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  if (!html) return [];
  const data = nextData(html);
  if (!data) return [];
  const arrays: Record<string, unknown>[][] = [];
  collectListingArrays(data, arrays);
  const best = arrays.sort((a, b) => b.length - a.length)[0] ?? [];
  return rowsToListings(best, "jobthai", "https://www.jobthai.com", limit);
}

export async function searchJobsDB(query: string, limit: number): Promise<RawListing[]> {
  const url = `https://th.jobsdb.com/th/jobs?keywords=${encodeURIComponent(query)}`;
  const html = await fetchHtml(url);
  if (!html) return [];
  const data = nextData(html);
  if (!data) return [];
  const arrays: Record<string, unknown>[][] = [];
  collectListingArrays(data, arrays);
  const best = arrays.sort((a, b) => b.length - a.length)[0] ?? [];
  return rowsToListings(best, "jobsdb", "https://th.jobsdb.com", limit);
}

/** Run every query against both sources concurrently, flatten, and dedupe. */
export async function searchAllSources(
  queries: string[],
  perSource: number,
): Promise<RawListing[]> {
  const tasks: Promise<RawListing[]>[] = [];
  for (const q of queries) {
    tasks.push(searchJobThai(q, perSource));
    tasks.push(searchJobsDB(q, perSource));
  }
  const settled = await Promise.allSettled(tasks);
  const all = settled.flatMap((s) => (s.status === "fulfilled" ? s.value : []));
  const seen = new Set<string>();
  const deduped: RawListing[] = [];
  for (const l of all) {
    const key = `${l.title}|${l.company}`.toLowerCase().replace(/\s+/g, " ").trim();
    if (seen.has(key)) continue;
    seen.add(key);
    deduped.push(l);
  }
  return deduped;
}
```

- [ ] **Step 3: Verify lint + build**

Run: `npm run lint`
Expected: no errors in `lib/jobs/sources.ts`.

Run: `npm run build`
Expected: success.

- [ ] **Step 4: Smoke-test the fetcher in isolation**

Create a throwaway file `scratch-jobs-probe.mjs` at the repo root:

```js
import { searchAllSources } from "./lib/jobs/sources.ts";
const r = await searchAllSources(["software engineer"], 5);
console.log("count:", r.length);
console.log(r.slice(0, 3));
```

Run: `npx tsx scratch-jobs-probe.mjs` (if `tsx` is unavailable, skip this step and rely on
the Task 4 end-to-end manual check instead).
Expected: prints a count. If `count: 0`, that confirms the sites blocked us / changed
markup — note it; the Task 4 fallback handles it and the empty-array contract holds.
Then delete the file: `rm scratch-jobs-probe.mjs` (never commit it).

- [ ] **Step 5: Commit**

```bash
git add lib/jobs/sources.ts
git commit -m "feat: add JobThai/JobsDB listing fetcher with empty-array contract

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 4: Job pipeline — rank real listings, fall back to LLM

**Files:**
- Modify: `lib/llm/types.ts` — `JobMatch` gains `url`, `source`.
- Modify: `lib/llm/prompts.ts` — add `jobsRankPrompt()`; keep `jobsSystemPrompt()` for fallback.
- Modify: `app/api/analyze/route.ts` — new job step + `validateJobs` gains `url`/`source`.

**Interfaces:**
- Consumes: `searchAllSources(queries, perSource)` and `RawListing` (Task 3).
- Produces: `JobMatch` with `url: string`, `source: "jobthai" | "jobsdb" | ""`.

- [ ] **Step 1: Extend `JobMatch` type**

In `lib/llm/types.ts`, in the `JobMatch` interface (lines 43-51) add the two fields:

```ts
export interface JobMatch {
  title: string;
  company: string;
  area: string;
  salary: string;
  match: number;
  tags: string[];
  query: string;
  url: string;
  source: "jobthai" | "jobsdb" | "";
}
```

- [ ] **Step 2: Add a ranking prompt; keep the fallback prompt**

In `lib/llm/prompts.ts`, add a new exported function after `jobsSystemPrompt()`:

```ts
/**
 * Rank REAL listings against the profile. The model must NOT invent jobs — it selects
 * from the provided listings by their numeric id and copies the factual fields verbatim.
 */
export function jobsRankPrompt(): string {
  return [
    "You are a Thai job-matching engine. You are given a candidate profile and a numbered",
    "list of REAL job openings already fetched from Thai job boards.",
    "Choose the 3-5 best-fitting openings. Do NOT invent openings or alter their facts.",
    "",
    "Output a single JSON ARRAY where each element is EXACTLY:",
    "{",
    '  "id": <integer, the listing number you are selecting>,',
    '  "match": <integer 0-100, fit against the profile>,',
    '  "tags": <string[] of 3-4 key skills relevant to this role>',
    "}",
    "",
    "Order by match descending. Output ONLY listings that genuinely fit; never duplicate an id.",
    JSON_ONLY,
  ].join("\n");
}
```

(Leave `jobsSystemPrompt()` unchanged — it is the fallback when no real listings are found.)

- [ ] **Step 3: Rewrite the job step in `route.ts`**

In `app/api/analyze/route.ts`:

Add imports near the top:
```ts
import { searchAllSources, type RawListing } from "@/lib/jobs/sources";
import { analysisSystemPrompt, jobsRankPrompt, jobsSystemPrompt } from "@/lib/llm/prompts";
```
(Replace the existing `prompts` import line so `jobsRankPrompt` is included.)

Replace the entire "Job matching" `completeJson<JobMatch[]>` block (lines 65-80) with:

```ts
    // Real listings → LLM ranking; fall back to LLM-imagined jobs if none fetched.
    const queries = buildJobQueries(analysis.profile);
    const listings = await searchAllSources(queries, 6);
    const capped = listings.slice(0, 12);

    let jobs: JobMatch[];
    if (capped.length > 0) {
      const ranked = await completeJson<RankedPick[]>(
        {
          task: "default",
          temperature: 0.3,
          maxTokens: 700,
          messages: [
            { role: "system", content: jobsRankPrompt() },
            {
              role: "user",
              content:
                `Candidate profile (JSON):\n${JSON.stringify(analysis.profile)}\n\n` +
                `Listings:\n${formatListings(capped)}`,
            },
          ],
        },
        validateRanked,
      );
      jobs = ranked
        .map((r) => {
          const src = capped[r.id];
          if (!src) return null;
          return {
            title: src.title,
            company: src.company,
            area: src.area,
            salary: src.salary,
            match: r.match,
            tags: r.tags,
            query: src.title,
            url: src.url,
            source: src.source,
          } as JobMatch;
        })
        .filter((j): j is JobMatch => j !== null);
    } else {
      jobs = [];
    }

    // Fallback: nothing real fetched or nothing ranked — use LLM-imagined jobs.
    if (jobs.length === 0) {
      jobs = await completeJson<JobMatch[]>(
        {
          task: "default",
          temperature: 0.5,
          maxTokens: 900,
          messages: [
            { role: "system", content: jobsSystemPrompt() },
            {
              role: "user",
              content: `Candidate profile (JSON):\n${JSON.stringify(analysis.profile)}`,
            },
          ],
        },
        validateJobs,
      );
    }
```

- [ ] **Step 4: Add the helpers + ranked-pick validation in `route.ts`**

Add near the other helpers (below `validateJobs`):

```ts
interface RankedPick {
  id: number;
  match: number;
  tags: string[];
}

function buildJobQueries(profile: ResumeProfile): string[] {
  const queries: string[] = [];
  const role = str(profile.role).trim();
  const skills = profile.skills.slice(0, 3).filter((s) => s.trim());
  if (role) queries.push(role);
  if (role && skills[0]) queries.push(`${role} ${skills[0]}`);
  if (skills[0] && queries.length < 2) queries.push(skills[0]);
  return queries.length > 0 ? queries.slice(0, 2) : ["software engineer"];
}

function formatListings(listings: RawListing[]): string {
  return listings
    .map((l, i) => {
      const parts = [
        `[${i}] ${l.title}`,
        l.company && `Company: ${l.company}`,
        l.area && `Area: ${l.area}`,
        l.salary && `Salary: ${l.salary}`,
        l.snippet && `About: ${l.snippet}`,
      ].filter(Boolean);
      return parts.join(" | ");
    })
    .join("\n");
}

function validateRanked(v: unknown): RankedPick[] {
  const arr = Array.isArray(v) ? v : [];
  const picks = arr
    .map((p) => {
      const o = obj(p);
      return {
        id: Math.round(num(o.id)),
        match: clampScore(o.match),
        tags: asStringArray(o.tags),
      };
    })
    .filter((p) => Number.isInteger(p.id) && p.id >= 0);
  if (picks.length === 0) throw new Error("No ranked picks returned");
  return picks;
}
```

Update `validateJobs` (the fallback path) so its objects include `url`/`source`. In the
returned object literal (around line 159-166) add:
```ts
        url: "",
        source: "" as const,
```

Add `ResumeProfile` to the type import if not already present (it is, from Task 1).

- [ ] **Step 5: Verify lint + build**

Run: `npm run lint`
Expected: no errors.

Run: `npm run build`
Expected: success.

- [ ] **Step 6: Manual end-to-end**

Run: `npm run dev`, upload a sample résumé:
- Expected: Jobs tab shows roles. If real listings were fetched, companies/titles look real
  and each card has a working direct link (Task 5 wires the button). If fetch returned
  empty, the fallback jobs render (no `url`).
- To force the fallback path for testing: temporarily make `buildJobQueries` return
  `["zzqqxx-no-such-job"]`, confirm fallback jobs still appear, then revert.

- [ ] **Step 7: Commit**

```bash
git add lib/llm/types.ts lib/llm/prompts.ts app/api/analyze/route.ts
git commit -m "feat: rank real JobThai/JobsDB listings with LLM, fall back to generated jobs

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Task 5: Job card — direct link vs fallback dual deep-link

**Files:**
- Modify: `app/components/ResumeAnalyzer.jsx` — `Jobs` component (lines 589-638) and the
  inline `CSS` string (add a `.btn-direct` rule near `.btn-jobthai`/`.btn-jobsdb`).

**Interfaces:**
- Consumes: `JobMatch` now carries `url` and `source` (Task 4).

- [ ] **Step 1: Render a single direct button when `url` exists**

In `app/components/ResumeAnalyzer.jsx`, replace the `job-actions` block inside the `Jobs`
map (lines 625-632) with:

```jsx
            <div className="job-actions">
              {j.url ? (
                <a
                  className={"btn " + (j.source === "jobsdb" ? "btn-jobsdb" : "btn-jobthai")}
                  href={j.url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {j.source === "jobsdb" ? "JobsDB" : "JobThai"} <ArrowUpRight size={14} />
                </a>
              ) : (
                <>
                  <a className="btn btn-jobthai" href={jobThai(j.query || j.title)} target="_blank" rel="noreferrer">
                    JobThai <ArrowUpRight size={14} />
                  </a>
                  <a className="btn btn-jobsdb" href={jobsDB(j.query || j.title)} target="_blank" rel="noreferrer">
                    JobsDB <ArrowUpRight size={14} />
                  </a>
                </>
              )}
            </div>
```

- [ ] **Step 2: Verify build + manual**

Run: `npm run build`
Expected: success.

Run: `npm run dev`, upload a résumé:
- Real-listing cards: one button labelled by source, links straight to the real posting
  (verify the href opens the actual listing).
- Fallback cards (force via Task 4 Step 6 method): two buttons (JobThai + JobsDB) as before.

- [ ] **Step 3: Commit**

```bash
git add app/components/ResumeAnalyzer.jsx
git commit -m "feat: link job cards to the real listing, keep dual deep-link for fallback

Co-Authored-By: Claude Opus 4.8 <noreply@anthropic.com>"
```

---

## Final verification (after all tasks)

- [ ] `npm run lint` — clean.
- [ ] `npm run build` — succeeds.
- [ ] Manual: upload résumé → Analyze swaps EN/TH instantly (no refetch); Jobs show real
  listings with working direct links; forced-empty path falls back to generated jobs with
  dual deep-link buttons.
- [ ] No scratch files committed (`scratch-jobs-probe.mjs` deleted).

## Self-Review notes

- **Spec coverage:** Feature 1 (real jobs) → Tasks 3,4,5. Feature 2 (bilingual Analyze) →
  Tasks 1,2. Fallback requirement → Task 4 Step 3. `url`/`source` type → Task 4 Step 1.
  Single-vs-dual button → Task 5.
- **Type consistency:** `BilingualAnalysis`, `RawListing`, `RankedPick`, and the extended
  `JobMatch` are defined before use; `searchAllSources(queries, perSource)` signature
  matches its call in Task 4.
- **No automated tests** by project constraint — verification is lint + build + manual,
  stated in every task.
