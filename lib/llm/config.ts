// Reads Typhoon config from the environment (spec §11) and routes tasks to model
// slugs (spec §7). Fails fast when the API key is missing — callers map this to a
// generic error so the key situation is never leaked to the client (spec §9).

import type { LLMTask } from "./types";

export class LLMConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "LLMConfigError";
  }
}

export interface LLMConfig {
  apiKey: string;
  baseURL: string;
  models: Record<LLMTask, string>;
}

let cached: LLMConfig | null = null;

export function getConfig(): LLMConfig {
  if (cached) return cached;

  const apiKey = process.env.TYPHOON_API_KEY;
  if (!apiKey) {
    throw new LLMConfigError("TYPHOON_API_KEY is not set");
  }

  cached = {
    apiKey,
    baseURL: process.env.TYPHOON_BASE_URL || "https://api.opentyphoon.ai/v1",
    models: {
      default: process.env.LLM_MODEL_DEFAULT || "typhoon-v2.5-30b-a3b-instruct",
      deep: process.env.LLM_MODEL_DEEP || "typhoon-v2.5-30b-a3b-instruct",
      ocr: process.env.LLM_MODEL_OCR || "typhoon-ocr",
    },
  };
  return cached;
}

export function modelForTask(task: LLMTask): string {
  return getConfig().models[task];
}
