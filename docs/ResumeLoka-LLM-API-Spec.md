# ResumeLoka — Back-end LLM API Specification (Typhoon)

**Scope:** Integration contract between the ResumeLoka back-end and **Typhoon / OpenTyphoon.ai** (SCB 10X, Thai-optimized LLM) for résumé analysis, "chat with résumé", and job-match scoring.
**Audience:** Back-end engineers.
**Status:** Draft v1.1 · Provider: **Typhoon only** · Last verified against provider docs: 2026-06-21

> Typhoon exposes an **OpenAI-compatible** `/chat/completions` interface. The back-end SHOULD implement a single internal `LLMClient` wrapping the OpenAI SDK with a custom `base_url` — no provider-specific protocol code needed.

---

## 1. Provider summary

| | Typhoon (OpenTyphoon.ai) |
|---|---|
| Vendor | SCB 10X |
| Base URL | `https://api.opentyphoon.ai/v1` |
| Primary endpoint | `POST /chat/completions` |
| Auth | `Authorization: Bearer <TYPHOON_API_KEY>` |
| OpenAI-compatible | Yes (drop-in) |
| Why Typhoon for ResumeLoka | Strong Thai-language résumé analysis & Thai chat; cost-effective; on-shore Thai context; OCR for résumé images/PDFs |
| Streaming (SSE) | Yes (`stream: true`) |
| Tool / function calling | Yes (model-dependent) |

---

## 2. Authentication

Bearer-token auth in the HTTP header.

```http
Authorization: Bearer <TYPHOON_API_KEY>
Content-Type: application/json
```

- The API key is created in the OpenTyphoon Playground → API Keys. It is shown **once** at creation — store it immediately in a secret manager.
- **Never** ship the key in the client (the `ResumeLoka` React app). All LLM calls go through the back-end only.
- Store as environment variable: `TYPHOON_API_KEY`.

---

## 3. Endpoint: Create Chat Completion

`POST https://api.opentyphoon.ai/v1/chat/completions`

### 3.1 Request body (OpenAI-compatible)

| Field | Type | Required | Notes |
|---|---|---|---|
| `model` | string | yes | Typhoon model slug — see §4. |
| `messages` | array | yes | Standard `{role, content}` objects. `role` ∈ `system` / `user` / `assistant`. |
| `max_tokens` | int | no | Max output tokens. Default 512 recommended; raise for OCR. |
| `temperature` | float | no | Sampling randomness. |
| `top_p` | float | no | Nucleus sampling. |
| `repetition_penalty` | float | no | Typhoon-recommended; reduces repetition. |
| `stream` | bool | no | `true` for SSE token streaming (used by "chat with résumé"). |
| `tools` | array | no | Function/tool definitions (model-dependent). |

### 3.2 Recommended parameters (from official Quick Start — tuned for Thai)

| Parameter | Value | Purpose |
|---|---|---|
| `temperature` | `0.6` | Balanced; lower (≈0.2) for factual extraction, higher (0.8+) for creative rewrite. |
| `max_tokens` | `512` | Adjust to expected answer length. |
| `top_p` | `0.95` | Alternative randomness control. |
| `repetition_penalty` | `1.05` | Raise to 1.1–1.2 if output repeats. |

> For Typhoon **OCR** (`typhoon-ocr-preview`) set `temperature` ≈ `0.1` and a high `max_tokens` (e.g. 16384) — OCR is a deterministic extraction task.

### 3.3 Example — Thai résumé analysis

```bash
curl --location 'https://api.opentyphoon.ai/v1/chat/completions' \
  --header 'Content-Type: application/json' \
  --header 'Authorization: Bearer <TYPHOON_API_KEY>' \
  --data '{
    "model": "typhoon-v2.1-12b-instruct",
    "messages": [
      { "role": "system", "content": "You are a recruiter-grade Thai résumé analyst. Answer in Thai." },
      { "role": "user", "content": "วิเคราะห์เรซูเม่นี้: ..." }
    ],
    "max_tokens": 512,
    "temperature": 0.6,
    "top_p": 0.95,
    "repetition_penalty": 1.05,
    "stream": false
  }'
```

### 3.4 Example — OpenAI SDK drop-in

```js
import OpenAI from "openai";

const client = new OpenAI({
  baseURL: "https://api.opentyphoon.ai/v1",
  apiKey: process.env.TYPHOON_API_KEY,
});

const res = await client.chat.completions.create({
  model: "typhoon-v2.1-12b-instruct",
  messages: [
    { role: "system", content: "You are a recruiter-grade Thai résumé analyst." },
    { role: "user", content: "Score this résumé and list 3 fixes: ..." },
  ],
  temperature: 0.6,
  max_tokens: 512,
});
```

### 3.5 Response (non-streaming, OpenAI schema)

```json
{
  "id": "cmpl-123",
  "object": "chat.completion",
  "created": 1694268190,
  "model": "typhoon-v2.1-12b-instruct",
  "choices": [
    {
      "index": 0,
      "message": { "role": "assistant", "content": "..." },
      "finish_reason": "stop"
    }
  ],
  "usage": { "prompt_tokens": 0, "completion_tokens": 0, "total_tokens": 0 }
}
```

- `choices` is **always an array** even for a single completion.
- Streaming responses replace `message` with `delta` and arrive as SSE `data:` lines, ending with `finish_reason: "stop"`.

---

## 4. Models (verified against docs.opentyphoon.ai)

| Model slug | Role in ResumeLoka |
|---|---|
| `typhoon-v2.5-30b-a3b-instruct` | Latest flagship, MoE — fast + agentic; use for complex Thai analysis / multi-step reasoning (Pro-tier deeper analysis). |
| `typhoon-v2.1-12b-instruct` | **Default** for high-quality Thai understanding & generation; main analysis + chat model. |
| `typhoon-ocr-preview` | Document parsing / OCR — extract text from résumé images & PDFs (Thai + English). |
| `typhoon-asr-realtime` | Speech-to-text (not in current ResumeLoka scope). |

- List available models programmatically: `GET https://api.opentyphoon.ai/v1/models`.
- Some Typhoon models (e.g. Typhoon Translate) are **not** offered via API and must be self-hosted from Hugging Face / Ollama.

---

## 5. Supporting endpoints

| Purpose | Endpoint |
|---|---|
| List models | `GET /v1/models` |
| Create chat completion | `POST /v1/chat/completions` |
| OCR (document → text) | `POST /v1/chat/completions` with `typhoon-ocr-preview` + image input |

**Typhoon OCR via chat/completions** (image as base64 data URL):

```python
from openai import OpenAI
client = OpenAI(base_url="https://api.opentyphoon.ai/v1", api_key="<TYPHOON_API_KEY>")
resp = client.chat.completions.create(
    model="typhoon-ocr-preview",
    messages=[{
        "role": "user",
        "content": [
            {"type": "text", "text": "<OCR prompt>"},
            {"type": "image_url", "image_url": {"url": "data:image/png;base64,<...>"}},
        ],
    }],
    max_tokens=16384,
    temperature=0.1,
)
```

---

## 6. Structured output (for the analysis JSON ResumeLoka renders)

ResumeLoka's Analysis tab needs strict JSON (`advantages` / `disadvantages` / `recommendations` + score).

Typhoon does not guarantee a `response_format` JSON-schema mode, so **enforce JSON via the system prompt**:

- Be explicit: *"Return ONLY valid JSON. No markdown fences, no preamble, no trailing text."*
- Parse defensively: strip ```` ```json ```` fences, then `JSON.parse` inside try/catch.
- Set `temperature` low (≈0.2) for the structured-analysis call to reduce format drift.

**Internal contract — the shape the back-end must return to the front-end** (matches `ANALYSIS` + `SCORE` in `ResumeAnalyzer.jsx`):

```json
{
  "score": 82,
  "advantages": ["...", "..."],
  "disadvantages": ["...", "..."],
  "recommendations": ["...", "..."]
}
```

> The LLM output is **untrusted**. Validate against this schema before returning to the client; never forward raw model text as structured data.

---

## 7. Task routing (within Typhoon)

```
if task == "ocr":                      model = "typhoon-ocr-preview"      # temp 0.1, max_tokens 16384
elif task == "deep_analysis" (Pro):    model = "typhoon-v2.5-30b-a3b-instruct"
else:                                  model = "typhoon-v2.1-12b-instruct"  # default analysis + chat
```

- Keep slug strings in config (§10), not hardcoded across the codebase.
- Single provider → no cross-provider fallback. On `5xx`, retry with backoff (§9); if persistent, surface a clean "service unavailable" to the user.

---

## 8. Rate limits (current published limits)

| Model | Requests / second | Requests / minute |
|---|---|---|
| `typhoon-v2.5-30b-a3b-instruct` | 5 | 200 |
| `typhoon-v2.1-12b-instruct` | 5 | 200 |
| `typhoon-ocr` | 2 | 20 |
| `typhoon-asr-realtime` | n/a | 100 |

- Exceeding limits returns **`429 Too Many Requests`**.
- For production volume, Typhoon recommends routing through their infrastructure partner (Together AI / "API Pro"); higher POC limits by request to `contact@opentyphoon.ai`.

### Required client behavior
- **Exponential backoff with jitter** on `429` (e.g. `2^retries + random()` seconds, max 5 retries).
- **Queue / throttle** outbound calls to stay under RPS/RPM — especially OCR at **2 RPS**.
- **Cache** identical requests (hash of `model + messages + params`) to cut redundant calls — useful when a user re-runs analysis without editing.

---

## 9. Error handling

| HTTP | Meaning | Back-end action |
|---|---|---|
| `400` | Bad request (malformed body / bad params) | Log + fix payload; do not retry blindly. |
| `401` | Invalid / missing API key | Fail fast; alert ops — key issue. |
| `429` | Rate limited | Exponential backoff + jitter. |
| `5xx` | Provider error | Retry with backoff (max ~3); then surface "service unavailable". |

**Typhoon `429` error shape:**

```json
{
  "error": {
    "message": "Rate limit exceeded. Please retry after ...",
    "type": "rate_limit_error",
    "param": null,
    "code": "rate_limit_exceeded"
  }
}
```

General rules:
- Set a request **timeout** (e.g. 30–60s; OCR may need longer).
- Wrap every call in try/catch; for streaming, also handle mid-stream disconnects.
- Never leak raw provider errors or the API key to the front-end.

---

## 10. Privacy & data handling

- Résumé content is **PII**. Send only what's needed for the task; strip unnecessary identifiers where possible.
- Typhoon API requests go to SCB 10X / their partner infra — review their data policy before sending production résumés.
- Align with ResumeLoka's promise to users ("analyzed only to generate results, not sold"): document that Typhoon processes résumé data, and honor file-removal requests.

---

## 11. Environment variables (back-end)

```bash
TYPHOON_API_KEY=...
TYPHOON_BASE_URL=https://api.opentyphoon.ai/v1

# Model routing defaults
LLM_MODEL_DEFAULT=typhoon-v2.1-12b-instruct
LLM_MODEL_DEEP=typhoon-v2.5-30b-a3b-instruct
LLM_MODEL_OCR=typhoon-ocr-preview
```

---

## 12. Open questions (need confirmation before build)

1. **OCR pipeline** — résumé images/PDFs: use Typhoon `typhoon-ocr-preview` directly, or extract text first then send to a text model?
2. **Pro-tier model** — confirm `typhoon-v2.5-30b-a3b-instruct` for the "Pro" deeper-analysis path, or keep everything on `typhoon-v2.1-12b-instruct`?
3. **Production volume** — do we need the Together AI / "API Pro" partner route now, or are the standard limits (5 RPS) enough for launch?

---

*Sources: OpenTyphoon.ai docs — Quick Start, Models, Rate Limits, API Reference (docs.opentyphoon.ai). Verify pricing & model availability on the live dashboard before production cutover, as these change frequently.*
