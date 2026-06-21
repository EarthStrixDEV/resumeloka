// LLMClient — a thin wrapper over the OpenAI SDK pointed at Typhoon (spec §3.4).
// Owns model routing (§7), retry/backoff with jitter (§8/§9), per-call timeouts,
// OCR throttling, and JSON validation of untrusted output (§6). The provider's own
// retries are disabled (maxRetries:0) so we control the backoff policy here.

import OpenAI from "openai";
import { getConfig, LLMConfigError, modelForTask } from "./config";
import { parseJson } from "./json";
import { OCR_PROMPT } from "./prompts";
import { throttleOcr } from "./throttle";
import type { ChatMessage, LLMTask } from "./types";

/** Error carrying the HTTP status + safe message to return to the client (never leaks the key or raw provider text). */
export class LLMError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.name = "LLMError";
    this.status = status;
  }
}

let openaiSingleton: OpenAI | null = null;

function client(): OpenAI {
  if (openaiSingleton) return openaiSingleton;
  const config = getConfig(); // throws LLMConfigError if key missing
  openaiSingleton = new OpenAI({
    apiKey: config.apiKey,
    baseURL: config.baseURL,
    maxRetries: 0,
  });
  return openaiSingleton;
}

function statusOf(err: unknown): number | undefined {
  if (err instanceof OpenAI.APIError) return err.status;
  if (typeof err === "object" && err !== null && "status" in err) {
    const s = (err as { status?: unknown }).status;
    if (typeof s === "number") return s;
  }
  return undefined;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Retry 429 up to 5x and 5xx up to 3x with exponential backoff + jitter; never retry 4xx (except 429). */
async function withRetry<T>(fn: () => Promise<T>): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const status = statusOf(err);
      const max = status === 429 ? 5 : status !== undefined && status >= 500 ? 3 : 0;
      if (attempt >= max) break;
      const delay = Math.min(8000, 500 * 2 ** attempt) + Math.random() * 400;
      await sleep(delay);
    }
  }
  throw lastErr;
}

/** Map any thrown error into a client-safe LLMError (spec §9). */
export function toLLMError(err: unknown): LLMError {
  if (err instanceof LLMError) return err;
  if (err instanceof LLMConfigError) {
    // Key/config problem — fail fast, generic message to the user.
    return new LLMError("AI service is not configured. Please try again later.", 503);
  }
  const status = statusOf(err);
  if (status === 400) return new LLMError("The request to the AI service was invalid.", 502);
  if (status === 401) return new LLMError("AI service is not configured. Please try again later.", 503);
  if (status === 429) return new LLMError("The AI service is busy right now. Please try again in a moment.", 429);
  return new LLMError("AI service is temporarily unavailable. Please try again.", 502);
}

interface CompleteOptions {
  task: LLMTask;
  messages: ChatMessage[];
  temperature?: number;
  maxTokens?: number;
  topP?: number;
  repetitionPenalty?: number;
  timeoutMs?: number;
}

type CreateParams = OpenAI.Chat.Completions.ChatCompletionCreateParamsNonStreaming;
type Chunk = OpenAI.Chat.Completions.ChatCompletionChunk;

/** Non-streaming completion → assistant text. */
export async function complete(opts: CompleteOptions): Promise<string> {
  const body = {
    model: modelForTask(opts.task),
    messages: opts.messages,
    temperature: opts.temperature ?? 0.6,
    max_tokens: opts.maxTokens ?? 512,
    top_p: opts.topP ?? 0.95,
    repetition_penalty: opts.repetitionPenalty ?? 1.05,
    stream: false,
  } as unknown as CreateParams;

  const res = await withRetry(() =>
    client().chat.completions.create(body, { timeout: opts.timeoutMs ?? 60000 }),
  );
  return res.choices?.[0]?.message?.content ?? "";
}

/**
 * Completion that must yield JSON validated by `validate`. Retries once with a
 * stricter reminder if parsing/validation fails, then gives up with a 502 (spec §6).
 */
export async function completeJson<T>(
  opts: CompleteOptions,
  validate: (parsed: unknown) => T,
): Promise<T> {
  let messages = opts.messages;
  for (let attempt = 0; attempt < 2; attempt++) {
    const text = await complete({ ...opts, messages });
    try {
      return validate(parseJson<unknown>(text));
    } catch {
      if (attempt === 1) break;
      messages = [
        ...opts.messages,
        {
          role: "user",
          content:
            "Your previous reply was not valid JSON in the required shape. Reply again with ONLY the valid JSON, nothing else.",
        },
      ];
    }
  }
  throw new LLMError("The AI service returned an unreadable result. Please try again.", 502);
}

/** OCR a résumé image/PDF supplied as a base64 data URL (spec §5). Throttled to stay under the OCR rate limit. */
export async function ocr(dataUrl: string): Promise<string> {
  const body = {
    model: modelForTask("ocr"),
    messages: [
      {
        role: "user",
        content: [
          { type: "text", text: OCR_PROMPT },
          { type: "image_url", image_url: { url: dataUrl } },
        ],
      },
    ],
    max_tokens: 16384,
    temperature: 0.1,
  } as unknown as CreateParams;

  const res = await throttleOcr(() =>
    withRetry(() => client().chat.completions.create(body, { timeout: 90000 })),
  );
  return res.choices?.[0]?.message?.content ?? "";
}

/** Streaming chat — yields text deltas as they arrive (spec §3.5). */
export async function* streamChat(opts: CompleteOptions): AsyncGenerator<string> {
  const body = {
    model: modelForTask(opts.task),
    messages: opts.messages,
    temperature: opts.temperature ?? 0.6,
    top_p: opts.topP ?? 0.95,
    repetition_penalty: opts.repetitionPenalty ?? 1.05,
    stream: true,
  } as unknown as OpenAI.Chat.Completions.ChatCompletionCreateParamsStreaming;

  const stream = await withRetry(() =>
    client().chat.completions.create(body, { timeout: 60000 }),
  );

  for await (const chunk of stream as AsyncIterable<Chunk>) {
    const delta = chunk.choices?.[0]?.delta?.content;
    if (delta) yield delta;
  }
}
