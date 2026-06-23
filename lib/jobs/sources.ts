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
