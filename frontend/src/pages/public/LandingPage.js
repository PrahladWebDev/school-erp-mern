import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';

const MODULES = [
  { icon: '👨‍🎓', title: 'Students', desc: 'Admissions, records & ID cards in one place.' },
  { icon: '👩‍🏫', title: 'Teachers', desc: 'Staff profiles, assignments & workload.' },
  { icon: '✅', title: 'Attendance', desc: 'Daily attendance for students & staff.' },
  { icon: '💰', title: 'Fees', desc: 'Collection, receipts & dues tracking.' },
  { icon: '📋', title: 'Exams', desc: 'Marks entry, results & report cards.' },
  { icon: '📅', title: 'Timetable', desc: 'Class schedules built in minutes.' },
  { icon: '📝', title: 'Homework', desc: 'Assign and track homework by class.' },
  { icon: '📣', title: 'Notices', desc: 'School-wide announcements, instantly.' },
];

const ROLES = [
  { icon: '👑', title: 'Super Admin', desc: 'Onboard schools, manage the whole network from one console.' },
  { icon: '🏫', title: 'School Admin', desc: 'Run day-to-day operations for a single school.' },
  { icon: '👩‍🏫', title: 'Teachers', desc: 'Mark attendance, set homework, enter exam marks.' },
  { icon: '👨‍🎓', title: 'Students & Parents', desc: 'Track attendance, fees, results & homework.' },
];

const STEPS = [
  { n: '01', title: 'Super Admin onboards your school', desc: 'A school profile is created with its own admin login — no setup required on your end.' },
  { n: '02', title: 'School Admin adds people', desc: 'Add teachers, students and classes; parent & student logins are generated automatically.' },
  { n: '03', title: 'Everyone gets to work', desc: 'Attendance, fees, exams, homework and notices flow through one connected system.' },
];

export default function LandingPage() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <div className="lp">
      {/* ── Nav ───────────────────────────────────────────── */}
      <header className={`lp-nav ${scrolled ? 'lp-nav--scrolled' : ''}`}>
        <div className="lp-nav__inner">
          <div className="lp-brand">
            <span className="lp-brand__icon">🏫</span>
            <span className="lp-brand__name">School ERP</span>
          </div>
          <nav className="lp-nav__links">
            <a href="#modules">Modules</a>
            <a href="#roles">Who it's for</a>
            <a href="#how">How it works</a>
          </nav>
          <Link to="/login" className="lp-btn lp-btn--primary lp-btn--sm">Login</Link>
        </div>
      </header>

      {/* ── Hero ──────────────────────────────────────────── */}
      <section className="lp-hero">
        <div className="lp-hero__bg" aria-hidden="true" />
        <div className="lp-hero__inner">
          <div className="lp-hero__copy">
            <span className="lp-eyebrow">Built for rural &amp; private schools</span>
            <h1 className="lp-hero__title">
              One system to run<br />your entire school.
            </h1>
            <p className="lp-hero__sub">
              Attendance, fees, exams, homework and notices — for admins,
              teachers, students and parents, all in a single connected platform.
            </p>
            <div className="lp-hero__cta">
              <Link to="/login" className="lp-btn lp-btn--primary lp-btn--lg">
                Login to your account
              </Link>
              <a href="#modules" className="lp-btn lp-btn--ghost lp-btn--lg">
                Explore features
              </a>
            </div>
          </div>

          <div className="lp-hero__art" aria-hidden="true">
            <div className="lp-card lp-card--main">
              <div className="lp-card__head">
                <span className="lp-dot lp-dot--red" />
                <span className="lp-dot lp-dot--amber" />
                <span className="lp-dot lp-dot--green" />
                <span className="lp-card__title">Today's overview</span>
              </div>
              <div className="lp-card__row">
                <span>Attendance marked</span>
                <span className="lp-card__bar"><i style={{ width: '92%' }} /></span>
                <span className="lp-card__pct">92%</span>
              </div>
              <div className="lp-card__row">
                <span>Fees collected</span>
                <span className="lp-card__bar"><i style={{ width: '68%', background: 'var(--accent)' }} /></span>
                <span className="lp-card__pct">68%</span>
              </div>
              <div className="lp-card__row">
                <span>Homework submitted</span>
                <span className="lp-card__bar"><i style={{ width: '77%', background: 'var(--success)' }} /></span>
                <span className="lp-card__pct">77%</span>
              </div>
            </div>
            <div className="lp-card lp-card--float lp-card--float1">
              <span className="lp-card__emoji">📣</span>
              <div>
                <div className="lp-card__float-title">New notice posted</div>
                <div className="lp-card__float-sub">Annual Day — Dec 12</div>
              </div>
            </div>
            <div className="lp-card lp-card--float lp-card--float2">
              <span className="lp-card__emoji">✅</span>
              <div>
                <div className="lp-card__float-title">Class 6-B attendance</div>
                <div className="lp-card__float-sub">Marked for today</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Modules ───────────────────────────────────────── */}
      <section id="modules" className="lp-section">
        <div className="lp-section__head">
          <span className="lp-eyebrow">Everything in one place</span>
          <h2>Modules that cover the whole school day</h2>
        </div>
        <div className="lp-grid">
          {MODULES.map(m => (
            <div className="lp-tile" key={m.title}>
              <div className="lp-tile__icon">{m.icon}</div>
              <h3>{m.title}</h3>
              <p>{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Roles ─────────────────────────────────────────── */}
      <section id="roles" className="lp-section lp-section--tint">
        <div className="lp-section__head">
          <span className="lp-eyebrow">One login per person</span>
          <h2>Built for everyone in the school</h2>
        </div>
        <div className="lp-roles">
          {ROLES.map(r => (
            <div className="lp-role" key={r.title}>
              <div className="lp-role__icon">{r.icon}</div>
              <h3>{r.title}</h3>
              <p>{r.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── How it works ─────────────────────────────────── */}
      <section id="how" className="lp-section">
        <div className="lp-section__head">
          <span className="lp-eyebrow">Getting started</span>
          <h2>From onboarding to everyday use</h2>
        </div>
        <div className="lp-steps">
          {STEPS.map((s, i) => (
            <div className="lp-step" key={s.n}>
              <div className="lp-step__num">{s.n}</div>
              <div>
                <h3>{s.title}</h3>
                <p>{s.desc}</p>
              </div>
              {i < STEPS.length - 1 && <div className="lp-step__line" aria-hidden="true" />}
            </div>
          ))}
        </div>
      </section>

      {/* ── CTA ───────────────────────────────────────────── */}
      <section className="lp-cta">
        <div className="lp-cta__inner">
          <h2>Ready to sign in?</h2>
          <p>Use the credentials issued to your school to access your dashboard.</p>
          <Link to="/login" className="lp-btn lp-btn--primary lp-btn--lg">Login to your account</Link>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="lp-footer">
        <div className="lp-brand">
          <span className="lp-brand__icon">🏫</span>
          <span className="lp-brand__name">School ERP</span>
        </div>
        <p>Complete School Management System for Rural &amp; Private Schools.</p>
        <p className="lp-footer__copy">© {new Date().getFullYear()} School ERP. All rights reserved.</p>
      </footer>

      <style>{`
        .lp { font-family: var(--font-sans); color: var(--gray-900); overflow-x: hidden; }
        .lp h1, .lp h2, .lp h3 { font-family: var(--font-display); }
        .lp a { text-decoration: none; }

        /* Nav */
        .lp-nav {
          position: fixed; top: 0; left: 0; right: 0; z-index: 50;
          padding: 18px 0; transition: background .25s ease, box-shadow .25s ease, padding .25s ease;
        }
        .lp-nav--scrolled {
          background: rgba(255,255,255,.92); backdrop-filter: blur(8px);
          box-shadow: var(--shadow-sm); padding: 12px 0;
        }
        .lp-nav__inner {
          max-width: 1140px; margin: 0 auto; padding: 0 24px;
          display: flex; align-items: center; justify-content: space-between; gap: 24px;
        }
        .lp-brand { display: flex; align-items: center; gap: 10px; }
        .lp-brand__icon {
          width: 36px; height: 36px; border-radius: 9px; background: var(--primary);
          display: flex; align-items: center; justify-content: center; font-size: 1.1rem;
        }
        .lp-brand__name { font-family: var(--font-display); font-weight: 700; font-size: 1.05rem; color: var(--gray-900); }
        .lp-nav--scrolled .lp-brand__name { color: var(--gray-900); }
        .lp-nav:not(.lp-nav--scrolled) .lp-brand__name { color: #fff; }
        .lp-nav__links { display: flex; gap: 28px; flex: 1; justify-content: center; }
        .lp-nav__links a {
          font-size: .9rem; font-weight: 500; color: rgba(255,255,255,.85);
          transition: color .2s;
        }
        .lp-nav--scrolled .lp-nav__links a { color: var(--gray-600); }
        .lp-nav__links a:hover { color: var(--accent); }

        /* Buttons */
        .lp-btn {
          display: inline-flex; align-items: center; justify-content: center; gap: 8px;
          border-radius: var(--radius); font-weight: 600; cursor: pointer; border: none;
          transition: transform .15s ease, box-shadow .15s ease, background .15s ease, color .15s ease;
          white-space: nowrap;
        }
        .lp-btn--sm { padding: 9px 18px; font-size: .85rem; }
        .lp-btn--lg { padding: 14px 28px; font-size: .95rem; }
        .lp-btn--primary { background: var(--accent); color: #1a1300; }
        .lp-btn--primary:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(245,166,35,.35); }
        .lp-btn--ghost { background: rgba(255,255,255,.12); color: #fff; border: 1.5px solid rgba(255,255,255,.35); }
        .lp-btn--ghost:hover { background: rgba(255,255,255,.2); transform: translateY(-2px); }

        /* Hero */
        .lp-hero { position: relative; padding: 150px 24px 110px; overflow: hidden; }
        .lp-hero__bg {
          position: absolute; inset: 0; z-index: -1;
          background: linear-gradient(160deg, var(--primary-dark) 0%, var(--primary) 55%, var(--primary-light) 100%);
        }
        .lp-hero__bg::after {
          content: ''; position: absolute; inset: 0;
          background: radial-gradient(circle at 85% 20%, rgba(245,166,35,.25), transparent 55%);
        }
        .lp-hero__inner {
          max-width: 1140px; margin: 0 auto;
          display: grid; grid-template-columns: 1.1fr 1fr; gap: 56px; align-items: center;
        }
        .lp-eyebrow {
          display: inline-block; font-size: .72rem; font-weight: 700; letter-spacing: .08em;
          text-transform: uppercase; color: var(--accent-light); margin-bottom: 16px;
        }
        .lp-hero__title {
          font-size: 2.85rem; font-weight: 800; line-height: 1.12; color: #fff; margin-bottom: 18px;
        }
        .lp-hero__sub {
          font-size: 1.05rem; line-height: 1.7; color: rgba(255,255,255,.78); max-width: 460px; margin-bottom: 32px;
        }
        .lp-hero__cta { display: flex; gap: 14px; flex-wrap: wrap; }

        /* Hero art */
        .lp-hero__art { position: relative; min-height: 360px; }
        .lp-card {
          background: #fff; border-radius: var(--radius-lg); box-shadow: var(--shadow-lg);
          padding: 20px;
        }
        .lp-card--main { position: relative; z-index: 2; }
        .lp-card__head { display: flex; align-items: center; gap: 7px; margin-bottom: 18px; }
        .lp-dot { width: 9px; height: 9px; border-radius: 50%; }
        .lp-dot--red { background: var(--danger); }
        .lp-dot--amber { background: var(--accent); }
        .lp-dot--green { background: var(--success); }
        .lp-card__title { margin-left: 8px; font-size: .8rem; font-weight: 700; color: var(--gray-500); }
        .lp-card__row {
          display: grid; grid-template-columns: 130px 1fr 40px; align-items: center; gap: 12px;
          font-size: .78rem; color: var(--gray-600); margin-bottom: 14px;
        }
        .lp-card__bar { background: var(--gray-100); border-radius: 6px; height: 7px; overflow: hidden; }
        .lp-card__bar i { display: block; height: 100%; background: var(--primary); border-radius: 6px; }
        .lp-card__pct { font-weight: 700; color: var(--gray-700); text-align: right; }
        .lp-card--float {
          position: absolute; display: flex; align-items: center; gap: 12px;
          padding: 14px 16px; width: 230px; z-index: 3;
          animation: lp-float 5s ease-in-out infinite;
        }
        .lp-card--float1 { top: -28px; right: -10px; animation-delay: .3s; }
        .lp-card--float2 { bottom: -24px; left: -28px; animation-delay: 1.1s; }
        .lp-card__emoji {
          width: 38px; height: 38px; border-radius: 10px; background: var(--gray-50);
          display: flex; align-items: center; justify-content: center; font-size: 1.1rem; flex-shrink: 0;
        }
        .lp-card__float-title { font-size: .8rem; font-weight: 700; color: var(--gray-800); }
        .lp-card__float-sub { font-size: .72rem; color: var(--gray-400); margin-top: 2px; }
        @keyframes lp-float { 0%, 100% { transform: translateY(0); } 50% { transform: translateY(-9px); } }

        /* Sections */
        .lp-section { max-width: 1140px; margin: 0 auto; padding: 96px 24px; }
        .lp-section--tint { max-width: none; background: var(--gray-50); padding: 96px 24px; }
        .lp-section--tint > * { max-width: 1140px; margin-left: auto; margin-right: auto; }
        .lp-section__head { text-align: center; max-width: 560px; margin: 0 auto 52px; }
        .lp-section__head h2 { font-size: 1.9rem; font-weight: 700; color: var(--gray-900); }

        .lp-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .lp-tile {
          background: #fff; border: 1px solid var(--gray-200); border-radius: var(--radius-lg);
          padding: 26px 22px; transition: transform .2s ease, box-shadow .2s ease, border-color .2s ease;
        }
        .lp-tile:hover { transform: translateY(-4px); box-shadow: var(--shadow); border-color: transparent; }
        .lp-tile__icon {
          width: 46px; height: 46px; border-radius: 12px; background: var(--gray-50);
          display: flex; align-items: center; justify-content: center; font-size: 1.3rem; margin-bottom: 16px;
        }
        .lp-tile h3 { font-size: 1rem; font-weight: 700; margin-bottom: 6px; }
        .lp-tile p { font-size: .85rem; color: var(--gray-500); line-height: 1.55; }

        .lp-roles { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
        .lp-role { text-align: center; padding: 8px 12px; }
        .lp-role__icon {
          width: 60px; height: 60px; border-radius: 16px; background: #fff; box-shadow: var(--shadow-sm);
          display: flex; align-items: center; justify-content: center; font-size: 1.6rem; margin: 0 auto 18px;
        }
        .lp-role h3 { font-size: .98rem; font-weight: 700; margin-bottom: 6px; }
        .lp-role p { font-size: .83rem; color: var(--gray-500); line-height: 1.55; }

        .lp-steps { display: flex; flex-direction: column; gap: 0; max-width: 720px; margin: 0 auto; }
        .lp-step { position: relative; display: flex; gap: 22px; padding-bottom: 44px; }
        .lp-step:last-child { padding-bottom: 0; }
        .lp-step__num {
          flex-shrink: 0; width: 48px; height: 48px; border-radius: 50%;
          background: var(--primary); color: #fff; font-family: var(--font-display); font-weight: 700;
          display: flex; align-items: center; justify-content: center; font-size: .85rem; z-index: 1;
        }
        .lp-step h3 { font-size: 1.05rem; font-weight: 700; margin-bottom: 6px; }
        .lp-step p { font-size: .88rem; color: var(--gray-500); line-height: 1.6; max-width: 480px; }
        .lp-step__line {
          position: absolute; left: 23px; top: 48px; bottom: -4px; width: 2px;
          background: var(--gray-200);
        }

        .lp-cta {
          background: linear-gradient(135deg, var(--primary-dark), var(--primary));
          padding: 80px 24px; text-align: center;
        }
        .lp-cta__inner h2 { color: #fff; font-size: 1.8rem; font-weight: 700; margin-bottom: 10px; }
        .lp-cta__inner p { color: rgba(255,255,255,.75); margin-bottom: 28px; }

        .lp-footer {
          padding: 48px 24px 32px; text-align: center; color: var(--gray-400);
        }
        .lp-footer .lp-brand { justify-content: center; margin-bottom: 12px; }
        .lp-footer .lp-brand__name { color: var(--gray-700); }
        .lp-footer p { font-size: .85rem; margin-bottom: 4px; }
        .lp-footer__copy { font-size: .75rem; color: var(--gray-300); margin-top: 14px; }

        @media (max-width: 920px) {
          .lp-hero__inner { grid-template-columns: 1fr; }
          .lp-hero__art { margin-top: 40px; min-height: 300px; }
          .lp-grid { grid-template-columns: repeat(2, 1fr); }
          .lp-roles { grid-template-columns: repeat(2, 1fr); }
          .lp-nav__links { display: none; }
        }
        @media (max-width: 560px) {
          .lp-hero { padding: 130px 18px 80px; }
          .lp-hero__title { font-size: 2.1rem; }
          .lp-grid { grid-template-columns: 1fr 1fr; gap: 14px; }
          .lp-section { padding: 64px 18px; }
          .lp-section--tint { padding: 64px 18px; }
          .lp-card--float { width: 200px; }
          .lp-card--float1 { right: -6px; }
          .lp-card--float2 { left: -10px; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lp-card--float { animation: none; }
          .lp-btn, .lp-tile { transition: none; }
        }
      `}</style>
    </div>
  );
}
