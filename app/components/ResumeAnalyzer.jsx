"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Upload, Image as ImageIcon, X, Sparkles, LayoutDashboard,
  ClipboardCheck, Briefcase, Send, ThumbsUp, AlertTriangle, Lightbulb,
  MapPin, Wallet, ArrowUpRight, RotateCcw, Check, Bot, Mail, Phone,
  GraduationCap, GitBranch
} from "lucide-react";
import { useLanguage } from "@/app/contexts/LanguageContext";
import { translations } from "@/lib/i18n/translations";

/* ------------------------- job board deep-links ------------------------ */

const jobThai = (q) => `https://www.jobthai.com/en/jobs?keyword=${encodeURIComponent(q)}`;
const jobsDB = (q) => `https://th.jobsdb.com/th/jobs?keywords=${encodeURIComponent(q)}`;

function toReadablePlainText(text) {
  return text
    .replace(/```[a-z]*\n?/gi, "")
    .replace(/```/g, "")
    .replace(/^\s{0,3}#{1,6}\s+/gm, "")
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/__(.*?)__/g, "$1")
    .replace(/`([^`]+)`/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    .replace(/^\s*[-*•]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .trim();
}

function AnimatedStatusIcon({ kind = "loading", size = 18 }) {
  const icons = {
    loading: <Sparkles size={size} strokeWidth={2.4} />,
    uploading: <Upload size={size} strokeWidth={2.4} />,
    processing: <Bot size={size} strokeWidth={2.4} />,
  };

  return (
    <span className={"motion-icon motion-icon--" + kind} aria-hidden="true">
      {icons[kind] || icons.loading}
      <span className="motion-icon-ring" />
    </span>
  );
}

/* ------------------- client-side multi-page stitching ----------------- */

async function stitchPages(fileList) {
  if (fileList.length === 1) return fileList[0];

  const GAP = 24; // white gap between pages (px)

  const images = await Promise.all(
    fileList.map(
      (f) =>
        new Promise((resolve, reject) => {
          const img = new Image();
          const u = URL.createObjectURL(f);
          img.onload = () => { resolve(img); URL.revokeObjectURL(u); };
          img.onerror = () => { reject(new Error("Image load failed")); URL.revokeObjectURL(u); };
          img.src = u;
        })
    )
  );

  const maxW = Math.max(...images.map((img) => img.naturalWidth));
  const slots = images.map((img) => {
    const scale = maxW / img.naturalWidth;
    return { img, drawH: Math.round(img.naturalHeight * scale) };
  });
  const totalH = slots.reduce((s, { drawH }) => s + drawH, 0) + GAP * (images.length - 1);

  const canvas = document.createElement("canvas");
  canvas.width = maxW;
  canvas.height = totalH;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, maxW, totalH);

  let y = 0;
  for (const { img, drawH } of slots) {
    ctx.drawImage(img, 0, y, maxW, drawH);
    y += drawH + GAP;
  }

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) resolve(new File([blob], "resume-stitched.png", { type: "image/png" }));
        else reject(new Error("Canvas export failed"));
      },
      "image/png"
    );
  });
}

/* ------------------------------ component ----------------------------- */

export default function ResumeAnalyzer() {
  const { lang, setLang, t } = useLanguage();

  const [stage, setStage] = useState("empty"); // empty | analyzing | ready | error
  const [tab, setTab] = useState("dashboard");
  const [files, setFiles] = useState([]); // [{ name, type }]
  const [previewUrls, setPreviewUrls] = useState([]); // object URLs per page
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState(null);

  const [profile, setProfile] = useState(null);
  const [score, setScore] = useState(0);
  const [analysis, setAnalysis] = useState(null);
  const [jobs, setJobs] = useState([]);

  const [messages, setMessages] = useState([{ from: "bot", text: "" }]);
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const chatEndRef = useRef(null);
  const fileInputRef = useRef(null);

  // Sync greeting text when lang changes (only if conversation is still just the greeting)
  useEffect(() => {
    setMessages((prev) => {
      if (prev.length === 1 && prev[0].from === "bot") {
        return [{ from: "bot", text: translations[lang].greeting }];
      }
      return prev;
    });
  }, [lang]);

  useEffect(() => {
    const links = [
      "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap",
    ];
    const els = links.map((href) => {
      const l = document.createElement("link");
      l.rel = "stylesheet";
      l.href = href;
      document.head.appendChild(l);
      return l;
    });
    return () => els.forEach((l) => l.remove());
  }, []);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages]);

  async function startAnalyze(fileList) {
    if (!fileList || fileList.length === 0) return;

    const hasPdf = fileList.some(
      (f) => f.type === "application/pdf" || f.name?.toLowerCase().endsWith(".pdf")
    );
    if (hasPdf) {
      setError(t("analyzerPdfMixError"));
      return;
    }

    const urls = fileList.map((f) => URL.createObjectURL(f));
    setPreviewUrls(urls);
    setFiles(fileList.map((f) => ({ name: f.name || "resume", type: "img" })));
    setError(null);
    setTab("dashboard");
    setStage("analyzing");

    try {
      // Stitch all pages into one image client-side so the OCR model sees a
      // single continuous document — avoids JSON parse failures from page separators.
      const stitched = await stitchPages(fileList);
      const fd = new FormData();
      fd.append("resume", stitched);
      const res = await fetch("/api/analyze", { method: "POST", body: fd });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Analysis failed. Please try again.");
      }
      const data = await res.json();
      setProfile(data.profile);
      setScore(data.score);
      setAnalysis(data.analysis);
      setJobs(Array.isArray(data.jobs) ? data.jobs : []);
      setMessages([{ from: "bot", text: translations[lang].greeting }]);
      setStage("ready");
    } catch (e) {
      console.log("AI Issue: ", e);
      setError(e.message || "Something went wrong.");
      setStage("error");
    }
  }

  function reset() {
    previewUrls.forEach((u) => URL.revokeObjectURL(u));
    setStage("empty");
    setFiles([]);
    setPreviewUrls([]);
    setError(null);
    setProfile(null);
    setScore(0);
    setAnalysis(null);
    setJobs([]);
    setMessages([{ from: "bot", text: translations[lang].greeting }]);
  }

  async function send() {
    const text = draft.trim();
    if (!text || sending) return;

    const history = [...messages, { from: "me", text }];
    setMessages([...history, { from: "bot", text: "" }]);
    setDraft("");
    setSending(true);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history, profile, analysis: analysis?.[lang] ?? null }),
      });
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Chat failed. Please try again.");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((m) => {
          const next = m.slice();
          next[next.length - 1] = { from: "bot", text: toReadablePlainText(acc) };
          return next;
        });
      }
    } catch (e) {
      setMessages((m) => {
        const next = m.slice();
        next[next.length - 1] = {
          from: "bot",
          text: t("chatError") + (e.message || t("chatErrorFallback")),
        };
        return next;
      });
    } finally {
      setSending(false);
    }
  }

  const CHAT_SUGGESTIONS = [
    t("chatSugg1"), t("chatSugg2"), t("chatSugg3"),
    t("chatSugg4"), t("chatSugg5"), t("chatSugg6"),
  ];

  const toggleLang = () => setLang(lang === "en" ? "th" : "en");

  return (
    <div className="ria">
      <style>{CSS}</style>

      {/* top bar */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark" style={{ background: "none" }}>
            <img src="/logo.png" alt="ResumeLoka Logo" style={{ width: "100%", height: "100%", borderRadius: "8px", objectFit: "cover" }} />
          </span>
          <span className="brand-name">Resume<b>Loka</b></span>
          <span className="brand-tag">{t("analyzerTagline")}</span>
        </div>
        <div className="top-right">
          <button className="lang-toggle" onClick={toggleLang} aria-label="Switch language">
            <span className={lang === "en" ? "lang-active" : ""}>EN</span>
            <span className="lang-sep">|</span>
            <span className={lang === "th" ? "lang-active" : ""}>TH</span>
          </button>
          {files.length > 0 && (
            <span className="file-chip">
              {previewUrls[0]
                ? <img src={previewUrls[0]} alt="" className="chip-thumb" />
                : <ImageIcon size={14} />
              }
              <span className="chip-label">
                {files.length === 1
                  ? files[0].name
                  : `${files.length} ${t("analyzerPages")}`}
              </span>
              {files.length > 1 && <span className="chip-count">{files.length}</span>}
              <button className="chip-x" onClick={reset} aria-label="Remove file"><X size={13} /></button>
            </span>
          )}
          {stage === "ready" && (
            <button className="btn btn-ghost" onClick={reset}>
              <RotateCcw size={15} /> {t("analyzerNewResume")}
            </button>
          )}
        </div>
      </header>

      {/* empty state */}
      {stage === "empty" && (
        <main className="stage-empty">
          <div className="empty-inner">
            <p className="eyebrow">{t("analyzerStep")}</p>
            <h1 className="empty-title">{t("analyzerTitle")}</h1>
            <p className="empty-sub">{t("analyzerSub")}</p>

            <label
              className={"dropzone" + (drag ? " is-drag" : "")}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => {
                e.preventDefault();
                setDrag(false);
                const fs = e.dataTransfer.files;
                if (fs?.length) startAnalyze(Array.from(fs));
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".png,.jpg,.jpeg,image/png,image/jpeg"
                multiple
                hidden
                onChange={(e) => {
                  const fs = e.target.files;
                  if (fs?.length) startAnalyze(Array.from(fs));
                  e.target.value = "";
                }}
              />
              <span className="dz-icon dz-icon--animated">
                <AnimatedStatusIcon kind={drag ? "uploading" : "loading"} size={26} />
              </span>
              <span className="dz-main">{t("analyzerDropzone")}</span>
              <span className="dz-or">
                {lang === "en"
                  ? <>or <b>browse files</b></>
                  : <>หรือ <b>เลือกไฟล์</b></>}
              </span>
              <span className="dz-types">
                <span className="type-pill"><ImageIcon size={13} /> PNG · JPG</span>
                <span className="type-pill type-pill--multi">+ {t("analyzerMultiHint")}</span>
              </span>
            </label>

            <button
              className="btn btn-primary btn-lg demo-cta"
              onClick={() => fileInputRef.current?.click()}
            >
              <AnimatedStatusIcon kind="uploading" size={16} /> {t("analyzerChooseFile")}
            </button>
          </div>
        </main>
      )}

      {/* analyzing state */}
      {stage === "analyzing" && (
        <main className="stage-analyze">
          <div className="status-flow" aria-label="Resume processing status">
            <span className="status-chip">
              <AnimatedStatusIcon kind="uploading" size={16} /> {t("analyzingUploading")}
            </span>
            <span className="status-chip">
              <AnimatedStatusIcon kind="loading" size={16} /> {t("analyzingReading")}
            </span>
            <span className="status-chip">
              <AnimatedStatusIcon kind="processing" size={16} /> {t("analyzingProcessing")}
            </span>
          </div>
          <div className={"scan-doc" + (previewUrls.length > 0 ? " has-img" : "")}>
            <div className="scan-line" />
            {previewUrls.length > 0 ? (
              <>
                <img src={previewUrls[0]} alt="Resume preview" className="scan-img" />
                {previewUrls.length > 1 && (
                  <span className="scan-page-badge">
                    1 / {previewUrls.length}
                  </span>
                )}
              </>
            ) : (
              <>
                {[88, 60, 74, 46, 80, 54, 68].map((w, i) => (
                  <span key={i} className="scan-row" style={{ width: w + "%" }} />
                ))}
                <span className="scan-row short" />
              </>
            )}
          </div>
          <p className="analyze-text"><AnimatedStatusIcon kind="processing" size={16} /> {t("analyzingText")}</p>
        </main>
      )}

      {/* error state */}
      {stage === "error" && (
        <main className="stage-empty">
          <div className="empty-inner">
            <p className="eyebrow">{t("analyzerErrorEyebrow")}</p>
            <h1 className="empty-title">{t("analyzerErrorTitle")}</h1>
            <p className="empty-sub">{error}</p>
            <button className="btn btn-primary btn-lg" onClick={reset}>
              <RotateCcw size={16} /> {t("analyzerTryAgain")}
            </button>
          </div>
        </main>
      )}

      {/* ready state */}
      {stage === "ready" && (
        <main className="stage-ready">
          {/* main column */}
          <section className="main-col">
            <nav className="tabs" role="tablist">
              <Tab id="dashboard" cur={tab} set={setTab} icon={<LayoutDashboard size={16} />} label={t("tabDashboard")} />
              <Tab id="analysis" cur={tab} set={setTab} icon={<ClipboardCheck size={16} />} label={t("tabAnalysis")} />
              <Tab id="jobs" cur={tab} set={setTab} icon={<Briefcase size={16} />} label={t("tabJobs")} />
              <Tab id="resume" cur={tab} set={setTab} icon={<ImageIcon size={16} />} label={t("tabResume")} />
            </nav>

            <div className="tab-body">
              {tab === "dashboard" && <Dashboard profile={profile} score={score} />}
              {tab === "analysis" && <Analysis analysis={analysis} />}
              {tab === "jobs" && <Jobs jobs={jobs} />}
              {tab === "resume" && <ResumePreview urls={previewUrls} fileNames={files.map((f) => f.name)} />}
            </div>
          </section>

          {/* chat column */}
          <aside className="chat-col">
            <div className="chat-head">
              <span className="chat-doc">
                <ImageIcon size={15} />
                <span>
                  {files.length === 1
                    ? files[0].name
                    : `${files.length} ${t("analyzerPages")}`}
                </span>
              </span>
              <span className="chat-title">{t("chatTitle")}</span>
            </div>

            <div className="chat-scroll">
              {messages.map((m, i) => (
                <div key={i} className={"bubble " + (m.from === "me" ? "me" : "bot")}>
                  {m.from === "bot" && (
                    <span className="bot-ava">
                      {m.text ? <Bot size={14} /> : <AnimatedStatusIcon kind="loading" size={14} />}
                    </span>
                  )}
                  <p>
                    {m.text || (
                      <span className="typing-text">
                        <AnimatedStatusIcon kind="processing" size={14} /> {t("chatThinking")}
                      </span>
                    )}
                  </p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-suggest">
              {CHAT_SUGGESTIONS.map((s) => (
                <button key={s} className="suggest" onClick={() => { setDraft(s); }}>{s}</button>
              ))}
            </div>

            <div className="chat-input">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder={sending ? t("chatPlaceholderSending") : t("chatPlaceholder")}
                disabled={sending}
              />
              <button className="send" onClick={send} aria-label="Send" disabled={sending}>
                {sending ? <AnimatedStatusIcon kind="loading" size={16} /> : <Send size={16} />}
              </button>
            </div>
          </aside>
        </main>
      )}
    </div>
  );
}

/* ------------------------------ subviews ------------------------------ */

function Tab({ id, cur, set, icon, label }) {
  return (
    <button
      role="tab"
      aria-selected={cur === id}
      className={"tab" + (cur === id ? " active" : "")}
      onClick={() => set(id)}
    >
      {icon}{label}
    </button>
  );
}

function Dashboard({ profile, score }) {
  const { t } = useLanguage();
  if (!profile) return null;
  return (
    <div className="grid-dash fade-up">
      <div className="card score-card">
        <ScoreRing value={score} />
        <div className="score-meta">
          <p className="score-label">{t("scoreLabel")}</p>
          <h3 className="score-head">{t("scoreHead")}</h3>
          <p className="score-note">{t("scoreNote")}</p>
        </div>
      </div>

      <div className="card profile-card">
        <div className="profile-head">
          <span className="avatar">{profile.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
          <div>
            <h3 className="p-name">{profile.name}</h3>
            <p className="p-role">{profile.role} · {profile.years} {t("yearsLabel")}</p>
          </div>
        </div>
        <ul className="p-contact">
          <li><MapPin size={14} /> {profile.location}</li>
          <li><Mail size={14} /> {profile.email}</li>
          <li><Phone size={14} /> {profile.phone}</li>
          <li><GitBranch size={14} /> {profile.github}</li>
        </ul>
      </div>

      <div className="card skills-card">
        <p className="card-label">{t("skillsDetected")}</p>
        <div className="tags">
          {profile.skills.map((s) => <span key={s} className="tag">{s}</span>)}
        </div>
      </div>

      <div className="card xp-card">
        <p className="card-label">{t("experienceLabel")}</p>
        <ul className="timeline">
          {profile.experience.map((e, i) => (
            <li key={i}>
              <span className="dot" />
              <div>
                <p className="t-role">{e.role}</p>
                <p className="t-meta">{e.org} · <span className="mono">{e.period}</span></p>
              </div>
            </li>
          ))}
        </ul>
        <p className="card-label edu-label"><GraduationCap size={14} /> {t("educationLabel")}</p>
        <p className="t-role">{profile.education.degree}</p>
        <p className="t-meta">{profile.education.org} · <span className="mono">{profile.education.period}</span></p>
      </div>
    </div>
  );
}

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

function Jobs({ jobs }) {
  const { t } = useLanguage();
  if (!jobs || jobs.length === 0) {
    return (
      <div className="jobs-wrap fade-up">
        <p className="jobs-intro">
          <Briefcase size={15} /> {t("noJobsYet")}
        </p>
      </div>
    );
  }
  return (
    <div className="jobs-wrap fade-up">
      <p className="jobs-intro">
        <Briefcase size={15} /> {t("jobsIntro")}
      </p>
      <div className="grid-jobs">
        {jobs.map((j) => (
          <article key={j.title} className="card job-card">
            <div className="job-top">
              <div>
                <h3 className="job-title">{j.title}</h3>
                <p className="job-company">{j.company}</p>
              </div>
              <span className="match-badge">
                <span className="mono match-num">{j.match}%</span>
                <span className="match-word">{t("matchWord")}</span>
              </span>
            </div>
            <div className="job-meta">
              <span><MapPin size={13} /> {j.area}</span>
              <span><Wallet size={13} /> {j.salary} THB</span>
            </div>
            <div className="tags small">
              {j.tags.map((tag) => <span key={tag} className="tag">{tag}</span>)}
            </div>
            <div className="job-actions">
              <a className="btn btn-jobthai" href={jobThai(j.query || j.title)} target="_blank" rel="noreferrer">
                JobThai <ArrowUpRight size={14} />
              </a>
              <a className="btn btn-jobsdb" href={jobsDB(j.query || j.title)} target="_blank" rel="noreferrer">
                JobsDB <ArrowUpRight size={14} />
              </a>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}

function ResumePreview({ urls, fileNames }) {
  const { lang, t } = useLanguage();
  if (!urls || urls.length === 0) return null;
  const isMulti = urls.length > 1;
  return (
    <div className="resume-preview-wrap fade-up">
      {urls.map((url, i) => (
        <div key={i} className="card resume-preview-card">
          <p className="card-label">
            <ImageIcon size={14} />
            {isMulti
              ? `${t("resumePreviewPage")} ${i + 1} ${t("resumePreviewOf")} ${urls.length}`
              : t("resumePreviewTitle")}
            {i === 0 && <span className="resume-preview-sub">{t("resumePreviewSub")}</span>}
          </p>
          <div className="resume-preview-img-container">
            <img src={url} alt={fileNames[i]} className="resume-preview-img" />
          </div>
          <div className="resume-preview-footer">
            <span className="resume-preview-name">
              <ImageIcon size={13} /> {fileNames[i]}
            </span>
            <a href={url} download={fileNames[i]} className="btn btn-ghost resume-preview-dl">
              {lang === "en" ? "Download" : "ดาวน์โหลด"}
            </a>
          </div>
        </div>
      ))}
    </div>
  );
}

function ScoreRing({ value }) {
  const r = 52;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const id = requestAnimationFrame(() => setShown(value));
    return () => cancelAnimationFrame(id);
  }, [value]);
  return (
    <div className="ring">
      <svg viewBox="0 0 128 128" width="128" height="128">
        <circle cx="64" cy="64" r={r} className="ring-track" />
        <circle
          cx="64" cy="64" r={r} className="ring-fill"
          strokeDasharray={c}
          strokeDashoffset={c - (c * shown) / 100}
          transform="rotate(-90 64 64)"
        />
      </svg>
      <div className="ring-center">
        <span className="ring-num mono">{value}</span>
        <span className="ring-of">/ 100</span>
      </div>
    </div>
  );
}

/* -------------------------------- styles ------------------------------ */

const CSS = `
.ria{
  --ink:#101426; --ink-soft:#5a6076; --ink-faint:#8b91a6;
  --line:#e9ecf3; --paper:#ffffff; --panel:#f6f8fc; --panel-2:#eef1f8;
  --brand:#4f46e5; --brand-press:#4338ca;
  --good:#0ea672; --good-bg:#e9f8f1;
  --warn:#e08a16; --warn-bg:#fdf3e3;
  --tip:#7c5cf0; --tip-bg:#f1edfe;
  --jobthai:#f25c2a; --jobsdb:#1f6fe5;
  --shadow:0 1px 2px rgba(16,20,38,.05), 0 10px 30px -18px rgba(16,20,38,.25);
  font-family:'Inter',system-ui,sans-serif;
  color:var(--ink); background:var(--panel);
  min-height:100%; width:100%;
  -webkit-font-smoothing:antialiased;
}
.ria *{box-sizing:border-box;}
.ria h1,.ria h3{font-family:'Space Grotesk','Inter',sans-serif; margin:0; letter-spacing:-.01em;}
.ria p{margin:0;}
.mono{font-family:'IBM Plex Mono',monospace; font-variant-numeric:tabular-nums;}

/* buttons */
.btn{display:inline-flex; align-items:center; gap:7px; border:none; cursor:pointer;
  font-family:'Inter',sans-serif; font-weight:600; font-size:14px; border-radius:11px;
  padding:10px 16px; transition:transform .12s, box-shadow .12s, background .15s; text-decoration:none;}
.btn:active{transform:translateY(1px);}
.btn-primary{background:var(--brand); color:#fff; box-shadow:0 8px 18px -8px rgba(79,70,229,.7);}
.btn-primary:hover{background:var(--brand-press);}
.btn-lg{padding:13px 22px; font-size:15px;}
.btn-ghost{background:var(--paper); color:var(--ink-soft); border:1px solid var(--line);}
.btn-ghost:hover{color:var(--ink); border-color:#d6dbe7;}
.motion-icon{position:relative; display:inline-grid; place-items:center; width:1.25em; height:1.25em; flex-shrink:0;}
.motion-icon svg{position:relative; z-index:1; display:block;}
.motion-icon-ring{position:absolute; inset:-5px; border-radius:999px; border:1.5px solid currentColor; opacity:.18; transform:scale(.7);}
.motion-icon--loading svg{animation:spinSoft 1.25s linear infinite;}
.motion-icon--loading .motion-icon-ring{animation:pulseRing 1.2s ease-out infinite;}
.motion-icon--uploading svg{animation:uploadLift 1.05s cubic-bezier(.42,0,.2,1) infinite;}
.motion-icon--uploading .motion-icon-ring{animation:uploadRing 1.05s ease-out infinite;}
.motion-icon--processing svg{animation:processNod 1.3s ease-in-out infinite;}
.motion-icon--processing .motion-icon-ring{animation:processGlow 1.3s ease-in-out infinite;}
@keyframes spinSoft{to{transform:rotate(360deg);}}
@keyframes pulseRing{0%{opacity:.26; transform:scale(.62);}70%,100%{opacity:0; transform:scale(1.35);}}
@keyframes uploadLift{0%,100%{transform:translateY(2px);}50%{transform:translateY(-3px);}}
@keyframes uploadRing{0%{opacity:0; transform:translateY(5px) scale(.72);}45%{opacity:.28;}100%{opacity:0; transform:translateY(-8px) scale(1.12);}}
@keyframes processNod{0%,100%{transform:scale(1);}45%{transform:scale(.9) rotate(-4deg);}70%{transform:scale(1.08) rotate(3deg);}}
@keyframes processGlow{0%,100%{opacity:.12; transform:scale(.78);}50%{opacity:.32; transform:scale(1.18);}}

/* top bar */
.topbar{display:flex; align-items:center; justify-content:space-between;
  padding:14px 26px; background:var(--paper); border-bottom:1px solid var(--line);
  position:sticky; top:0; z-index:20;}
.brand{display:flex; align-items:center; gap:10px;}
.brand-mark{display:grid; place-items:center; width:32px; height:32px; border-radius:9px;
  background:var(--brand); color:#fff;}
.brand-name{font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:18px;}
.brand-name b{font-weight:700; color:var(--brand);}
.brand-tag{font-size:12px; color:var(--ink-faint); padding-left:12px; margin-left:4px;
  border-left:1px solid var(--line);}
.top-right{display:flex; align-items:center; gap:10px;}
.file-chip{display:inline-flex; align-items:center; gap:7px; font-size:13px; color:var(--ink-soft);
  background:var(--panel-2); border:1px solid var(--line); padding:6px 8px 6px 11px; border-radius:9px;}
.chip-x{display:grid; place-items:center; border:none; background:transparent; cursor:pointer;
  color:var(--ink-faint); padding:2px; border-radius:5px;}
.chip-x:hover{background:#e1e5ef; color:var(--ink);}

/* lang toggle */
.lang-toggle{display:inline-flex; align-items:center; gap:4px; background:transparent;
  border:1px solid var(--line); border-radius:999px; padding:5px 12px; cursor:pointer;
  font-family:'Inter',sans-serif; transition:border-color .15s; flex-shrink:0;}
.lang-toggle:hover{border-color:#cdd4e3;}
.lang-toggle span{font-size:12px; font-weight:600; color:var(--ink-faint); transition:color .15s; padding:0 2px;}
.lang-toggle .lang-active{color:var(--brand);}
.lang-toggle .lang-sep{color:var(--line); font-weight:400;}

/* empty state */
.stage-empty{display:grid; place-items:center; padding:56px 24px 72px;}
.empty-inner{max-width:560px; text-align:center;}
.eyebrow{font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.12em;
  text-transform:uppercase; color:var(--brand); margin-bottom:14px;}
.empty-title{font-size:40px; font-weight:700; line-height:1.05;}
.empty-sub{color:var(--ink-soft); font-size:15.5px; line-height:1.55; margin:14px auto 30px; max-width:460px;}
.dropzone{display:flex; flex-direction:column; align-items:center; gap:6px; cursor:pointer;
  background:var(--paper); border:1.5px dashed #cdd4e3; border-radius:20px; padding:40px 28px;
  transition:border-color .15s, background .15s, transform .15s;}
.dropzone:hover{border-color:var(--brand); transform:translateY(-2px);}
.dropzone.is-drag{border-color:var(--brand); background:#f3f2fe;}
.dz-icon{display:grid; place-items:center; width:56px; height:56px; border-radius:16px;
  background:var(--brand); color:#fff; margin-bottom:6px; box-shadow:0 12px 22px -10px rgba(79,70,229,.65);}
.dz-icon--animated .motion-icon{font-size:26px;}
.dz-main{font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:17px;}
.dz-or{font-size:13.5px; color:var(--ink-soft);}
.dz-or b{color:var(--brand);}
.dz-types{display:flex; gap:8px; margin-top:12px;}
.type-pill{display:inline-flex; align-items:center; gap:5px; font-size:12px; color:var(--ink-soft);
  background:var(--panel-2); padding:5px 10px; border-radius:7px;}
.type-pill--warn{color:#b45309; background:#fef3c7;}
.demo-cta{margin-top:22px;}

/* analyzing */
.stage-analyze{display:grid; place-items:center; gap:22px; padding:80px 24px;}
.status-flow{display:flex; flex-wrap:wrap; justify-content:center; gap:10px;}
.status-chip{display:inline-flex; align-items:center; gap:8px; min-height:34px; border:1px solid var(--line);
  background:var(--paper); color:var(--ink-soft); border-radius:999px; padding:8px 13px;
  font-size:12.5px; font-weight:600; box-shadow:var(--shadow);}
.status-chip:nth-child(1){color:var(--brand); animation:statusRise .72s ease both;}
.status-chip:nth-child(2){color:var(--tip); animation:statusRise .72s ease .12s both;}
.status-chip:nth-child(3){color:var(--good); animation:statusRise .72s ease .24s both;}
@keyframes statusRise{from{opacity:0; transform:translateY(8px);}to{opacity:1; transform:none;}}
.scan-doc{position:relative; width:300px; height:380px; background:var(--paper);
  border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow);
  padding:34px 28px; overflow:hidden; display:flex; flex-direction:column; gap:15px;}
.scan-row{height:11px; border-radius:6px; background:var(--panel-2);}
.scan-row.short{width:40%;}
.scan-line{position:absolute; left:0; right:0; top:0; height:54px;
  background:linear-gradient(180deg, rgba(79,70,229,0) 0%, rgba(79,70,229,.18) 70%, rgba(79,70,229,.5) 100%);
  border-bottom:2px solid var(--brand); animation:scan 1.6s cubic-bezier(.5,0,.5,1) infinite;}
@keyframes scan{0%{transform:translateY(-54px);}100%{transform:translateY(380px);}}
.analyze-text{display:inline-flex; align-items:center; gap:8px; color:var(--ink-soft);
  font-size:14px; font-family:'IBM Plex Mono',monospace;}

/* ready layout */
.stage-ready{display:grid; grid-template-columns:minmax(0,1fr) 372px; gap:22px;
  padding:24px; max-width:1240px; margin:0 auto; align-items:start;}
.main-col{min-width:0;}

/* tabs */
.tabs{display:inline-flex; gap:4px; background:var(--paper); border:1px solid var(--line);
  padding:5px; border-radius:13px; margin-bottom:18px;}
.tab{display:inline-flex; align-items:center; gap:7px; border:none; cursor:pointer;
  background:transparent; color:var(--ink-soft); font-family:'Inter',sans-serif; font-weight:600;
  font-size:13.5px; padding:9px 15px; border-radius:9px; transition:background .15s, color .15s;}
.tab:hover{color:var(--ink);}
.tab.active{background:var(--brand); color:#fff;}

/* cards */
.card{background:var(--paper); border:1px solid var(--line); border-radius:16px;
  padding:20px; box-shadow:var(--shadow);}
.card-label{font-size:12px; font-weight:600; letter-spacing:.04em; text-transform:uppercase;
  color:var(--ink-faint); margin-bottom:13px; display:flex; align-items:center; gap:6px;}

/* dashboard grid */
.grid-dash{display:grid; grid-template-columns:1fr 1fr; gap:16px;}
.score-card{display:flex; gap:20px; align-items:center;}
.score-meta{min-width:0;}
.score-label{font-family:'IBM Plex Mono',monospace; font-size:11px; letter-spacing:.1em;
  text-transform:uppercase; color:var(--brand);}
.score-head{font-size:18px; margin:5px 0 7px;}
.score-note{font-size:13px; color:var(--ink-soft); line-height:1.5;}
.ring{position:relative; width:128px; height:128px; flex-shrink:0;}
.ring-track{fill:none; stroke:var(--panel-2); stroke-width:11;}
.ring-fill{fill:none; stroke:var(--brand); stroke-width:11; stroke-linecap:round;
  transition:stroke-dashoffset 1.1s cubic-bezier(.3,.8,.3,1);}
.ring-center{position:absolute; inset:0; display:flex; flex-direction:column; align-items:center; justify-content:center;}
.ring-num{font-size:32px; font-weight:600; line-height:1;}
.ring-of{font-size:11px; color:var(--ink-faint); margin-top:2px;}

.profile-head{display:flex; align-items:center; gap:13px; margin-bottom:15px;}
.avatar{display:grid; place-items:center; width:48px; height:48px; border-radius:13px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff;
  font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:17px;}
.p-name{font-size:17px;}
.p-role{font-size:13px; color:var(--ink-soft); margin-top:2px;}
.p-contact{list-style:none; margin:0; padding:0; display:grid; gap:9px;}
.p-contact li{display:flex; align-items:center; gap:9px; font-size:13px; color:var(--ink-soft);}
.p-contact svg{color:var(--ink-faint); flex-shrink:0;}

.tags{display:flex; flex-wrap:wrap; gap:7px;}
.tag{font-size:12.5px; color:var(--ink); background:var(--panel); border:1px solid var(--line);
  padding:5px 11px; border-radius:8px;}
.tags.small .tag{font-size:11.5px; padding:4px 9px;}

.timeline{list-style:none; margin:0 0 6px; padding:0; display:grid; gap:14px;}
.timeline li{display:flex; gap:11px;}
.timeline .dot{width:9px; height:9px; border-radius:50%; background:var(--brand);
  margin-top:5px; flex-shrink:0; box-shadow:0 0 0 4px rgba(79,70,229,.12);}
.t-role{font-size:14px; font-weight:600;}
.t-meta{font-size:12.5px; color:var(--ink-soft); margin-top:2px;}
.edu-label{margin-top:16px;}

/* analysis */
.grid-analysis{display:grid; grid-template-columns:1fr; gap:16px;}
.analysis-card .ac-head{display:flex; align-items:center; gap:10px; margin-bottom:14px;}
.ac-icon{display:grid; place-items:center; width:30px; height:30px; border-radius:9px;}
.ac-head h3{font-size:15px; flex:1;}
.ac-count{font-size:12px; color:var(--ink-faint); background:var(--panel); padding:3px 9px; border-radius:20px;}
.ac-list{list-style:none; margin:0; padding:0; display:grid; gap:11px;}
.ac-list li{display:flex; gap:10px; font-size:13.5px; line-height:1.5; color:var(--ink-soft);}
.ac-bullet{display:grid; place-items:center; width:18px; height:18px; border-radius:6px;
  flex-shrink:0; margin-top:1px; color:#fff;}
.analysis-card.good{border-left:3px solid var(--good);}
.analysis-card.good .ac-icon{background:var(--good-bg); color:var(--good);}
.analysis-card.good .ac-bullet{background:var(--good);}
.analysis-card.warn{border-left:3px solid var(--warn);}
.analysis-card.warn .ac-icon{background:var(--warn-bg); color:var(--warn);}
.analysis-card.warn .ac-bullet{background:var(--warn);}
.analysis-card.tip{border-left:3px solid var(--tip);}
.analysis-card.tip .ac-icon{background:var(--tip-bg); color:var(--tip);}
.analysis-card.tip .ac-bullet{background:var(--tip);}

/* jobs */
.jobs-wrap{padding-bottom:8px;}
.jobs-intro{display:flex; align-items:center; gap:8px; font-size:13.5px; color:var(--ink-soft); margin-bottom:16px;}
.grid-jobs{display:grid; grid-template-columns:1fr 1fr; gap:16px;}
.job-card{display:flex; flex-direction:column; gap:13px;}
.job-top{display:flex; justify-content:space-between; gap:10px;}
.job-title{font-size:15.5px; line-height:1.25;}
.job-company{font-size:13px; color:var(--ink-soft); margin-top:3px;}
.match-badge{display:flex; flex-direction:column; align-items:center; justify-content:center;
  background:var(--good-bg); color:var(--good); border-radius:11px; padding:6px 11px; flex-shrink:0;}
.match-num{font-size:16px; font-weight:600; line-height:1;}
.match-word{font-size:9.5px; letter-spacing:.06em; text-transform:uppercase; margin-top:2px;}
.job-meta{display:flex; flex-wrap:wrap; gap:14px; font-size:12.5px; color:var(--ink-soft);}
.job-meta span{display:inline-flex; align-items:center; gap:5px;}
.job-actions{display:flex; gap:9px; margin-top:auto; padding-top:4px;}
.job-actions .btn{flex:1; justify-content:center; color:#fff; font-size:13px; padding:9px 12px;}
.btn-jobthai{background:var(--jobthai); box-shadow:0 8px 16px -9px rgba(242,92,42,.7);}
.btn-jobthai:hover{filter:brightness(.95);}
.btn-jobsdb{background:var(--jobsdb); box-shadow:0 8px 16px -9px rgba(31,111,229,.7);}
.btn-jobsdb:hover{filter:brightness(.95);}

/* chat */
.chat-col{position:sticky; top:88px; display:flex; flex-direction:column; height:calc(100vh - 112px);
  background:var(--paper); border:1px solid var(--line); border-radius:16px; box-shadow:var(--shadow); overflow:hidden;}
.chat-head{padding:14px 16px; border-bottom:1px solid var(--line);}
.chat-doc{display:inline-flex; align-items:center; gap:7px; font-size:12px; color:var(--ink-faint);
  max-width:100%; overflow:hidden;}
.chat-doc span{white-space:nowrap; overflow:hidden; text-overflow:ellipsis;}
.chat-title{display:block; font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:15px; margin-top:4px;}
.chat-scroll{flex:1; overflow-y:auto; padding:16px; display:flex; flex-direction:column; gap:12px;}
.bubble{display:flex; gap:8px; max-width:90%;}
.bubble p{font-size:13.5px; line-height:1.5; padding:10px 13px; border-radius:13px; white-space:pre-wrap;}
.bubble.bot{align-self:flex-start;}
.bubble.bot p{background:var(--panel); color:var(--ink); border-bottom-left-radius:4px;}
.bot-ava{display:grid; place-items:center; width:26px; height:26px; border-radius:8px;
  background:var(--brand); color:#fff; flex-shrink:0; margin-top:2px;}
.bot-ava .motion-icon{font-size:14px;}
.bubble.me{align-self:flex-end;}
.bubble.me p{background:var(--brand); color:#fff; border-bottom-right-radius:4px;}
.typing-text{display:inline-flex; align-items:center; gap:8px; color:var(--ink-soft);}
.chat-suggest{display:flex; flex-wrap:wrap; gap:7px; padding:0 16px 12px;}
.suggest{font-size:12px; color:var(--ink-soft); background:var(--panel); border:1px solid var(--line);
  padding:6px 11px; border-radius:20px; cursor:pointer; transition:border-color .15s, color .15s;}
.suggest:hover{border-color:var(--brand); color:var(--brand);}
.chat-input{display:flex; gap:9px; padding:13px 16px; border-top:1px solid var(--line);}
.chat-input input{flex:1; border:1px solid var(--line); border-radius:11px; padding:11px 13px;
  font-family:'Inter',sans-serif; font-size:13.5px; color:var(--ink); outline:none; background:var(--panel); transition:border-color .15s;}
.chat-input input:focus{border-color:var(--brand); background:var(--paper);}
.send{display:grid; place-items:center; width:42px; flex-shrink:0; border:none; cursor:pointer;
  background:var(--brand); color:#fff; border-radius:11px; transition:background .15s;}
.send:hover{background:var(--brand-press);}
.send:disabled{cursor:wait; opacity:.88;}

/* motion */
.fade-up{animation:fadeUp .5s cubic-bezier(.2,.7,.3,1) both;}
@keyframes fadeUp{from{opacity:0; transform:translateY(10px);}to{opacity:1; transform:none;}}

/* focus */
.ria button:focus-visible,.ria a:focus-visible,.ria input:focus-visible,.ria label:focus-visible{
  outline:2px solid var(--brand); outline-offset:2px;}

/* resume preview tab */
.resume-preview-wrap{padding-bottom:8px;}
.resume-preview-card{display:flex; flex-direction:column; gap:16px;}
.resume-preview-sub{font-size:11px; color:var(--ink-faint); text-transform:none; letter-spacing:0; font-weight:400; margin-left:8px;}
.resume-preview-img-container{border-radius:12px; overflow:hidden; border:1px solid var(--line); background:var(--panel-2); max-height:72vh; overflow-y:auto;}
.resume-preview-img{width:100%; display:block;}
.resume-preview-footer{display:flex; align-items:center; justify-content:space-between; gap:12px; padding-top:4px; border-top:1px solid var(--line);}
.resume-preview-name{display:inline-flex; align-items:center; gap:7px; font-size:13px; color:var(--ink-soft); overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.resume-preview-dl{padding:7px 14px; font-size:13px;}

/* file chip thumbnail */
.chip-thumb{width:22px; height:22px; border-radius:4px; object-fit:cover; flex-shrink:0;}

/* analyzing — real image scan */
.scan-doc.has-img{padding:0; gap:0; overflow:hidden;}
.scan-img{width:100%; height:100%; object-fit:cover; display:block;}
.scan-page-badge{position:absolute; bottom:10px; right:10px; z-index:2;
  background:rgba(16,20,38,.72); color:#fff; font-family:'IBM Plex Mono',monospace;
  font-size:11px; font-weight:600; padding:4px 9px; border-radius:20px; backdrop-filter:blur(4px);}

/* chip extensions */
.chip-label{max-width:160px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;}
.chip-count{display:grid; place-items:center; min-width:20px; height:20px; padding:0 5px;
  background:var(--brand); color:#fff; border-radius:20px; font-size:11px; font-weight:700; flex-shrink:0;}

/* multi-page hint pill */
.type-pill--multi{color:var(--brand); background:rgba(79,70,229,.09); border:1px solid rgba(79,70,229,.2);}

/* responsive */
@media(max-width:1000px){
  .stage-ready{grid-template-columns:1fr;}
  .chat-col{position:static; height:520px;}
}
@media(max-width:680px){
  .grid-dash,.grid-jobs{grid-template-columns:1fr;}
  .empty-title{font-size:32px;}
  .brand-tag{display:none;}
  .topbar{padding:12px 16px;}
  .stage-ready{padding:16px;}
}
@media(prefers-reduced-motion:reduce){
  .scan-line{animation:none; opacity:.4;}
  .fade-up{animation:none;}
  .ring-fill{transition:none;}
  .btn,.dropzone{transition:none;}
  .motion-icon svg,.motion-icon-ring,.status-chip{animation:none;}
}
`;
