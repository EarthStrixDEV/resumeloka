# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

@AGENTS.md

> **Critical:** This project runs Next.js 16.2.9 / React 19. The AGENTS.md rule above is not boilerplate — APIs and conventions differ from older Next.js. Consult `node_modules/next/dist/docs/` before writing framework code.

## Commands

- `npm run dev` — dev server (http://localhost:3000)
- `npm run build` — production build
- `npm run start` — serve the production build
- `npm run lint` — ESLint (flat config)

No test runner is configured.

## Environment

Copy `.env.example` to `.env.local` before running. Required variable:

- `TYPHOON_API_KEY` — Typhoon AI key (required; all LLM calls fail without it)
- `TYPHOON_BASE_URL` — defaults to `https://api.opentyphoon.ai/v1`
- `LLM_MODEL_DEFAULT`, `LLM_MODEL_DEEP`, `LLM_MODEL_OCR` — override model slugs (all have defaults in `lib/llm/config.ts`)

## Architecture

ResumeLoka is an AI résumé analyzer: upload a PNG/JPG résumé → OCR → score + profile extraction + job matching + streaming chat.

### Routes

- `app/page.tsx` → `app/components/ResumeLokaLanding.jsx` — marketing landing (static, Tailwind)
- `app/analyzer/page.jsx` → `app/components/ResumeAnalyzer.jsx` — the full analyzer UI
- `app/api/analyze/route.ts` — `POST /api/analyze` (multipart) → OCR → analysis JSON → job matching JSON
- `app/api/chat/route.ts` — `POST /api/chat` → streaming plain-text response

**Pattern:** pages are thin `.tsx` wrappers; real UI lives in `.jsx` `"use client"` components under `app/components/`. Follow this split.

### LLM Layer (`lib/llm/`)

All AI calls go through this layer, never directly from components:

| File | Purpose |
|------|---------|
| `config.ts` | Reads env vars; routes `LLMTask` (`"default"` / `"deep"` / `"ocr"`) to model slugs |
| `client.ts` | OpenAI SDK singleton pointed at Typhoon. Exports `ocr()`, `complete()`, `completeJson<T>()`, `streamChat()`. Handles retry (429 → 5×, 5xx → 3×) with exponential backoff. |
| `throttle.ts` | Serializes OCR calls with 600 ms min spacing (Typhoon OCR rate limit is 2 RPS) |
| `json.ts` | Defensive JSON parsing for untrusted LLM output: strips fences, falls back to bracket extraction |
| `prompts.ts` | System prompts for OCR, analysis, job matching, and chat |
| `types.ts` | Shared TypeScript types — `ResumeProfile`, `ResumeAnalysis`, `JobMatch`, `AnalyzeResult` |

### Analyze Pipeline (`POST /api/analyze`)

1. Receive single PNG/JPG (up to 20 MB — may be a multi-page stitch)
2. `ocr()` → extract raw text
3. `completeJson<AnalysisLLMResult>()` with `analysisSystemPrompt()` → score + profile + advantages/disadvantages/recommendations
4. `completeJson<JobMatch[]>()` with `jobsSystemPrompt()` → 3–5 ranked job matches
5. Return combined `AnalyzeResult` JSON

`completeJson` retries once with a stricter reminder if JSON validation fails, then throws `LLMError(502)`.

### Multi-page Résumés

The client stitches multiple uploaded PNGs into **one tall image** via Canvas API before sending (`stitchPages()` inside `ResumeAnalyzer.jsx`). The server always receives a single file. Per-page `previewUrls[]` remain for in-browser display only.

### i18n

`lib/i18n/translations.ts` exports a `const translations = { en, th }` object. `LanguageProvider` (`app/contexts/LanguageContext.tsx`) wraps the root layout and exposes `useLanguage()` → `{ lang, setLang, t }`. Language is persisted in `localStorage`. When adding copy, add keys to **both** `en` and `th` objects.

## Styling

- **Tailwind CSS v4** (no `tailwind.config.js`) — configured in `app/globals.css` via `@import "tailwindcss"` and `@theme inline`. Add theme tokens there.
- **`ResumeAnalyzer.jsx` does NOT use Tailwind** — all its styles live in an inline `const CSS` template string injected via `<style>{CSS}</style>`. Edit CSS variables and class rules in that string.

## Conventions

- TypeScript path alias `@/*` maps to the repo root.
- All UI copy is bilingual (EN + TH) — preserve Thai diacritics when editing strings.
- `completeJson` validation functions (`validateAnalysis`, `validateJobs`) in `route.ts` throw on empty/invalid output to trigger the single built-in retry — keep them strict.
- The `ResumeAnalyzer` component is stage-driven: `"empty" | "analyzing" | "ready" | "error"`. State flows top-down; there is no external state manager.
