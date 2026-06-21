<p align="center">
  <img src="public/logo.png" alt="ResumeLoka logo" width="96" height="96" />
</p>

<h1 align="center">ResumeLoka</h1>

<p align="center">
  AI-powered resume analysis, HR-style feedback, and Thai job matching in one polished Next.js application.
</p>

<p align="center">
  <img alt="Next.js" src="https://img.shields.io/badge/Next.js-16-black?style=for-the-badge&logo=nextdotjs" />
  <img alt="React" src="https://img.shields.io/badge/React-19-149eca?style=for-the-badge&logo=react&logoColor=white" />
  <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178c6?style=for-the-badge&logo=typescript&logoColor=white" />
  <img alt="Tailwind CSS" src="https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?style=for-the-badge&logo=tailwindcss&logoColor=white" />
</p>

## Overview

ResumeLoka helps job seekers understand how their resume reads to a recruiter. Users upload a resume image, receive a structured profile extraction, get a 0-100 resume score, review concrete strengths and weaknesses, chat with a female HR Specialist assistant, and explore matched roles with direct JobThai and JobsDB search links.

The product is built for the Thai job market and uses Typhoon, a Thai AI engine from OpenTyphoon.ai, as the main intelligence layer. Typhoon powers resume OCR, structured resume scoring, job matching, and HR-style chat through an OpenAI-compatible server-side LLM layer. All model calls stay behind Next.js API routes so API keys and resume data are never exposed to the browser.

## Highlights

- Professional landing page with product messaging, reviews, and conversion CTAs.
- Studio-style resume analyzer with drag-and-drop upload, animated processing states, dashboard, analysis, job matches, and chat.
- OCR plus resume analysis pipeline for PNG/JPG resumes.
- HR Specialist chat persona that answers in plain, human-readable text instead of markdown.
- Thai-market job matching with ranked fit scores and deep links to JobThai and JobsDB.
- English/Thai language context support for localized UI copy.
- Server-side LLM client with model routing, retries, timeouts, OCR throttling, JSON parsing, and response validation.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Framework | Next.js 16 App Router |
| UI | React 19, Tailwind CSS 4, custom CSS-in-component styling |
| Icons | lucide-react |
| LLM Provider | Typhoon/OpenTyphoon via OpenAI-compatible API |
| Runtime | Node.js API routes |
| Language | TypeScript and JSX |

## AI Engine: Typhoon Thai AI

Typhoon is the main AI engine behind ResumeLoka. It is a Thai-optimized LLM platform from OpenTyphoon.ai, exposed through an OpenAI-compatible API. ResumeLoka uses Typhoon because resume analysis for Thai candidates needs strong Thai-English understanding, local job-market context, and reliable Thai-language feedback.

Typhoon responsibilities in this project:

| Capability | How ResumeLoka Uses Typhoon |
| --- | --- |
| OCR | Reads resume images and extracts Thai/English resume text |
| Resume analysis | Converts raw resume text into score, profile, strengths, weaknesses, and recommendations |
| Job matching | Generates realistic Thai-market role matches with fit scores and search queries |
| HR chat | Streams grounded answers from a warm female HR Specialist persona |
| Structured output | Produces strict JSON for app rendering, then the server validates it before use |

Model routing is configured through environment variables:

```bash
LLM_MODEL_DEFAULT=typhoon-v2.5-30b-a3b-instruct
LLM_MODEL_DEEP=typhoon-v2.5-30b-a3b-instruct
LLM_MODEL_OCR=typhoon-ocr
```

The integration lives in `lib/llm`:

- `config.ts` reads Typhoon credentials and model names.
- `client.ts` wraps the OpenAI-compatible API, retries, timeouts, OCR calls, and streaming chat.
- `prompts.ts` defines the OCR, analysis, job matching, and HR chat system prompts.
- `json.ts` parses model output defensively.
- `types.ts` defines the validated shape used by the UI.

## Application Routes

| Route | Purpose |
| --- | --- |
| `/` | Marketing landing page for ResumeLoka |
| `/analyzer` | Resume upload, analysis dashboard, job matching, and HR chat |
| `/api/analyze` | Multipart resume upload -> OCR -> analysis -> job matches |
| `/api/chat` | Streaming chat with resume context |

## Getting Started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

Copy the example file and add your Typhoon API key.

```bash
cp .env.example .env.local
```

Required values:

```bash
TYPHOON_API_KEY=
TYPHOON_BASE_URL=https://api.opentyphoon.ai/v1
LLM_MODEL_DEFAULT=typhoon-v2.5-30b-a3b-instruct
LLM_MODEL_DEEP=typhoon-v2.5-30b-a3b-instruct
LLM_MODEL_OCR=typhoon-ocr
```

Never commit `.env.local` or a real API key.

### 3. Run the development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Scripts

| Command | Description |
| --- | --- |
| `npm run dev` | Start the local development server |
| `npm run build` | Create a production build |
| `npm run start` | Start the production server |
| `npm run lint` | Run ESLint |

## Project Structure

```text
app/
  analyzer/
    page.jsx                 # Analyzer route
  api/
    analyze/route.ts          # Resume OCR, analysis, and job matching
    chat/route.ts             # Streaming resume chat
  components/
    ResumeAnalyzer.jsx        # Main studio/analyzer UI
    ResumeLokaLanding.jsx     # Landing page UI
  contexts/
    LanguageContext.tsx       # UI language state
  layout.tsx
  page.tsx

lib/
  i18n/
    translations.ts           # English/Thai UI copy
  llm/
    client.ts                 # Typhoon/OpenAI-compatible client
    config.ts                 # Environment and model routing
    json.ts                   # JSON parsing helpers
    prompts.ts                # OCR, analysis, jobs, and chat prompts
    throttle.ts               # OCR rate limiting
    types.ts                  # Shared LLM result types

docs/
  ResumeLoka-LLM-API-Spec.md  # LLM integration contract
  ResumeAnalyzer.jsx          # Original analyzer design reference
  ResumeLokaLanding.jsx       # Original landing design reference
```

## How Resume Analysis Works

1. The user uploads a PNG or JPG resume in the analyzer.
2. `/api/analyze` validates file type and size.
3. The file is converted to a base64 data URL and sent to the OCR model.
4. Extracted text is analyzed into a strict JSON result: score, profile, strengths, weaknesses, and recommendations.
5. A second structured call generates Thai-market job matches.
6. The analyzer renders the dashboard, analysis cards, and job links.
7. `/api/chat` streams grounded HR Specialist answers using the extracted profile and analysis context.

## API Notes

### `POST /api/analyze`

Accepts multipart form data with a `resume` file.

Supported input:

- `image/png`
- `image/jpeg`
- Max size: 20 MB

Returns:

```json
{
  "score": 82,
  "profile": {
    "name": "Candidate Name",
    "role": "Frontend Developer",
    "skills": ["React", "TypeScript"]
  },
  "analysis": {
    "advantages": [],
    "disadvantages": [],
    "recommendations": []
  },
  "jobs": []
}
```

### `POST /api/chat`

Accepts UI chat history plus the extracted profile and analysis. Returns a streaming `text/plain` response.

The assistant is prompted as a warm, professional female HR Specialist. Responses are constrained to normal plain text for readability inside the chat UI.

## Privacy And Security

- LLM API keys are read only on the server from environment variables.
- Resume files are sent to server-side API routes, not directly to the model provider from the browser.
- Raw uploaded files are not stored by the application code.
- The chat endpoint uses compact profile and analysis context rather than forwarding the raw resume text.
- LLM JSON output is treated as untrusted and validated before returning to the client.

## Development Notes

- This project uses the Next.js App Router.
- The analyzer currently supports image resumes only. PDF upload is rejected in the UI and API.
- The LLM layer is provider-oriented but OpenAI-compatible, so provider changes should stay mostly inside `lib/llm`.
- If Typhoon configuration is missing or unavailable, API routes return safe client-facing errors.

## Deployment

The app can be deployed to any platform that supports Next.js with Node.js API routes.

Before deployment, configure:

- `TYPHOON_API_KEY`
- `TYPHOON_BASE_URL`
- `LLM_MODEL_DEFAULT`
- `LLM_MODEL_DEEP`
- `LLM_MODEL_OCR`

Then build:

```bash
npm run build
```

## License

Private project. All rights reserved.
