import React, { useState, useEffect, useRef } from "react";
import {
  Upload, FileText, Image as ImageIcon, X, Sparkles, LayoutDashboard,
  ClipboardCheck, Briefcase, Send, ThumbsUp, AlertTriangle, Lightbulb,
  MapPin, Wallet, ArrowUpRight, RotateCcw, Check, Bot, Mail, Phone,
  GraduationCap, Github
} from "lucide-react";

/* ----------------------------- mock data ----------------------------- */

const PROFILE = {
  name: "Nattakit Phongphaew",
  role: "Frontend Developer",
  location: "Bangkok, Thailand",
  email: "nattakit.dev@email.com",
  phone: "+66 8X-XXX-XXXX",
  github: "github.com/nattakit",
  years: 4,
  summaryMissing: true,
  skills: ["React", "TypeScript", "Next.js", "Tailwind CSS", "Node.js", "Figma", "REST API", "Git"],
  experience: [
    { role: "Frontend Developer", org: "Sea (Garena)", period: "2022 — Present" },
    { role: "Web Developer", org: "Builk One Group", period: "2020 — 2022" },
  ],
  education: { degree: "B.Eng. Computer Engineering", org: "KMUTT", period: "2016 — 2020" },
};

const SCORE = 82;

const ANALYSIS = {
  advantages: [
    "Modern frontend stack (React, TypeScript, Next.js) that matches strong current market demand.",
    "Quantified impact in the latest role — reduced initial load time by 38%.",
    "Steady four-year trajectory with no employment gaps.",
  ],
  disadvantages: [
    "Two of three roles list responsibilities but no measurable results.",
    "No short professional summary at the top of the resume.",
    "Skills are listed as tools only, without proficiency levels.",
  ],
  recommendations: [
    "Add a 2–3 line summary aimed at Senior Frontend roles.",
    "Quantify achievements with numbers (%, time saved, users reached).",
    "Group skills by category and mark your level for each.",
    "Add links to your GitHub and a live portfolio.",
  ],
};

const JOBS = [
  { title: "Senior Frontend Developer", company: "Agoda", area: "Bangkok", salary: "90k – 130k", match: 92, tags: ["React", "TypeScript", "Next.js"] },
  { title: "React Developer", company: "LINE MAN Wongnai", area: "Bangkok", salary: "70k – 100k", match: 88, tags: ["React", "Node.js", "REST API"] },
  { title: "Frontend Engineer", company: "SCB TechX", area: "Bangkok (Hybrid)", salary: "80k – 120k", match: 85, tags: ["TypeScript", "Tailwind", "Figma"] },
];

const jobThai = (q) => `https://www.jobthai.com/en/jobs?keyword=${encodeURIComponent(q)}`;
const jobsDB = (q) => `https://th.jobsdb.com/th/jobs?keywords=${encodeURIComponent(q)}`;

/* --------------------------- chat behaviour --------------------------- */

function botReply(text) {
  const t = text.toLowerCase();
  if (t.includes("skill") || t.includes("ทักษะ"))
    return "Your strongest skills are React, TypeScript and Next.js — they map directly to senior frontend openings. Consider adding a proficiency level next to each tool.";
  if (t.includes("experience") || t.includes("ประสบการณ์"))
    return "The resume shows 4 years across two companies with no gaps. The latest role at Sea (Garena) has a quantified win (−38% load time); the earlier role would benefit from similar metrics.";
  if (t.includes("salary") || t.includes("เงินเดือน"))
    return "Based on a 4-year frontend profile in Bangkok, a fair range is roughly 80k–120k THB/month. The matched Senior roles list 90k–130k.";
  if (t.includes("improve") || t.includes("fix") || t.includes("แก้") || t.includes("ปรับ"))
    return "Three quick wins: add a short summary at the top, quantify achievements in every role, and link your GitHub. Want me to draft the summary line?";
  return "I can answer questions about this resume — skills, experience, salary range, or what to improve. Try asking “What should I improve?”";
}

/* ------------------------------ component ----------------------------- */

export default function ResumeAnalyzer() {
  const [stage, setStage] = useState("empty"); // empty | analyzing | ready
  const [tab, setTab] = useState("dashboard");
  const [file, setFile] = useState(null);
  const [drag, setDrag] = useState(false);
  const [messages, setMessages] = useState([
    { from: "bot", text: "Hi! I’ve read your resume. Ask me anything about it." },
  ]);
  const [draft, setDraft] = useState("");
  const chatEndRef = useRef(null);

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

  function startAnalyze(name = "resume_nattakit.pdf", type = "pdf") {
    setFile({ name, type });
    setStage("analyzing");
    setTab("dashboard");
    setTimeout(() => setStage("ready"), 2400);
  }

  function reset() {
    setStage("empty");
    setFile(null);
    setMessages([{ from: "bot", text: "Hi! I’ve read your resume. Ask me anything about it." }]);
  }

  function send() {
    const text = draft.trim();
    if (!text) return;
    setMessages((m) => [...m, { from: "me", text }]);
    setDraft("");
    setTimeout(() => setMessages((m) => [...m, { from: "bot", text: botReply(text) }]), 500);
  }

  return (
    <div className="ria">
      <style>{CSS}</style>

      {/* top bar */}
      <header className="topbar">
        <div className="brand">
          <span className="brand-mark"><Sparkles size={18} strokeWidth={2.4} /></span>
          <span className="brand-name">Resume<b>Loka</b></span>
          <span className="brand-tag">AI résumé analyzer</span>
        </div>
        <div className="top-right">
          {file && (
            <span className="file-chip">
              {file.type === "pdf" ? <FileText size={14} /> : <ImageIcon size={14} />}
              {file.name}
              <button className="chip-x" onClick={reset} aria-label="Remove file"><X size={13} /></button>
            </span>
          )}
          {stage === "ready" && (
            <button className="btn btn-ghost" onClick={reset}>
              <RotateCcw size={15} /> New résumé
            </button>
          )}
        </div>
      </header>

      {/* empty state */}
      {stage === "empty" && (
        <main className="stage-empty">
          <div className="empty-inner">
            <p className="eyebrow">Step 1 — Upload</p>
            <h1 className="empty-title">Turn your résumé into a plan.</h1>
            <p className="empty-sub">
              Drop a PDF or image. ResumeLoka reads it, builds your profile, and finds roles
              that actually fit — with direct links to JobThai and JobsDB.
            </p>

            <label
              className={"dropzone" + (drag ? " is-drag" : "")}
              onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
              onDragLeave={() => setDrag(false)}
              onDrop={(e) => { e.preventDefault(); setDrag(false); startAnalyze(); }}
            >
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg"
                hidden
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  startAnalyze(f?.name || "resume.pdf", (f?.type || "").includes("image") ? "img" : "pdf");
                }}
              />
              <span className="dz-icon"><Upload size={26} strokeWidth={2.2} /></span>
              <span className="dz-main">Drag & drop your résumé here</span>
              <span className="dz-or">or <b>browse files</b></span>
              <span className="dz-types">
                <span className="type-pill"><FileText size={13} /> PDF</span>
                <span className="type-pill"><ImageIcon size={13} /> PNG · JPG</span>
              </span>
            </label>

            <button className="btn btn-primary btn-lg demo-cta" onClick={() => startAnalyze()}>
              <Sparkles size={16} /> Try with a sample résumé
            </button>
          </div>
        </main>
      )}

      {/* analyzing state */}
      {stage === "analyzing" && (
        <main className="stage-analyze">
          <div className="scan-doc">
            <div className="scan-line" />
            {[88, 60, 74, 46, 80, 54, 68].map((w, i) => (
              <span key={i} className="scan-row" style={{ width: w + "%" }} />
            ))}
            <span className="scan-row short" />
          </div>
          <p className="analyze-text"><Bot size={16} /> Reading résumé · extracting profile · scoring…</p>
        </main>
      )}

      {/* ready state */}
      {stage === "ready" && (
        <main className="stage-ready">
          {/* main column */}
          <section className="main-col">
            <nav className="tabs" role="tablist">
              <Tab id="dashboard" cur={tab} set={setTab} icon={<LayoutDashboard size={16} />} label="Dashboard" />
              <Tab id="analysis" cur={tab} set={setTab} icon={<ClipboardCheck size={16} />} label="Analysis" />
              <Tab id="jobs" cur={tab} set={setTab} icon={<Briefcase size={16} />} label="Jobs" />
            </nav>

            <div className="tab-body">
              {tab === "dashboard" && <Dashboard />}
              {tab === "analysis" && <Analysis />}
              {tab === "jobs" && <Jobs />}
            </div>
          </section>

          {/* chat column */}
          <aside className="chat-col">
            <div className="chat-head">
              <span className="chat-doc">
                {file?.type === "img" ? <ImageIcon size={15} /> : <FileText size={15} />}
                <span>{file?.name}</span>
              </span>
              <span className="chat-title">Chat with résumé</span>
            </div>

            <div className="chat-scroll">
              {messages.map((m, i) => (
                <div key={i} className={"bubble " + (m.from === "me" ? "me" : "bot")}>
                  {m.from === "bot" && <span className="bot-ava"><Bot size={14} /></span>}
                  <p>{m.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>

            <div className="chat-suggest">
              {["What should I improve?", "Is my salary range fair?", "Rate my skills"].map((s) => (
                <button key={s} className="suggest" onClick={() => { setDraft(s); }}>{s}</button>
              ))}
            </div>

            <div className="chat-input">
              <input
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && send()}
                placeholder="Ask about this résumé…"
              />
              <button className="send" onClick={send} aria-label="Send"><Send size={16} /></button>
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

function Dashboard() {
  return (
    <div className="grid-dash fade-up">
      <div className="card score-card">
        <ScoreRing value={SCORE} />
        <div className="score-meta">
          <p className="score-label">Résumé score</p>
          <h3 className="score-head">Strong, with room to sharpen</h3>
          <p className="score-note">
            A few targeted edits would move this résumé into the top tier for senior roles.
          </p>
        </div>
      </div>

      <div className="card profile-card">
        <div className="profile-head">
          <span className="avatar">{PROFILE.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
          <div>
            <h3 className="p-name">{PROFILE.name}</h3>
            <p className="p-role">{PROFILE.role} · {PROFILE.years} yrs</p>
          </div>
        </div>
        <ul className="p-contact">
          <li><MapPin size={14} /> {PROFILE.location}</li>
          <li><Mail size={14} /> {PROFILE.email}</li>
          <li><Phone size={14} /> {PROFILE.phone}</li>
          <li><Github size={14} /> {PROFILE.github}</li>
        </ul>
      </div>

      <div className="card skills-card">
        <p className="card-label">Skills detected</p>
        <div className="tags">
          {PROFILE.skills.map((s) => <span key={s} className="tag">{s}</span>)}
        </div>
      </div>

      <div className="card xp-card">
        <p className="card-label">Experience</p>
        <ul className="timeline">
          {PROFILE.experience.map((e, i) => (
            <li key={i}>
              <span className="dot" />
              <div>
                <p className="t-role">{e.role}</p>
                <p className="t-meta">{e.org} · <span className="mono">{e.period}</span></p>
              </div>
            </li>
          ))}
        </ul>
        <p className="card-label edu-label"><GraduationCap size={14} /> Education</p>
        <p className="t-role">{PROFILE.education.degree}</p>
        <p className="t-meta">{PROFILE.education.org} · <span className="mono">{PROFILE.education.period}</span></p>
      </div>
    </div>
  );
}

function Analysis() {
  const blocks = [
    { key: "advantages", title: "Advantages", icon: <ThumbsUp size={16} />, cls: "good", items: ANALYSIS.advantages },
    { key: "disadvantages", title: "Disadvantages", icon: <AlertTriangle size={16} />, cls: "warn", items: ANALYSIS.disadvantages },
    { key: "recommendations", title: "Recommendations", icon: <Lightbulb size={16} />, cls: "tip", items: ANALYSIS.recommendations },
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

function Jobs() {
  return (
    <div className="jobs-wrap fade-up">
      <p className="jobs-intro">
        <Briefcase size={15} /> Matched against your skills and experience. Open any role on JobThai or JobsDB.
      </p>
      <div className="grid-jobs">
        {JOBS.map((j) => (
          <article key={j.title} className="card job-card">
            <div className="job-top">
              <div>
                <h3 className="job-title">{j.title}</h3>
                <p className="job-company">{j.company}</p>
              </div>
              <span className="match-badge">
                <span className="mono match-num">{j.match}%</span>
                <span className="match-word">match</span>
              </span>
            </div>
            <div className="job-meta">
              <span><MapPin size={13} /> {j.area}</span>
              <span><Wallet size={13} /> {j.salary} THB</span>
            </div>
            <div className="tags small">
              {j.tags.map((t) => <span key={t} className="tag">{t}</span>)}
            </div>
            <div className="job-actions">
              <a className="btn btn-jobthai" href={jobThai(j.title)} target="_blank" rel="noreferrer">
                JobThai <ArrowUpRight size={14} />
              </a>
              <a className="btn btn-jobsdb" href={jobsDB(j.title)} target="_blank" rel="noreferrer">
                JobsDB <ArrowUpRight size={14} />
              </a>
            </div>
          </article>
        ))}
      </div>
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
.dz-main{font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:17px;}
.dz-or{font-size:13.5px; color:var(--ink-soft);}
.dz-or b{color:var(--brand);}
.dz-types{display:flex; gap:8px; margin-top:12px;}
.type-pill{display:inline-flex; align-items:center; gap:5px; font-size:12px; color:var(--ink-soft);
  background:var(--panel-2); padding:5px 10px; border-radius:7px;}
.demo-cta{margin-top:22px;}

/* analyzing */
.stage-analyze{display:grid; place-items:center; gap:22px; padding:80px 24px;}
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
.bubble p{font-size:13.5px; line-height:1.5; padding:10px 13px; border-radius:13px;}
.bubble.bot{align-self:flex-start;}
.bubble.bot p{background:var(--panel); color:var(--ink); border-bottom-left-radius:4px;}
.bot-ava{display:grid; place-items:center; width:26px; height:26px; border-radius:8px;
  background:var(--brand); color:#fff; flex-shrink:0; margin-top:2px;}
.bubble.me{align-self:flex-end;}
.bubble.me p{background:var(--brand); color:#fff; border-bottom-right-radius:4px;}
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

/* motion */
.fade-up{animation:fadeUp .5s cubic-bezier(.2,.7,.3,1) both;}
@keyframes fadeUp{from{opacity:0; transform:translateY(10px);}to{opacity:1; transform:none;}}

/* focus */
.ria button:focus-visible,.ria a:focus-visible,.ria input:focus-visible,.ria label:focus-visible{
  outline:2px solid var(--brand); outline-offset:2px;}

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
}
`;
