// POST /api/analyze — multipart résumé upload → OCR → analysis → job matching,
// returned as one combined JSON (spec §5, §6, §7, §9). All LLM work stays server-side
// so the résumé (PII, §10) and the API key never reach the client.

import { asStringArray, clampScore } from "@/lib/llm/json";
import { completeJson, ocr, toLLMError } from "@/lib/llm/client";
import { analysisSystemPrompt, jobsRankPrompt, jobsSystemPrompt } from "@/lib/llm/prompts";
import { searchAllSources, type RawListing } from "@/lib/jobs/sources";
import type {
  AnalysisLLMResult,
  AnalyzeResult,
  JobMatch,
  ResumeAnalysis,
  ResumeProfile,
} from "@/lib/llm/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ALLOWED_TYPES = new Set(["image/png", "image/jpeg"]);
const MAX_BYTES = 20 * 1024 * 1024; // 20 MB — stitched multi-page images can be larger

export async function POST(request: Request) {
  try {
    const form = await request.formData();
    const file = form.get("resume");

    if (!(file instanceof File)) {
      return Response.json({ error: "No résumé file uploaded." }, { status: 400 });
    }
    if (!ALLOWED_TYPES.has(file.type)) {
      return Response.json(
        { error: "Unsupported file type. Please upload a PNG or JPG image." },
        { status: 415 },
      );
    }
    if (file.size > MAX_BYTES) {
      return Response.json({ error: "File is too large (max 20 MB)." }, { status: 413 });
    }

    // File → base64 data URL for the OCR model.
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUrl = `data:${file.type};base64,${buffer.toString("base64")}`;

    const text = (await ocr(dataUrl)).trim();
    if (text.length < 40) {
      return Response.json(
        { error: "Could not read enough text from this file. Is it a résumé?" },
        { status: 422 },
      );
    }

    // Analysis + profile extraction (strict JSON, low temperature).
    const analysis = await completeJson<AnalysisLLMResult>(
      {
        task: "default",
        temperature: 0.2,
        maxTokens: 2600,
        messages: [
          { role: "system", content: analysisSystemPrompt() },
          { role: "user", content: `Analyze this résumé:\n\n${text}` },
        ],
      },
      validateAnalysis,
    );

    // Real listings → LLM ranking; fall back to LLM-imagined jobs if none fetched.
    const queries = buildJobQueries(analysis.profile);
    const listings = await searchAllSources(queries, 6);
    const capped = listings.slice(0, 12);

    let jobs: JobMatch[] = [];
    if (capped.length > 0) {
      try {
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
      } catch {
        // Ranking failed (empty/invalid LLM output) — leave jobs empty so the
        // fallback generation below runs instead of failing the whole request.
        jobs = [];
      }
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

    const result: AnalyzeResult = {
      score: analysis.score,
      profile: analysis.profile,
      analysis: analysis.analysis,
      jobs,
    };
    return Response.json(result, { status: 200 });
  } catch (err) {
    const e = toLLMError(err);
    return Response.json({ error: e.message }, { status: e.status });
  }
}

/* --------------------------- output validation --------------------------- */

function str(v: unknown): string {
  return typeof v === "string" ? v : "";
}

function num(v: unknown): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function obj(v: unknown): Record<string, unknown> {
  return typeof v === "object" && v !== null ? (v as Record<string, unknown>) : {};
}

function validateProfile(v: unknown): ResumeProfile {
  const p = obj(v);
  const experience = Array.isArray(p.experience) ? p.experience : [];
  const education = obj(p.education);
  return {
    name: str(p.name),
    role: str(p.role),
    location: str(p.location),
    email: str(p.email),
    phone: str(p.phone),
    github: str(p.github),
    years: Math.max(0, Math.round(num(p.years))),
    summaryMissing: Boolean(p.summaryMissing),
    skills: asStringArray(p.skills),
    experience: experience.map((e) => {
      const o = obj(e);
      return { role: str(o.role), org: str(o.org), period: str(o.period) };
    }),
    education: {
      degree: str(education.degree),
      org: str(education.org),
      period: str(education.period),
    },
  };
}

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

function validateJobs(v: unknown): JobMatch[] {
  const arr = Array.isArray(v) ? v : [];
  const jobs = arr
    .map((j) => {
      const o = obj(j);
      const title = str(o.title);
      return {
        title,
        company: str(o.company),
        area: str(o.area),
        salary: str(o.salary),
        match: clampScore(o.match),
        tags: asStringArray(o.tags),
        query: str(o.query) || title,
        url: "",
        source: "" as const,
      };
    })
    .filter((j) => j.title.length > 0);
  if (jobs.length === 0) throw new Error("No jobs returned");
  return jobs;
}

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
  const seen = new Set<number>();
  const picks = arr
    .map((p) => {
      const o = obj(p);
      return {
        id: Math.round(num(o.id)),
        match: clampScore(o.match),
        tags: asStringArray(o.tags),
      };
    })
    .filter((p) => {
      if (!Number.isInteger(p.id) || p.id < 0 || seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  if (picks.length === 0) throw new Error("No ranked picks returned");
  return picks;
}
