import { Link } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';

/* ─── Custom Icons ─────────────────────────────────────────── */
const IconTrophy = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="M9 3h10v8a5 5 0 01-10 0V3z" stroke="#91BE4D" strokeWidth="1.8" strokeLinejoin="round"/>
    <path d="M9 7H5a2 2 0 000 4h4" stroke="#91BE4D" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M19 7h4a2 2 0 010 4h-4" stroke="#91BE4D" strokeWidth="1.8" strokeLinecap="round"/>
    <path d="M14 16v5M10 24h8" stroke="#91BE4D" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const IconChart = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="M4 22L10 15l5 3 9-11" stroke="#ec9937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="15" r="1.5" fill="#ec9937"/>
    <circle cx="15" cy="18" r="1.5" fill="#ec9937"/>
    <path d="M4 4v18h20" stroke="#ec9937" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="3" y="6" width="22" height="19" rx="3" stroke="#91BE4D" strokeWidth="1.8"/>
    <path d="M3 11h22" stroke="#91BE4D" strokeWidth="1.8"/>
    <path d="M9 3v4M19 3v4" stroke="#91BE4D" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="8" y="15" width="4" height="4" rx="1" fill="#ec9937" opacity="0.7"/>
    <rect x="16" y="15" width="4" height="4" rx="1" fill="#91BE4D" opacity="0.5"/>
  </svg>
);

const IconLocation = () => (
  <svg width="28" height="28" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="M14 3a7 7 0 017 7c0 5-7 15-7 15S7 15 7 10a7 7 0 017-7z" stroke="#ec9937" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="14" cy="10" r="2.5" stroke="#ec9937" strokeWidth="1.8"/>
  </svg>
);

/* ─── Pickleball ball decoration ──────────────────────────── */
const Ball = ({ size = 60, opacity = 1 }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" aria-hidden="true" style={{ opacity }}>
    <defs>
      <radialGradient id={`bg${size}`} cx="35%" cy="30%" r="65%">
        <stop offset="0%" stopColor="#dff04a"/>
        <stop offset="100%" stopColor="#91BE4D"/>
      </radialGradient>
    </defs>
    <circle cx="40" cy="40" r="36" fill={`url(#bg${size})`}/>
    <circle cx="30" cy="28" r="10" fill="white" opacity="0.15"/>
    {[[28,22],[40,18],[52,22],[20,32],[32,30],[44,30],[56,32],[24,42],[36,40],[44,40],[56,42],[28,52],[40,56],[52,52]].map(([cx,cy],i)=>(
      <circle key={i} cx={cx} cy={cy} r="2.8" fill="#1a2e00" opacity="0.28"/>
    ))}
  </svg>
);

/* ─── Features data ────────────────────────────────────────── */
const FEATURES = [
  {
    Icon: IconTrophy,
    bg: 'bg-[#f4f8e8]',
    title: 'Tournament Log',
    desc: 'Record every tournament — categories, entry fees, prize winnings, medals. Profit calculated automatically per event.',
  },
  {
    Icon: IconChart,
    bg: 'bg-[#fff8ee]',
    title: 'Financial Dashboard',
    desc: 'See your total earnings, net profit, and spending in one view. Monthly trends, category breakdowns, and more.',
  },
  {
    Icon: IconCalendar,
    bg: 'bg-[#f4f8e8]',
    title: 'Calendar View',
    desc: 'All your tournaments laid out on a calendar. Tap any date to add or review events. Sync to Google Calendar in one click.',
  },
  {
    Icon: IconLocation,
    bg: 'bg-[#fff8ee]',
    title: 'Venue & Location',
    desc: 'Save tournament venues with full address and map link. One tap to get directions on the day.',
  },
];

/* ─── Steps data ───────────────────────────────────────────── */
const STEPS = [
  { num: '01', title: 'Sign up free', desc: 'Create your account in under a minute. No credit card, no catch.' },
  { num: '02', title: 'Log your first tournament', desc: 'Add the tournament name, category, entry fee, and prize. Done.' },
  { num: '03', title: 'Watch your progress', desc: 'Your dashboard fills up automatically. Profit, spending, trends — all clear.' },
];

/* ─── Landing Page ─────────────────────────────────────────── */
export default function Landing() {
  const year = new Date().getFullYear();

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Navbar ────────────────────────────────────────── */}
      <header className="bg-white sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 h-16 flex items-center justify-between">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2.5 flex-shrink-0">
            <BrandLogo size="lg" />
          </Link>

          {/* Nav actions */}
          <div className="flex items-center gap-2 sm:gap-4">
            <Link
              to="/login"
              className="text-sm font-medium text-[#272702] hover:text-[#91BE4D] transition-colors px-3 py-2"
            >
              Sign In
            </Link>
            <Link
              to="/signup"
              className="text-sm font-bold bg-[#91BE4D] hover:bg-[#7aaa2e] text-white px-5 py-2.5 rounded-lg tracking-wide transition-colors shadow-sm shadow-green-200"
            >
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ──────────────────────────────────────────── */}
        <section className="relative bg-[#1c350a] overflow-hidden">
          {/* Subtle texture overlay */}
          <div className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
          />
          {/* Glow */}
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-[#91BE4D] opacity-10 rounded-full blur-3xl -translate-y-1/3 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[300px] h-[300px] bg-[#ec9937] opacity-8 rounded-full blur-3xl translate-y-1/3 -translate-x-1/3" />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28 lg:py-32">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

              {/* Text */}
              <div className="flex-1 text-center lg:text-left">
                <span className="inline-block bg-[#91BE4D]/15 border border-[#91BE4D]/25 text-[#91BE4D] text-[11px] font-bold px-3 py-1.5 rounded-full mb-6 tracking-[0.12em] uppercase">
                  Built for Indian pickleball players
                </span>
                <h1 className="text-4xl sm:text-5xl lg:text-[3.6rem] font-extrabold text-white leading-[1.12] mb-5 tracking-[-0.01em]">
                  Know exactly where<br />
                  you stand as a player.
                </h1>
                <p className="text-base sm:text-lg text-slate-300 leading-relaxed mb-9 max-w-lg mx-auto lg:mx-0">
                  Log tournaments, track entry fees, record prize winnings. PickleTracker gives you a clear financial picture of your pickleball game.
                </p>
                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center gap-2 bg-[#ec9937] hover:bg-[#d4831f] text-white font-bold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-colors shadow-lg shadow-orange-900/30"
                  >
                    Start tracking free
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                    </svg>
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center border border-white/20 text-white hover:bg-white/8 font-semibold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
              </div>

              {/* Decorative balls */}
              <div className="flex-shrink-0 select-none hidden sm:flex items-end gap-5 pb-2">
                <div className="flex flex-col gap-5 pb-10">
                  <Ball size={56} opacity={0.65}/>
                  <Ball size={80} opacity={0.85}/>
                </div>
                <Ball size={140} opacity={0.95}/>
                <div className="flex flex-col gap-5 pt-10">
                  <Ball size={80} opacity={0.85}/>
                  <Ball size={56} opacity={0.65}/>
                </div>
              </div>

            </div>
          </div>
        </section>

        {/* ── Stats strip ──────────────────────────────────── */}
        <section className="bg-[#f4f8e8] border-y border-[#91BE4D]/20 py-8">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 sm:gap-8">
              {[
                { value: '100%', label: 'Free to use' },
                { value: 'Multi', label: 'Category tracking' },
                { value: 'Live', label: 'Profit dashboard' },
                { value: 'Auto', label: 'Google Calendar sync' },
              ].map((s) => (
                <div key={s.label} className="text-center">
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#272702] tracking-tight">{s.value}</p>
                  <p className="text-xs text-[#272702]/55 font-semibold uppercase tracking-widest mt-1">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ─────────────────────────────────────── */}
        <section className="bg-white py-20 sm:py-24">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="mb-14 max-w-xl">
              <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-[0.15em] mb-3">What you get</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#272702] leading-tight tracking-tight">
                Built around how you actually play.
              </h2>
              <p className="text-gray-500 text-base mt-3 leading-relaxed">
                Not a generic finance app. Built specifically for pickleball players in India.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {FEATURES.map((f, i) => (
                <div
                  key={f.title}
                  className={`rounded-2xl p-7 border border-transparent hover:border-[#91BE4D]/30 transition-all group ${i % 2 === 0 ? 'bg-[#fafdf4]' : 'bg-[#fffbf4]'}`}
                >
                  <div className={`w-12 h-12 rounded-xl flex items-center justify-center mb-5 ${f.bg} group-hover:scale-105 transition-transform`}>
                    <f.Icon />
                  </div>
                  <h3 className="text-lg font-bold text-[#272702] mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it works ─────────────────────────────────── */}
        <section className="bg-[#1c350a] py-20 sm:py-24 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-[#91BE4D] opacity-5 rounded-full blur-3xl" />
          <div className="absolute left-0 bottom-0 w-48 h-48 bg-[#ec9937] opacity-5 rounded-full blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
            <div className="mb-14 text-center">
              <p className="text-[#ec9937] text-xs font-bold uppercase tracking-[0.15em] mb-3">Getting started</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Up and running in 3 steps.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
              {STEPS.map((s, i) => (
                <div key={s.num} className="relative">
                  {/* Connector line — desktop only */}
                  {i < STEPS.length - 1 && (
                    <div className="hidden sm:block absolute top-6 left-[calc(100%-0px)] w-full h-px bg-white/10 z-0" style={{ width: 'calc(100% - 2rem)', left: 'calc(50% + 1.5rem)' }} />
                  )}
                  <div className="relative z-10">
                    <span className="text-5xl font-black text-[#91BE4D]/20 leading-none block mb-3">{s.num}</span>
                    <h3 className="text-lg font-bold text-white mb-2">{s.title}</h3>
                    <p className="text-sm text-slate-400 leading-relaxed">{s.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Google Calendar note ──────────────────────────── */}
        <section className="bg-white py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="bg-[#f4f8e8] border border-[#91BE4D]/20 rounded-2xl px-7 py-8 sm:px-10 sm:py-10 flex flex-col sm:flex-row gap-6 items-start">
              <div className="w-12 h-12 flex-shrink-0 rounded-xl bg-white border border-[#91BE4D]/20 flex items-center justify-center">
                <IconCalendar />
              </div>
              <div>
                <h3 className="text-lg font-bold text-[#272702] mb-2">How we use Google Calendar</h3>
                <p className="text-sm text-gray-500 leading-relaxed mb-2">
                  You can optionally connect your Google Calendar. When connected, PickleTracker adds events for your upcoming tournaments so your schedule stays in sync.
                </p>
                <p className="text-sm text-gray-400 leading-relaxed">
                  We only create, update, or delete events that PickleTracker itself adds. We never read your existing events or other Google data. You can disconnect anytime from the Calendar page.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ───────────────────────────────────────────── */}
        <section className="bg-[#f4f8e8] border-t border-[#91BE4D]/15 py-20 sm:py-24">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 text-center">
            <div className="flex justify-center gap-4 mb-8 select-none opacity-60">
              <Ball size={32}/>
              <Ball size={48}/>
              <Ball size={32}/>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#272702] tracking-tight mb-3">
              Ready to play seriously?<br className="hidden sm:block"/>
              <span className="text-[#91BE4D]"> Track seriously.</span>
            </h2>
            <p className="text-gray-500 text-sm mb-8 max-w-sm mx-auto leading-relaxed">
              Free to use. No credit card. Takes about 60 seconds to set up.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 bg-[#ec9937] hover:bg-[#d4831f] text-white font-bold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-colors shadow-md shadow-orange-100"
              >
                Create your free account
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center border border-[#272702]/20 text-[#272702] hover:bg-[#272702]/5 font-semibold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-colors"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ────────────────────────────────────────── */}
      <footer className="bg-[#1c1c02] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="flex flex-col sm:flex-row justify-between gap-10">

            {/* Brand */}
            <div className="max-w-xs">
              <div className="mb-4"><BrandLogo size="lg" /></div>
              <p className="text-sm text-slate-400 leading-relaxed">
                India's tournament tracker for pickleball players. Log matches, track your money, grow your game.
              </p>
            </div>

            {/* Links */}
            <div className="flex gap-12 sm:gap-16">
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-4">Product</p>
                <ul className="space-y-3">
                  {[['Sign In', '/login'], ['Get Started', '/signup']].map(([label, to]) => (
                    <li key={label}>
                      <Link to={to} className="text-sm text-slate-400 hover:text-[#91BE4D] transition-colors">{label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-4">Legal</p>
                <ul className="space-y-3">
                  {[['Privacy Policy', '/privacy-policy'], ['Terms of Service', '/terms']].map(([label, to]) => (
                    <li key={label}>
                      <Link to={to} className="text-sm text-slate-400 hover:text-[#91BE4D] transition-colors">{label}</Link>
                    </li>
                  ))}
                  <li>
                    <a href="mailto:support@pickletracker.in" className="text-sm text-slate-400 hover:text-[#91BE4D] transition-colors">
                      Contact
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </div>

          <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-600">&copy; {year} PickleTracker. Built for the community.</p>
            <p className="text-xs text-slate-600">Made with love for Indian pickleball players.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
