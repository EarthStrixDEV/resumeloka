// Shared types for the Typhoon LLM layer.
// The Profile/Analysis/Job shapes mirror exactly what ResumeAnalyzer.jsx renders.

export type LLMTask = "default" | "deep" | "ocr";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface ResumeExperience {
  role: string;
  org: string;
  period: string;
}

export interface ResumeEducation {
  degree: string;
  org: string;
  period: string;
}

export interface ResumeProfile {
  name: string;
  role: string;
  location: string;
  email: string;
  phone: string;
  github: string;
  years: number;
  summaryMissing: boolean;
  skills: string[];
  experience: ResumeExperience[];
  education: ResumeEducation;
}

export interface ResumeAnalysis {
  advantages: string[];
  disadvantages: string[];
  recommendations: string[];
}

/** Analyze block produced in both languages so the UI can swap with no refetch. */
export interface BilingualAnalysis {
  en: ResumeAnalysis;
  th: ResumeAnalysis;
}

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

/** Combined payload returned by POST /api/analyze. */
export interface AnalyzeResult {
  score: number;
  profile: ResumeProfile;
  analysis: BilingualAnalysis;
  jobs: JobMatch[];
}

/** Shape the LLM is asked to return for the analysis call (no jobs yet). */
export interface AnalysisLLMResult {
  score: number;
  profile: ResumeProfile;
  analysis: BilingualAnalysis;
}
