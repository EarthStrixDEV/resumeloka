// Defensive parsing for untrusted LLM output (spec §6). Typhoon has no guaranteed
// JSON-schema mode, so we strip markdown fences, parse inside try/catch, and never
// forward raw model text as structured data.

/** Remove a leading/trailing ```json … ``` fence if the model added one anyway. */
export function stripFences(text: string): string {
  const t = text.trim();
  const fenced = /^```(?:json)?\s*([\s\S]*?)\s*```$/i.exec(t);
  if (fenced) return fenced[1].trim();
  return t;
}

/**
 * Parse model output as JSON. Tries the cleaned text first; if that fails, falls
 * back to the first balanced {...} or [...] slice (models sometimes add prose).
 * Throws if nothing parses.
 */
export function parseJson<T>(raw: string): T {
  const cleaned = stripFences(raw);
  try {
    return JSON.parse(cleaned) as T;
  } catch {
    const slice = extractFirstJson(cleaned);
    if (slice) return JSON.parse(slice) as T;
    throw new Error("LLM did not return valid JSON");
  }
}

function extractFirstJson(text: string): string | null {
  const start = text.search(/[[{]/);
  if (start === -1) return null;
  const open = text[start];
  const close = open === "{" ? "}" : "]";
  let depth = 0;
  let inStr = false;
  let escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inStr) {
      if (escaped) escaped = false;
      else if (ch === "\\") escaped = true;
      else if (ch === '"') inStr = false;
      continue;
    }
    if (ch === '"') inStr = true;
    else if (ch === open) depth++;
    else if (ch === close) {
      depth--;
      if (depth === 0) return text.slice(start, i + 1);
    }
  }
  return null;
}

/** Clamp a value into a 0–100 integer score. */
export function clampScore(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.max(0, Math.min(100, Math.round(n)));
}

export function asStringArray(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value.filter((v): v is string => typeof v === "string" && v.trim().length > 0);
}
