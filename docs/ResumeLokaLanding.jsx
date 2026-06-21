import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles, Upload, ScanLine, Briefcase, Check, Star, ArrowRight,
  ShieldCheck, Zap, Target, ChevronDown, MessagesSquare, FileSearch,
  TrendingUp, Menu, X, Bot, ThumbsUp, AlertTriangle, Lightbulb
} from "lucide-react";

/* -------------------------------- data -------------------------------- */

const STEPS = [
  { n: "01", icon: <Upload size={20} />, title: "Upload your résumé", text: "Drop a PDF or snap a photo. ResumeLoka reads every line in seconds — no forms to fill in." },
  { n: "02", icon: <ScanLine size={20} />, title: "Get the honest read", text: "A 0–100 score plus what’s strong, what’s weak, and the exact edits that move the needle." },
  { n: "03", icon: <Briefcase size={20} />, title: "Apply where you fit", text: "Roles ranked by how well you match — opened straight on JobThai and JobsDB." },
];

const FEATURES = [
  { icon: <FileSearch size={18} />, cls: "f-brand", title: "Recruiter-grade analysis", text: "Real advantages, disadvantages, and specific fixes — not vague “use action verbs” advice." },
  { icon: <MessagesSquare size={18} />, cls: "f-tip", title: "Chat with your résumé", text: "Ask anything: “What should I improve?” or “Is my salary range fair?” Get answers grounded in your file." },
  { icon: <Target size={18} />, cls: "f-good", title: "Job matches that fit", text: "Every role scored against your skills and experience, linked to JobThai & JobsDB." },
  { icon: <Zap size={18} />, cls: "f-warn", title: "Instant, in seconds", text: "No waiting, no setup. Upload and the full breakdown is ready before your coffee’s cold." },
  { icon: <ShieldCheck size={18} />, cls: "f-brand", title: "Private by default", text: "Your résumé is analyzed for you and never sold. You stay in control of your data." },
  { icon: <TrendingUp size={18} />, cls: "f-good", title: "Track your progress", text: "Re-run after each edit and watch your score climb toward the top tier." },
];

const PAINS = [
  "You don’t know what a recruiter sees in the first 7 seconds.",
  "Generic templates never tell you what’s wrong with your résumé.",
  "You’re applying to roles that were never a real fit.",
];

const STATS = [
  { num: "7 sec", label: "Average recruiter scan — we read it the same way" },
  { num: "0–100", label: "Instant résumé score with a clear breakdown" },
  { num: "2", label: "Job boards connected: JobThai & JobsDB" },
];

const REVIEWS = [
  { quote: "ผมไม่เคยรู้เลยว่าเรซูเม่ตัวเองอ่อนตรงไหน จนได้ลอง — แก้ตามคำแนะนำแล้วได้เรียกสัมภาษณ์ 3 ที่ในสองอาทิตย์.", name: "Tanawat S.", role: "Frontend Developer" },
  { quote: "The job matches were actually relevant. I applied through JobsDB and landed two interviews the same week.", name: "Ploy R.", role: "Marketing Specialist" },
  { quote: "เหมือนมี mentor ส่วนตัวที่อ่านเรซูเม่ให้ ถามอะไรก็ตอบตรงจุด ไม่ใช่คำแนะนำลอยๆ.", name: "Kanyarat P.", role: "Fresh Graduate" },
];

const PLANS = [
  {
    name: "Free", price: "฿0", note: "to start — no card needed",
    items: ["1 full résumé analysis", "Profile dashboard & score", "Job matches with links", "PDF or photo upload"],
    cta: "Analyze for free", primary: false,
  },
  {
    name: "Pro", price: "฿149", note: "/ month",
    items: ["Unlimited analyses", "Unlimited chat with résumé", "Deeper, role-targeted fixes", "Progress tracking over time", "Priority job matching"],
    cta: "Go Pro", primary: true,
  },
];

const FAQS = [
  { q: "What file types can I upload?", a: "PDF, PNG, and JPG. You can upload an exported résumé or simply take a clear photo of a printed one." },
  { q: "Is my résumé kept private?", a: "Yes. Your résumé is analyzed only to generate your results. We don’t sell your data, and you can remove your file at any time." },
  { q: "How does job matching work?", a: "ResumeLoka scores your skills and experience against open roles, then ranks them by fit and links you straight to JobThai and JobsDB to apply." },
  { q: "Do I need an account to try it?", a: "No. Your first full analysis is free with no card required — create an account only when you want to save results or go Pro." },
];

/* ---------------------------- reveal-on-scroll ------------------------- */

function useReveal() {
  const ref = useRef(null);
  const [shown, setShown] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setShown(true); io.disconnect(); } },
      { threshold: 0.18 }
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);
  return [ref, shown];
}

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, shown] = useReveal();
  return (
    <div ref={ref} className={`reveal ${shown ? "in" : ""} ${className}`} style={{ transitionDelay: `${delay}ms` }}>
      {children}
    </div>
  );
}

/* ------------------------------ component ----------------------------- */

export default function ResumeLokaLanding() {
  const [menu, setMenu] = useState(false);
  const [faq, setFaq] = useState(0);

  useEffect(() => {
    const l = document.createElement("link");
    l.rel = "stylesheet";
    l.href = "https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=IBM+Plex+Mono:wght@500;600&display=swap";
    document.head.appendChild(l);
    return () => l.remove();
  }, []);

  const go = (id) => (e) => {
    e.preventDefault();
    setMenu(false);
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="lp">
      <style>{CSS}</style>

      {/* nav */}
      <header className="nav">
        <a href="#top" onClick={go("top")} className="brand">
          <span className="brand-mark"><Sparkles size={17} strokeWidth={2.4} /></span>
          <span className="brand-name">Resume<b>Loka</b></span>
        </a>
        <nav className={"nav-links" + (menu ? " open" : "")}>
          <a href="#how" onClick={go("how")}>How it works</a>
          <a href="#features" onClick={go("features")}>Features</a>
          <a href="#reviews" onClick={go("reviews")}>Reviews</a>
          <a href="#pricing" onClick={go("pricing")}>Pricing</a>
          <a href="#cta" onClick={go("cta")} className="btn btn-primary nav-cta">Analyze my résumé</a>
        </nav>
        <button className="nav-burger" onClick={() => setMenu((m) => !m)} aria-label="Menu">
          {menu ? <X size={20} /> : <Menu size={20} />}
        </button>
      </header>

      {/* hero */}
      <section className="hero" id="top">
        <div className="hero-copy">
          <span className="pill"><span className="pill-dot" /> AI résumé analyzer · built for the Thai job market</span>
          <h1 className="hero-title">Your résumé gets <span className="hl">7 seconds</span>.<br />Make every one count.</h1>
          <p className="hero-sub">
            ResumeLoka reads your résumé the way a recruiter does — scores it, shows what’s strong,
            what’s holding you back, and exactly what to fix. Then it matches you to real jobs on
            <b> JobThai</b> and <b> JobsDB</b>.
          </p>
          <div className="hero-actions">
            <a href="#cta" onClick={go("cta")} className="btn btn-primary btn-lg">
              Analyze my résumé — free <ArrowRight size={17} />
            </a>
            <a href="#how" onClick={go("how")} className="btn btn-ghost btn-lg">See how it works</a>
          </div>
          <div className="hero-trust">
            <div className="stars">{[0, 1, 2, 3, 4].map((i) => <Star key={i} size={15} fill="currentColor" strokeWidth={0} />)}</div>
            <span><b>4.8</b>/5 · trusted by <b>12,000+</b> job seekers</span>
          </div>
        </div>

        <div className="hero-visual">
          <AppMock />
        </div>
      </section>

      {/* boards strip */}
      <section className="strip">
        <span className="strip-label">Matches you with openings from</span>
        <div className="strip-logos">
          <span className="board jobthai">JobThai</span>
          <span className="dot-sep" />
          <span className="board jobsdb">JobsDB</span>
          <span className="strip-more">and more on the way</span>
        </div>
      </section>

      {/* how it works */}
      <section className="section" id="how">
        <Reveal><p className="eyebrow">How it works</p></Reveal>
        <Reveal delay={60}><h2 className="section-title">From upload to interview, in three steps.</h2></Reveal>
        <div className="steps">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={120 + i * 90}>
              <div className="step">
                <div className="step-top">
                  <span className="step-icon">{s.icon}</span>
                  <span className="step-n mono">{s.n}</span>
                </div>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* pain → promise */}
      <section className="section pain-section">
        <div className="pain-grid">
          <Reveal className="pain-left">
            <p className="eyebrow">Sound familiar?</p>
            <h2 className="section-title">Sending the same résumé everywhere — and hearing nothing back.</h2>
            <ul className="pain-list">
              {PAINS.map((p, i) => (
                <li key={i}><span className="x-mark"><X size={13} strokeWidth={3} /></span>{p}</li>
              ))}
            </ul>
          </Reveal>
          <Reveal delay={120} className="pain-right">
            <div className="promise-card">
              <span className="promise-icon"><Sparkles size={18} /></span>
              <h3>ResumeLoka changes that.</h3>
              <p>
                Instead of guessing, you get a clear, recruiter-grade read on your résumé and a
                shortlist of jobs you’re actually qualified for — so every application is a real shot.
              </p>
              <a href="#cta" onClick={go("cta")} className="btn btn-primary">Get my breakdown <ArrowRight size={16} /></a>
            </div>
          </Reveal>
        </div>
      </section>

      {/* features */}
      <section className="section" id="features">
        <Reveal><p className="eyebrow">Features</p></Reveal>
        <Reveal delay={60}><h2 className="section-title">Everything you need to fix it — and get hired.</h2></Reveal>
        <div className="feat-grid">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={80 + (i % 3) * 70}>
              <div className="feat-card">
                <span className={"feat-icon " + f.cls}>{f.icon}</span>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* stats */}
      <section className="stats-band">
        {STATS.map((s, i) => (
          <Reveal key={i} delay={i * 90} className="stat">
            <span className="stat-num">{s.num}</span>
            <span className="stat-label">{s.label}</span>
          </Reveal>
        ))}
      </section>

      {/* reviews */}
      <section className="section" id="reviews">
        <Reveal><p className="eyebrow">Reviews</p></Reveal>
        <Reveal delay={60}><h2 className="section-title">Job seekers are getting callbacks.</h2></Reveal>
        <div className="review-grid">
          {REVIEWS.map((r, i) => (
            <Reveal key={r.name} delay={90 + i * 90}>
              <figure className="review-card">
                <div className="stars sm">{[0, 1, 2, 3, 4].map((k) => <Star key={k} size={13} fill="currentColor" strokeWidth={0} />)}</div>
                <blockquote>“{r.quote}”</blockquote>
                <figcaption>
                  <span className="rv-ava">{r.name.split(" ").map((p) => p[0]).join("").slice(0, 2)}</span>
                  <span><b>{r.name}</b><i>{r.role}</i></span>
                </figcaption>
              </figure>
            </Reveal>
          ))}
        </div>
      </section>

      {/* pricing */}
      <section className="section" id="pricing">
        <Reveal><p className="eyebrow">Pricing</p></Reveal>
        <Reveal delay={60}><h2 className="section-title">Start free. Upgrade when you’re serious.</h2></Reveal>
        <div className="plan-grid">
          {PLANS.map((p, i) => (
            <Reveal key={p.name} delay={90 + i * 90}>
              <div className={"plan-card" + (p.primary ? " featured" : "")}>
                {p.primary && <span className="plan-badge">Most popular</span>}
                <p className="plan-name">{p.name}</p>
                <p className="plan-price"><span className="mono">{p.price}</span> <i>{p.note}</i></p>
                <ul className="plan-items">
                  {p.items.map((it) => (
                    <li key={it}><span className="plan-check"><Check size={13} strokeWidth={3} /></span>{it}</li>
                  ))}
                </ul>
                <a href="#cta" onClick={go("cta")} className={"btn " + (p.primary ? "btn-primary" : "btn-ghost")}>{p.cta}</a>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* faq */}
      <section className="section faq-section">
        <Reveal><p className="eyebrow">FAQ</p></Reveal>
        <Reveal delay={60}><h2 className="section-title">Good questions, quick answers.</h2></Reveal>
        <div className="faq-list">
          {FAQS.map((f, i) => (
            <Reveal key={i} delay={60 + i * 50}>
              <div className={"faq-item" + (faq === i ? " open" : "")}>
                <button className="faq-q" onClick={() => setFaq(faq === i ? -1 : i)}>
                  {f.q}<ChevronDown size={18} className="faq-chev" />
                </button>
                <div className="faq-a"><p>{f.a}</p></div>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* final cta */}
      <section className="cta-band" id="cta">
        <Reveal>
          <div className="cta-inner">
            <h2>Ready to find out why you’re not getting interviews?</h2>
            <p>Upload your résumé and get your score, your fixes, and your job matches — free, in seconds.</p>
            <a href="#top" onClick={go("top")} className="btn btn-light btn-lg">
              <Upload size={17} /> Analyze my résumé now
            </a>
            <span className="cta-fine">No card required · your first analysis is on us</span>
          </div>
        </Reveal>
      </section>

      {/* footer */}
      <footer className="footer">
        <div className="foot-top">
          <a href="#top" onClick={go("top")} className="brand">
            <span className="brand-mark"><Sparkles size={16} strokeWidth={2.4} /></span>
            <span className="brand-name">Resume<b>Loka</b></span>
          </a>
          <nav className="foot-links">
            <a href="#how" onClick={go("how")}>How it works</a>
            <a href="#features" onClick={go("features")}>Features</a>
            <a href="#pricing" onClick={go("pricing")}>Pricing</a>
            <a href="#reviews" onClick={go("reviews")}>Reviews</a>
          </nav>
        </div>
        <div className="foot-bottom">
          <span>© 2026 ResumeLoka. Built for people who deserve a callback.</span>
          <span className="foot-legal">Privacy · Terms</span>
        </div>
      </footer>
    </div>
  );
}

/* ------------------------------ app mock ------------------------------ */

function AppMock() {
  const r = 34, c = 2 * Math.PI * r;
  const [val, setVal] = useState(0);
  useEffect(() => {
    const id = setTimeout(() => setVal(82), 300);
    return () => clearTimeout(id);
  }, []);
  return (
    <div className="mock">
      <div className="mock-bar">
        <span className="mock-dot" /><span className="mock-dot" /><span className="mock-dot" />
        <span className="mock-file mono">resume_nattakit.pdf</span>
      </div>
      <div className="mock-body">
        <div className="mock-score">
          <div className="mini-ring">
            <svg viewBox="0 0 84 84" width="84" height="84">
              <circle cx="42" cy="42" r={r} className="mr-track" />
              <circle cx="42" cy="42" r={r} className="mr-fill" strokeDasharray={c}
                strokeDashoffset={c - (c * val) / 100} transform="rotate(-90 42 42)" />
            </svg>
            <span className="mr-num mono">{val}</span>
          </div>
          <div>
            <p className="mock-k">Résumé score</p>
            <p className="mock-h">Strong, with room to sharpen</p>
          </div>
        </div>

        <div className="mock-chips">
          <span className="chip good"><ThumbsUp size={12} /> 3 advantages</span>
          <span className="chip warn"><AlertTriangle size={12} /> 3 to fix</span>
          <span className="chip tip"><Lightbulb size={12} /> 4 tips</span>
        </div>

        <div className="mock-job">
          <div>
            <p className="mj-title">Senior Frontend Developer</p>
            <p className="mj-co">Agoda · Bangkok</p>
          </div>
          <span className="mj-match mono">92%</span>
        </div>

        <div className="mock-chat">
          <span className="mc-ava"><Bot size={13} /></span>
          <p>Add a 2-line summary and quantify your wins — that alone lifts you into the top tier.</p>
        </div>
      </div>

      <span className="float-tag tag-a"><Check size={12} strokeWidth={3} /> Matched to JobThai</span>
      <span className="float-tag tag-b"><Zap size={12} /> Analyzed in 2.4s</span>
    </div>
  );
}

/* -------------------------------- styles ------------------------------ */

const CSS = `
.lp{
  --ink:#101426; --ink-soft:#5a6076; --ink-faint:#8b91a6;
  --line:#e9ecf3; --paper:#ffffff; --panel:#f6f8fc; --panel-2:#eef1f8;
  --brand:#4f46e5; --brand-press:#4338ca; --brand-soft:#eceafe;
  --good:#0ea672; --good-bg:#e9f8f1;
  --warn:#e08a16; --warn-bg:#fdf3e3;
  --tip:#7c5cf0; --tip-bg:#f1edfe;
  --jobthai:#f25c2a; --jobsdb:#1f6fe5;
  --shadow:0 1px 2px rgba(16,20,38,.05), 0 14px 40px -22px rgba(16,20,38,.3);
  font-family:'Inter',system-ui,sans-serif; color:var(--ink); background:var(--paper);
  -webkit-font-smoothing:antialiased; overflow-x:hidden;
}
.lp *{box-sizing:border-box;}
.lp h1,.lp h2,.lp h3{font-family:'Space Grotesk','Inter',sans-serif; margin:0; letter-spacing:-.02em;}
.lp p{margin:0;}
.mono{font-family:'IBM Plex Mono',monospace; font-variant-numeric:tabular-nums;}

/* buttons */
.btn{display:inline-flex; align-items:center; justify-content:center; gap:8px; border:none; cursor:pointer;
  font-family:'Inter',sans-serif; font-weight:600; font-size:14.5px; border-radius:12px;
  padding:11px 18px; transition:transform .12s, box-shadow .12s, background .15s, filter .15s; text-decoration:none; white-space:nowrap;}
.btn:active{transform:translateY(1px);}
.btn-lg{padding:14px 24px; font-size:15.5px;}
.btn-primary{background:var(--brand); color:#fff; box-shadow:0 10px 22px -10px rgba(79,70,229,.75);}
.btn-primary:hover{background:var(--brand-press);}
.btn-ghost{background:var(--paper); color:var(--ink); border:1px solid var(--line);}
.btn-ghost:hover{border-color:#cdd4e3;}
.btn-light{background:#fff; color:var(--brand); box-shadow:0 12px 26px -12px rgba(0,0,0,.4);}
.btn-light:hover{filter:brightness(.97);}

/* nav */
.nav{position:sticky; top:0; z-index:50; display:flex; align-items:center; justify-content:space-between;
  padding:14px 30px; background:rgba(255,255,255,.82); backdrop-filter:blur(12px); border-bottom:1px solid var(--line);}
.brand{display:flex; align-items:center; gap:9px; text-decoration:none; color:var(--ink);}
.brand-mark{display:grid; place-items:center; width:30px; height:30px; border-radius:9px; background:var(--brand); color:#fff;}
.brand-name{font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:18px;}
.brand-name b{font-weight:700; color:var(--brand);}
.nav-links{display:flex; align-items:center; gap:26px;}
.nav-links>a{font-size:14px; font-weight:500; color:var(--ink-soft); text-decoration:none; transition:color .15s;}
.nav-links>a:hover{color:var(--ink);}
.nav-cta{color:#fff !important; padding:9px 16px; font-size:14px;}
.nav-burger{display:none; border:none; background:transparent; cursor:pointer; color:var(--ink);}

/* hero */
.hero{display:grid; grid-template-columns:1.05fr .95fr; gap:48px; align-items:center;
  max-width:1180px; margin:0 auto; padding:72px 30px 64px;}
.pill{display:inline-flex; align-items:center; gap:8px; font-size:12.5px; font-weight:500; color:var(--brand);
  background:var(--brand-soft); border-radius:30px; padding:6px 14px;}
.pill-dot{width:7px; height:7px; border-radius:50%; background:var(--good); box-shadow:0 0 0 3px rgba(14,166,114,.18);}
.hero-title{font-size:52px; font-weight:700; line-height:1.04; margin:20px 0 18px;}
.hero-title .hl{color:var(--brand); position:relative; white-space:nowrap;}
.hero-sub{font-size:17px; line-height:1.6; color:var(--ink-soft); max-width:520px;}
.hero-sub b{color:var(--ink); font-weight:600;}
.hero-actions{display:flex; flex-wrap:wrap; gap:12px; margin:28px 0 22px;}
.hero-trust{display:flex; align-items:center; gap:11px; font-size:13.5px; color:var(--ink-soft);}
.hero-trust b{color:var(--ink);}
.stars{display:inline-flex; gap:2px; color:#f6b73c;}
.stars.sm{color:#f6b73c;}

/* app mock */
.hero-visual{display:grid; place-items:center; position:relative;}
.mock{position:relative; width:100%; max-width:380px; background:var(--paper); border:1px solid var(--line);
  border-radius:20px; box-shadow:var(--shadow); overflow:hidden;}
.mock-bar{display:flex; align-items:center; gap:6px; padding:12px 15px; border-bottom:1px solid var(--line); background:var(--panel);}
.mock-dot{width:9px; height:9px; border-radius:50%; background:#d7dce8;}
.mock-file{margin-left:8px; font-size:11px; color:var(--ink-faint);}
.mock-body{padding:18px; display:grid; gap:13px;}
.mock-score{display:flex; align-items:center; gap:15px;}
.mini-ring{position:relative; width:84px; height:84px; flex-shrink:0;}
.mr-track{fill:none; stroke:var(--panel-2); stroke-width:8;}
.mr-fill{fill:none; stroke:var(--brand); stroke-width:8; stroke-linecap:round; transition:stroke-dashoffset 1.2s cubic-bezier(.3,.8,.3,1);}
.mr-num{position:absolute; inset:0; display:grid; place-items:center; font-size:23px; font-weight:600;}
.mock-k{font-family:'IBM Plex Mono',monospace; font-size:10px; letter-spacing:.1em; text-transform:uppercase; color:var(--brand);}
.mock-h{font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:15px; margin-top:4px;}
.mock-chips{display:flex; flex-wrap:wrap; gap:7px;}
.chip{display:inline-flex; align-items:center; gap:5px; font-size:11.5px; font-weight:500; padding:5px 10px; border-radius:8px;}
.chip.good{background:var(--good-bg); color:var(--good);}
.chip.warn{background:var(--warn-bg); color:var(--warn);}
.chip.tip{background:var(--tip-bg); color:var(--tip);}
.mock-job{display:flex; align-items:center; justify-content:space-between; gap:10px;
  background:var(--panel); border:1px solid var(--line); border-radius:12px; padding:12px 13px;}
.mj-title{font-size:13.5px; font-weight:600;}
.mj-co{font-size:11.5px; color:var(--ink-soft); margin-top:2px;}
.mj-match{font-size:15px; font-weight:600; color:var(--good);}
.mock-chat{display:flex; gap:8px; align-items:flex-start;}
.mc-ava{display:grid; place-items:center; width:24px; height:24px; border-radius:7px; background:var(--brand); color:#fff; flex-shrink:0;}
.mock-chat p{font-size:12.5px; line-height:1.45; color:var(--ink); background:var(--panel); padding:9px 11px; border-radius:11px; border-bottom-left-radius:3px;}
.float-tag{position:absolute; display:inline-flex; align-items:center; gap:6px; font-size:11.5px; font-weight:600;
  background:var(--paper); border:1px solid var(--line); box-shadow:var(--shadow); padding:7px 11px; border-radius:10px;}
.tag-a{top:18px; right:-14px; color:var(--good); animation:floaty 4s ease-in-out infinite;}
.tag-b{bottom:30px; left:-18px; color:var(--brand); animation:floaty 4.6s ease-in-out infinite .4s;}
@keyframes floaty{0%,100%{transform:translateY(0);}50%{transform:translateY(-7px);}}

/* boards strip */
.strip{display:flex; flex-wrap:wrap; align-items:center; justify-content:center; gap:18px;
  padding:24px; border-top:1px solid var(--line); border-bottom:1px solid var(--line); background:var(--panel);}
.strip-label{font-size:12.5px; letter-spacing:.04em; color:var(--ink-faint); text-transform:uppercase;}
.strip-logos{display:flex; align-items:center; gap:16px;}
.board{font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:20px;}
.board.jobthai{color:var(--jobthai);}
.board.jobsdb{color:var(--jobsdb);}
.dot-sep{width:5px; height:5px; border-radius:50%; background:#cbd2e0;}
.strip-more{font-size:12.5px; color:var(--ink-faint);}

/* sections */
.section{max-width:1100px; margin:0 auto; padding:84px 30px;}
.eyebrow{font-family:'IBM Plex Mono',monospace; font-size:12px; letter-spacing:.14em; text-transform:uppercase; color:var(--brand); text-align:center;}
.section-title{font-size:34px; font-weight:700; line-height:1.14; text-align:center; max-width:680px; margin:14px auto 0;}

/* steps */
.steps{display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:48px;}
.step{background:var(--paper); border:1px solid var(--line); border-radius:18px; padding:24px; box-shadow:var(--shadow); height:100%;}
.step-top{display:flex; align-items:center; justify-content:space-between; margin-bottom:16px;}
.step-icon{display:grid; place-items:center; width:42px; height:42px; border-radius:12px; background:var(--brand-soft); color:var(--brand);}
.step-n{font-size:13px; color:var(--ink-faint);}
.step h3{font-size:17px; margin-bottom:8px;}
.step p{font-size:14px; line-height:1.55; color:var(--ink-soft);}

/* pain */
.pain-section{padding-top:24px;}
.pain-grid{display:grid; grid-template-columns:1fr 1fr; gap:40px; align-items:center;}
.pain-left .eyebrow,.pain-left .section-title{text-align:left; margin-left:0;}
.pain-left .section-title{font-size:30px; margin-top:12px;}
.pain-list{list-style:none; margin:22px 0 0; padding:0; display:grid; gap:13px;}
.pain-list li{display:flex; gap:11px; font-size:15px; line-height:1.5; color:var(--ink-soft);}
.x-mark{display:grid; place-items:center; width:20px; height:20px; border-radius:6px; background:#fdecec; color:#e0584f; flex-shrink:0; margin-top:1px;}
.promise-card{background:var(--ink); color:#fff; border-radius:20px; padding:30px; box-shadow:var(--shadow);}
.promise-icon{display:grid; place-items:center; width:46px; height:46px; border-radius:13px; background:var(--brand); color:#fff; margin-bottom:16px;}
.promise-card h3{font-size:22px; margin-bottom:11px;}
.promise-card p{font-size:14.5px; line-height:1.6; color:#c4c8d6; margin-bottom:22px;}

/* features */
.feat-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:48px;}
.feat-card{background:var(--paper); border:1px solid var(--line); border-radius:16px; padding:22px; box-shadow:var(--shadow); height:100%; transition:transform .15s, box-shadow .15s;}
.feat-card:hover{transform:translateY(-3px); box-shadow:0 1px 2px rgba(16,20,38,.05), 0 22px 44px -22px rgba(16,20,38,.4);}
.feat-icon{display:grid; place-items:center; width:40px; height:40px; border-radius:11px; margin-bottom:15px;}
.feat-icon.f-brand{background:var(--brand-soft); color:var(--brand);}
.feat-icon.f-good{background:var(--good-bg); color:var(--good);}
.feat-icon.f-warn{background:var(--warn-bg); color:var(--warn);}
.feat-icon.f-tip{background:var(--tip-bg); color:var(--tip);}
.feat-card h3{font-size:16px; margin-bottom:8px;}
.feat-card p{font-size:13.5px; line-height:1.55; color:var(--ink-soft);}

/* stats */
.stats-band{display:grid; grid-template-columns:repeat(3,1fr); gap:24px; max-width:980px; margin:0 auto;
  padding:46px 30px; background:var(--panel); border-radius:22px;}
.stat{text-align:center;}
.stat-num{display:block; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:38px; color:var(--brand); letter-spacing:-.02em;}
.stat-label{display:block; font-size:13.5px; line-height:1.5; color:var(--ink-soft); margin-top:8px; max-width:240px; margin-inline:auto;}

/* reviews */
.review-grid{display:grid; grid-template-columns:repeat(3,1fr); gap:18px; margin-top:48px;}
.review-card{background:var(--paper); border:1px solid var(--line); border-radius:16px; padding:22px; box-shadow:var(--shadow); height:100%; display:flex; flex-direction:column;}
.review-card blockquote{margin:13px 0 18px; font-size:14.5px; line-height:1.6; color:var(--ink);}
.review-card figcaption{display:flex; align-items:center; gap:11px; margin-top:auto;}
.rv-ava{display:grid; place-items:center; width:38px; height:38px; border-radius:11px;
  background:linear-gradient(135deg,#6366f1,#8b5cf6); color:#fff; font-family:'Space Grotesk',sans-serif; font-weight:700; font-size:14px; flex-shrink:0;}
.review-card figcaption b{display:block; font-size:13.5px;}
.review-card figcaption i{display:block; font-size:12px; font-style:normal; color:var(--ink-soft); margin-top:1px;}

/* pricing */
.plan-grid{display:grid; grid-template-columns:repeat(2,minmax(0,340px)); gap:20px; justify-content:center; margin-top:48px;}
.plan-card{position:relative; background:var(--paper); border:1px solid var(--line); border-radius:20px; padding:28px; box-shadow:var(--shadow); display:flex; flex-direction:column;}
.plan-card.featured{border:1.5px solid var(--brand); box-shadow:0 1px 2px rgba(16,20,38,.05), 0 26px 50px -24px rgba(79,70,229,.5);}
.plan-badge{position:absolute; top:-12px; left:28px; font-size:11px; font-weight:600; letter-spacing:.04em; text-transform:uppercase;
  background:var(--brand); color:#fff; padding:5px 12px; border-radius:20px;}
.plan-name{font-family:'Space Grotesk',sans-serif; font-weight:600; font-size:15px; color:var(--ink-soft);}
.plan-price{display:flex; align-items:baseline; gap:6px; margin:8px 0 20px;}
.plan-price .mono{font-size:36px; font-weight:600; color:var(--ink);}
.plan-price i{font-size:13px; font-style:normal; color:var(--ink-faint);}
.plan-items{list-style:none; margin:0 0 24px; padding:0; display:grid; gap:11px; flex:1;}
.plan-items li{display:flex; gap:10px; font-size:13.5px; line-height:1.45; color:var(--ink-soft);}
.plan-check{display:grid; place-items:center; width:18px; height:18px; border-radius:6px; background:var(--good-bg); color:var(--good); flex-shrink:0; margin-top:1px;}
.plan-card .btn{width:100%;}

/* faq */
.faq-section{max-width:760px;}
.faq-list{margin-top:40px; display:grid; gap:11px;}
.faq-item{background:var(--paper); border:1px solid var(--line); border-radius:14px; overflow:hidden;}
.faq-item.open{border-color:#d3d8e6;}
.faq-q{width:100%; display:flex; align-items:center; justify-content:space-between; gap:14px; text-align:left;
  border:none; background:transparent; cursor:pointer; padding:17px 19px; font-family:'Space Grotesk',sans-serif;
  font-weight:600; font-size:15.5px; color:var(--ink);}
.faq-chev{color:var(--ink-faint); transition:transform .25s;}
.faq-item.open .faq-chev{transform:rotate(180deg); color:var(--brand);}
.faq-a{max-height:0; overflow:hidden; transition:max-height .3s ease;}
.faq-item.open .faq-a{max-height:200px;}
.faq-a p{padding:0 19px 18px; font-size:14px; line-height:1.6; color:var(--ink-soft);}

/* final cta */
.cta-band{padding:30px;}
.cta-inner{max-width:780px; margin:0 auto; text-align:center; background:linear-gradient(135deg,#4f46e5,#7c5cf0);
  border-radius:28px; padding:62px 40px; color:#fff; box-shadow:0 30px 60px -28px rgba(79,70,229,.7);}
.cta-inner h2{font-size:34px; line-height:1.15; max-width:620px; margin:0 auto 14px;}
.cta-inner p{font-size:16px; line-height:1.55; color:#e4e2fb; max-width:520px; margin:0 auto 28px;}
.cta-fine{display:block; font-size:12.5px; color:#c9c5f3; margin-top:16px;}

/* footer */
.footer{max-width:1100px; margin:0 auto; padding:48px 30px 36px;}
.foot-top{display:flex; align-items:center; justify-content:space-between; gap:20px; padding-bottom:26px; border-bottom:1px solid var(--line); flex-wrap:wrap;}
.foot-links{display:flex; gap:24px; flex-wrap:wrap;}
.foot-links a{font-size:14px; color:var(--ink-soft); text-decoration:none;}
.foot-links a:hover{color:var(--ink);}
.foot-bottom{display:flex; align-items:center; justify-content:space-between; gap:14px; margin-top:22px; font-size:13px; color:var(--ink-faint); flex-wrap:wrap;}

/* reveal */
.reveal{opacity:0; transform:translateY(16px); transition:opacity .6s cubic-bezier(.2,.7,.3,1), transform .6s cubic-bezier(.2,.7,.3,1);}
.reveal.in{opacity:1; transform:none;}

/* focus */
.lp button:focus-visible,.lp a:focus-visible{outline:2px solid var(--brand); outline-offset:3px;}

/* responsive */
@media(max-width:920px){
  .hero{grid-template-columns:1fr; gap:44px; padding-top:48px;}
  .hero-title{font-size:42px;}
  .hero-copy{text-align:center;}
  .pill,.hero-actions,.hero-trust{justify-content:center;}
  .hero-sub{margin-inline:auto;}
  .steps,.feat-grid,.review-grid,.stats-band{grid-template-columns:1fr;}
  .pain-grid{grid-template-columns:1fr; gap:28px;}
  .pain-left .eyebrow,.pain-left .section-title{text-align:center; margin-inline:auto;}
  .plan-grid{grid-template-columns:1fr;}
  .float-tag{display:none;}
}
@media(max-width:680px){
  .nav-links{position:absolute; top:62px; left:0; right:0; flex-direction:column; align-items:stretch; gap:4px;
    background:var(--paper); border-bottom:1px solid var(--line); padding:14px 20px 18px; display:none;}
  .nav-links.open{display:flex;}
  .nav-links>a{padding:11px 6px;}
  .nav-cta{text-align:center; margin-top:6px;}
  .nav-burger{display:grid; place-items:center;}
  .hero-title{font-size:34px;}
  .section{padding:60px 22px;}
  .section-title{font-size:27px;}
  .cta-inner{padding:44px 24px;} .cta-inner h2{font-size:27px;}
  .feat-grid,.review-grid{margin-top:34px;}
}
@media(prefers-reduced-motion:reduce){
  .reveal{transition:none; opacity:1; transform:none;}
  .float-tag,.mr-fill{animation:none; transition:none;}
}
`;
