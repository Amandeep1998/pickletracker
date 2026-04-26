import { Link, Navigate } from 'react-router-dom';
import { useMemo } from 'react';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';
import LandingTournamentForm from '../components/LandingTournamentForm';
import { getBrowserIanaTimeZone } from '../utils/browserTimeZone';
import { inferCurrencyFromIanaTimeZone, isSupportedCurrency } from '../utils/currencyFromTimeZone';
import { formatCurrency } from '../utils/format';

/* ─── Icons ──────────────────────────────────────────────────── */
const IconChart = () => (
  <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="M4 22L10 15l5 3 9-11" stroke="#ec9937" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="10" cy="15" r="1.5" fill="#ec9937"/>
    <circle cx="15" cy="18" r="1.5" fill="#ec9937"/>
    <path d="M4 4v18h20" stroke="#ec9937" strokeWidth="1.8" strokeLinecap="round"/>
  </svg>
);

const IconCalendar = () => (
  <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="3" y="6" width="22" height="19" rx="3" stroke="#91BE4D" strokeWidth="1.8"/>
    <path d="M3 11h22" stroke="#91BE4D" strokeWidth="1.8"/>
    <path d="M9 3v4M19 3v4" stroke="#91BE4D" strokeWidth="1.8" strokeLinecap="round"/>
    <rect x="8" y="15" width="4" height="4" rx="1" fill="#ec9937" opacity="0.7"/>
    <rect x="16" y="15" width="4" height="4" rx="1" fill="#91BE4D" opacity="0.5"/>
  </svg>
);

const IconJournal = () => (
  <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <rect x="5" y="3" width="18" height="22" rx="2" stroke="#91BE4D" strokeWidth="1.8"/>
    <path d="M9 9h10M9 13h10M9 17h6" stroke="#91BE4D" strokeWidth="1.8" strokeLinecap="round"/>
    <circle cx="21" cy="21" r="4" fill="#ec9937"/>
    <path d="M21 19v2l1 1" stroke="white" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const IconLocation = () => (
  <svg width="22" height="22" viewBox="0 0 28 28" fill="none" aria-hidden="true">
    <path d="M14 3a7 7 0 017 7c0 5-7 15-7 15S7 15 7 10a7 7 0 017-7z" stroke="#ec9937" strokeWidth="1.8" strokeLinejoin="round"/>
    <circle cx="14" cy="10" r="2.5" stroke="#ec9937" strokeWidth="1.8"/>
  </svg>
);

const InstagramIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="1.75"/>
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75"/>
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>
  </svg>
);

const ArrowRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6"/>
  </svg>
);

/** Sample amounts for the hero mockup; currency comes from browser TZ when inferable (else USD). */
function landingDemoCurrencyCode() {
  const inferred = inferCurrencyFromIanaTimeZone(getBrowserIanaTimeZone());
  return isSupportedCurrency(inferred) ? inferred : 'USD';
}

/* ─── App Dashboard Mockup ───────────────────────────────────── */
const AppMockup = ({ currency }) => {
  const fmt = (amount) => formatCurrency(amount, currency);
  const tournaments = [
    { name: 'City Open', cat: "Men's Singles", profit: 2000, pos: true },
    { name: 'Club Championship', cat: 'Mixed Doubles', profit: 1200, pos: true },
    { name: 'Weekend Cup', cat: "Men's Doubles", profit: -500, pos: false },
  ];

  return (
    <div className="relative flex-shrink-0">
      <div className="absolute inset-0 bg-[#91BE4D] opacity-20 blur-3xl rounded-full scale-90 translate-y-4" />
      <div className="relative bg-white rounded-2xl shadow-2xl border border-gray-100 p-5 w-[280px]">

        {/* App header */}
        <div className="flex items-center gap-2 mb-4">
          <div className="w-6 h-6 rounded-md bg-[#1c350a] flex items-center justify-center flex-shrink-0">
            <span className="text-[#91BE4D] text-[9px] font-black tracking-tighter">PT</span>
          </div>
          <span className="text-sm font-bold text-gray-800">PickleTracker</span>
          <span className="ml-auto text-[11px] bg-green-50 text-green-700 px-2 py-0.5 rounded-full font-bold">April</span>
        </div>

        {/* Profit hero */}
        <div className="bg-[#1c350a] rounded-xl p-4 mb-3 relative overflow-hidden">
          <div className="absolute -right-4 -top-4 w-16 h-16 bg-[#91BE4D] opacity-10 rounded-full" />
          <p className="text-[11px] text-[#91BE4D] font-semibold mb-0.5">Net Profit — This Month</p>
          <p className="text-[2rem] font-black text-white leading-none">+{fmt(4200)}</p>
          <div className="flex items-center gap-1 mt-1.5">
            <svg className="w-3 h-3 text-[#91BE4D]" fill="none" viewBox="0 0 12 12">
              <path d="M2 8l4-4 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            <span className="text-[11px] text-[#91BE4D] font-semibold">You're in profit this month</span>
          </div>
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-3 gap-2 mb-3">
          {[
            { label: 'Entry paid', value: fmt(1500), color: 'text-gray-700' },
            { label: 'Prizes won', value: fmt(5700), color: 'text-green-600' },
            { label: 'Played', value: '3', color: 'text-gray-700' },
          ].map(s => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-2 text-center">
              <p className={`text-[13px] font-bold ${s.color}`}>{s.value}</p>
              <p className="text-[10px] text-gray-400 leading-tight">{s.label}</p>
            </div>
          ))}
        </div>

        {/* Tournament list */}
        <div className="space-y-1.5">
          {tournaments.map(t => (
            <div key={t.name} className="flex items-center gap-2.5 bg-gray-50 rounded-lg px-3 py-2">
              <div className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${t.pos ? 'bg-[#91BE4D]' : 'bg-red-400'}`} />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] font-bold text-gray-800 truncate">{t.name}</p>
                <p className="text-[10px] text-gray-400">{t.cat}</p>
              </div>
              <span className={`text-[11px] font-bold flex-shrink-0 ${t.pos ? 'text-green-600' : 'text-red-500'}`}>
                {t.profit >= 0 ? '+' : '−'}{fmt(Math.abs(t.profit))}
              </span>
            </div>
          ))}
        </div>

        {/* Bottom label */}
        <p className="text-center text-[10px] text-gray-300 mt-3 font-medium">Sample data — yours will look like this</p>
      </div>
    </div>
  );
};

/* ─── Pain Question Card ─────────────────────────────────────── */
const PainCard = ({ number, question, detail }) => (
  <div className="flex gap-4 items-start">
    <div className="w-8 h-8 rounded-full bg-[#ec9937]/15 border border-[#ec9937]/30 flex items-center justify-center flex-shrink-0 mt-0.5">
      <span className="text-[#ec9937] text-sm font-black">{number}</span>
    </div>
    <div>
      <p className="text-base sm:text-lg font-bold text-[#1c350a] mb-1 leading-snug">{question}</p>
      <p className="text-sm text-gray-500 leading-relaxed">{detail}</p>
    </div>
  </div>
);

/* ─── Landing Page ─────────────────────────────────────────── */
export default function Landing() {
  const { user, authInitializing } = useAuth();
  const demoCurrency = useMemo(() => landingDemoCurrencyCode(), []);
  const year = new Date().getFullYear();
  const supportEmail = 'pickletracker.app@gmail.com';
  const instagramUrl = 'https://www.instagram.com/pickletracker/';

  if (authInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center text-sm text-gray-500">
        Checking your session…
      </div>
    );
  }

  if (user) return <Navigate to="/calendar" replace />;

  return (
    <div className="min-h-screen flex flex-col bg-white" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>

      {/* ── Navbar ──────────────────────────────────────────── */}
      <header className="bg-white sticky top-0 z-20 border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 sm:px-8 h-16 flex items-center justify-between">
          <Link to="/" className="flex-shrink-0">
            <span className="sm:hidden"><BrandLogo size="md" /></span>
            <span className="hidden sm:inline"><BrandLogo size="lg" /></span>
          </Link>
          <div className="flex items-center gap-2 sm:gap-3">
            <Link to="/login" className="text-sm font-medium text-[#272702] hover:text-[#91BE4D] transition-colors px-2 sm:px-3 py-2">
              Sign In
            </Link>
            <Link to="/signup" className="text-sm font-bold bg-[#91BE4D] hover:bg-[#7aaa2e] text-white px-3 sm:px-5 py-2 sm:py-2.5 rounded-lg tracking-wide transition-colors">
              <span className="sm:hidden">Start</span>
              <span className="hidden sm:inline">Get Started</span>
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ────────────────────────────────────────────── */}
        <section className="relative bg-[#1c350a] overflow-hidden">
          <div
            className="absolute inset-0 opacity-[0.04]"
            style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }}
          />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#91BE4D] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#ec9937] opacity-[0.07] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-20 sm:py-28">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

              {/* Text side */}
              <div className="flex-1 text-center lg:text-left">
                <span className="inline-block bg-[#91BE4D]/15 border border-[#91BE4D]/25 text-[#91BE4D] text-[11px] font-bold px-3 py-1.5 rounded-full mb-6 tracking-[0.12em] uppercase">
                  Built for competitive pickleball players
                </span>

                <h1 className="text-4xl sm:text-5xl lg:text-[3.3rem] font-extrabold text-white leading-[1.1] mb-6 tracking-[-0.01em]">
                  Are you winning at pickleball…{' '}
                  <span className="text-[#ec9937]">or just spending?</span>
                </h1>

                <p className="text-base sm:text-[1.1rem] text-slate-300 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                  Every tournament has an entry fee. Some have prizes. But across{' '}
                  <em>all</em> your tournaments — are you actually up or down?{' '}
                  <span className="text-white font-semibold">Most players have no idea. PickleTracker shows you in seconds.</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center gap-2 hover:opacity-90 text-white font-bold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-opacity shadow-lg shadow-black/30"
                    style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
                  >
                    Find out for free
                    <ArrowRight />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center border border-white/20 text-white hover:bg-white/5 font-semibold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
                <p className="text-slate-600 text-xs mt-4">No credit card · No catch · Free to use</p>
              </div>

              {/* App mockup */}
              <div className="hidden lg:flex flex-shrink-0">
                <AppMockup currency={demoCurrency} />
              </div>

            </div>
          </div>
        </section>

        {/* ── Pain Section ────────────────────────────────────── */}
        <section className="bg-white py-20 sm:py-24">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">

            <div className="max-w-2xl mx-auto text-center mb-14">
              <p className="text-[#ec9937] text-xs font-bold uppercase tracking-[0.15em] mb-3">The problem</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#272702] leading-tight tracking-tight mb-4">
                Quick. Answer these three questions.
              </h2>
              <p className="text-gray-500 text-base leading-relaxed">
                If you play competitive pickleball, these should be easy.
                Most players draw a complete blank.
              </p>
            </div>

            <div className="max-w-2xl mx-auto space-y-8 mb-14">
              <PainCard
                number="1"
                question="How much have you spent on entry fees this year — total?"
                detail="You remember the big tournaments. But add them all up — 5, 6, maybe 10 entries — most players genuinely cannot give you that number right now."
              />
              <PainCard
                number="2"
                question="Did you make money or lose money from pickleball this month?"
                detail="You might have won a prize. But did it actually cover everything you spent? Are you up or down? It's impossible to know without doing the maths."
              />
              <PainCard
                number="3"
                question="Which category — singles or doubles — earns you more profit?"
                detail="You might be brilliant at doubles but the entry fee makes it not worth it financially. You'd never know without tracking each category separately."
              />
            </div>

            {/* Answer block */}
            <div className="max-w-2xl mx-auto">
              <div className="bg-[#1c350a] rounded-2xl p-7 sm:p-10 text-center relative overflow-hidden">
                <div className="absolute top-0 right-0 w-40 h-40 bg-[#91BE4D] opacity-5 rounded-full blur-2xl" />
                <div className="absolute bottom-0 left-0 w-32 h-32 bg-[#ec9937] opacity-5 rounded-full blur-2xl" />
                <p className="relative text-white text-xl sm:text-2xl font-extrabold mb-3 leading-tight">
                  PickleTracker answers all three.<br/>
                  <span className="text-[#91BE4D]">Automatically.</span>
                </p>
                <p className="relative text-slate-400 text-sm leading-relaxed mb-7 max-w-md mx-auto">
                  Log a tournament once — entry fee, prize, category. That's it.
                  PickleTracker calculates your profit and builds your dashboard as you go.
                  Think of it like a bank statement, but for your pickleball career.
                </p>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-2 hover:opacity-90 text-white font-bold px-7 py-3.5 rounded-lg text-sm tracking-wide transition-opacity shadow-lg"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
                >
                  Try it free — takes 60 seconds
                  <ArrowRight />
                </Link>
              </div>
            </div>

          </div>
        </section>

        {/* ── Who It's For ─────────────────────────────────────── */}
        <section className="bg-[#f9fafb] border-y border-gray-100 py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="text-center mb-10">
              <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-[0.15em] mb-3">Who it's for</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#272702] leading-tight tracking-tight">
                Your role. Your features.
              </h2>
              <p className="text-gray-500 text-base mt-3 max-w-xl mx-auto leading-relaxed">
                PickleTracker adapts to how you play. Pick your role when you sign up — the app shows only what's relevant to you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
              {/* Player card */}
              <div className="bg-white rounded-2xl border-2 border-[#91BE4D]/30 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-[#91BE4D] opacity-5 rounded-full blur-2xl" />
                <div className="w-11 h-11 rounded-xl bg-[#f4f8e8] flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-[#4a6e10]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <circle cx="12" cy="8" r="4" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M4 20c0-4 3.6-7 8-7s8 3 8 7" />
                  </svg>
                </div>
                <div className="inline-block bg-[#91BE4D] text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-3">Player</div>
                <h3 className="text-lg font-extrabold text-[#1c350a] mb-2 leading-snug">Know if pickleball is paying you — or costing you</h3>
                <ul className="space-y-2.5 mb-5">
                  {[
                    'Track prize money vs. entry fees per tournament',
                    'See which category (Singles / Doubles) earns more',
                    'Log practice sessions with court fees & travel',
                    'Track gear spend — paddles, shoes, accessories',
                    'Full calendar view of your season',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-[#91BE4D] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4a6e10] hover:text-[#2d7005] transition-colors"
                >
                  Get started as a Player <ArrowRight />
                </Link>
              </div>

              {/* Coach card */}
              <div className="bg-white rounded-2xl border-2 border-green-200 p-6 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-28 h-28 bg-green-400 opacity-5 rounded-full blur-2xl" />
                <div className="w-11 h-11 rounded-xl bg-green-50 flex items-center justify-center mb-4">
                  <svg className="w-6 h-6 text-green-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l9-5-9-5-9 5 9 5z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 14l6.16-3.422A12.083 12.083 0 0121 13c0 3.314-4.03 6-9 6S3 16.314 3 13c0-.235.01-.469.03-.7L9 14z" />
                  </svg>
                </div>
                <div className="inline-block bg-green-600 text-white text-[10px] font-black px-2.5 py-1 rounded-full uppercase tracking-wider mb-3">Coach</div>
                <h3 className="text-lg font-extrabold text-[#1c350a] mb-2 leading-snug">Know exactly what your coaching is worth</h3>
                <ul className="space-y-2.5 mb-5">
                  {[
                    'Log private, group, or monthly coaching in one place',
                    'Record total income and any costs (travel, court, etc.)',
                    'See coaching in your Dashboard totals and month chart',
                    'Optionally add names to track totals by student',
                    'Everything a player gets — plus coaching on top',
                  ].map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-green-700 hover:text-green-800 transition-colors"
                >
                  Get started as a Coach <ArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Tournament Form Section ──────────────────────────── */}
        <section className="bg-[#f4f8e8] border-y border-[#91BE4D]/20 py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="flex flex-col lg:flex-row items-start gap-12 lg:gap-20">

              {/* Left copy */}
              <div className="flex-1">
                <span className="inline-flex items-center gap-1.5 bg-[#91BE4D]/15 border border-[#91BE4D]/30 text-[#4a6e10] text-[11px] font-bold px-3 py-1.5 rounded-full mb-5 tracking-[0.1em] uppercase">
                  Start right now
                </span>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1c350a] leading-tight tracking-tight mb-4">
                  Got a tournament coming up?
                </h2>
                <p className="text-gray-600 text-base leading-relaxed mb-8 max-w-md">
                  Log it in 30 seconds. We'll send you a reminder the day before — and
                  auto-calculate your profit the moment you're back.
                </p>
                <div className="space-y-4">
                  {[
                    { icon: '🔔', title: 'Day-before reminder', desc: 'An email the night before so you show up prepared, not scrambling.' },
                    { icon: '📊', title: 'Profit calculated for you', desc: 'Entry fee vs prize — we do the maths. You just play.' },
                    { icon: '📅', title: 'Your full schedule in one place', desc: 'All tournaments on a clean calendar. No more missed dates.' },
                    { icon: '🆓', title: '100% free', desc: 'No credit card. No catch. No paid plan to worry about.' },
                  ].map(b => (
                    <div key={b.title} className="flex items-start gap-3">
                      <span className="text-xl leading-none mt-0.5 flex-shrink-0">{b.icon}</span>
                      <div>
                        <span className="text-sm font-bold text-[#1c350a]">{b.title} — </span>
                        <span className="text-sm text-gray-500">{b.desc}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Form card */}
              <div className="w-full lg:w-[420px] flex-shrink-0">
                <div className="bg-white rounded-2xl shadow-xl shadow-green-900/10 border border-[#91BE4D]/20">
                  <div className="px-6 pt-6 pb-4 border-b border-gray-100 rounded-t-2xl">
                    <div className="flex items-center gap-2 mb-1">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#2d7005,#91BE4D)' }}
                      >
                        <svg className="w-3.5 h-3.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4"/>
                        </svg>
                      </div>
                      <p className="text-sm font-bold text-gray-900">Log your next tournament</p>
                    </div>
                    <p className="text-xs text-gray-400 ml-9">Takes 30 seconds. No account needed to start.</p>
                  </div>
                  <div className="px-6 py-5">
                    <LandingTournamentForm />
                  </div>
                </div>
                <p className="text-center text-xs text-gray-400 mt-3">
                  Already tracking?{' '}
                  <Link to="/login" className="text-[#4a6e10] font-semibold hover:underline">Sign in instead</Link>
                </p>
              </div>

            </div>
          </div>
        </section>

        {/* ── Features ────────────────────────────────────────── */}
        <section className="bg-white py-20 sm:py-24">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">

            <div className="max-w-xl mb-14">
              <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-[0.15em] mb-3">Everything you need</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#272702] leading-tight tracking-tight">
                Not a generic app.<br/>Built specifically for pickleball.
              </h2>
              <p className="text-gray-500 text-base mt-3 leading-relaxed">
                Every feature answers a question a competitive pickleball player actually asks.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              {[
                {
                  Icon: IconChart,
                  bg: 'bg-[#fff8ee]',
                  benefit: 'Know your real numbers',
                  title: 'Tournament Profit Tracker',
                  detail: 'Log entry fee and prize won. PickleTracker instantly shows your net profit — per tournament, per category, and across your whole career. No spreadsheet. No guessing.',
                },
                {
                  Icon: IconCalendar,
                  bg: 'bg-[#f4f8e8]',
                  benefit: 'Never miss a match',
                  title: 'Tournament Calendar',
                  detail: 'Every upcoming tournament laid out by date. Get an email reminder the day before every match — so you\'re always prepared, never caught off guard.',
                },
                {
                  Icon: IconJournal,
                  bg: 'bg-[#f4f8e8]',
                  benefit: 'Watch yourself improve',
                  title: 'Performance Journal',
                  detail: 'Rate each session, tag what clicked and what didn\'t. Over weeks you\'ll see patterns emerge — the weak spots that are quietly costing you matches and money.',
                },
                {
                  Icon: IconLocation,
                  bg: 'bg-[#fff8ee]',
                  benefit: 'Grow your game',
                  title: 'Find Nearby Players',
                  detail: 'See other PickleTracker players near you. Connect, arrange games, and build the kind of regular practice that actually makes you a better player.',
                },
              ].map(f => (
                <div
                  key={f.title}
                  className="rounded-2xl p-7 border border-gray-100 hover:border-[#91BE4D]/30 hover:shadow-md transition-all group bg-white"
                >
                  <div className={`w-11 h-11 rounded-xl flex items-center justify-center mb-5 ${f.bg} group-hover:scale-105 transition-transform`}>
                    <f.Icon />
                  </div>
                  <p className="text-[10px] font-bold text-[#91BE4D] uppercase tracking-widest mb-1">{f.benefit}</p>
                  <h3 className="text-base font-bold text-[#272702] mb-2">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.detail}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── How it Works ────────────────────────────────────── */}
        <section className="bg-[#1c350a] py-20 sm:py-24 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-[#91BE4D] opacity-5 rounded-full blur-3xl" />
          <div className="absolute left-0 bottom-0 w-48 h-48 bg-[#ec9937] opacity-5 rounded-full blur-3xl" />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8">
            <div className="mb-14 text-center">
              <p className="text-[#ec9937] text-xs font-bold uppercase tracking-[0.15em] mb-3">It's this simple</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                Up and running in 3 steps.
              </h2>
              <p className="text-slate-400 text-base mt-3 max-w-sm mx-auto leading-relaxed">
                No tutorials. No onboarding call. You'll figure it out in under a minute.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-8 sm:gap-6">
              {[
                {
                  num: '01',
                  title: 'Sign up free',
                  desc: 'Create your account in under a minute with Google. No credit card, no catch, no annoying emails.'
                },
                {
                  num: '02',
                  title: 'Log your first tournament',
                  desc: 'Add the name, entry fee, and prize won. That\'s it. Your profit is calculated automatically — right there.'
                },
                {
                  num: '03',
                  title: 'Watch the picture emerge',
                  desc: 'Log 2–3 tournaments and your dashboard starts telling a story — where you\'re winning money, where you\'re not.'
                },
              ].map((s, i) => (
                <div key={s.num} className="relative">
                  {i < 2 && (
                    <div
                      className="hidden sm:block absolute top-6 h-px bg-white/10 z-0"
                      style={{ width: 'calc(100% - 2rem)', left: 'calc(50% + 1.5rem)' }}
                    />
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

        {/* ── Final CTA ───────────────────────────────────────── */}
        <section className="bg-[#f4f8e8] border-t border-[#91BE4D]/15 py-20 sm:py-24">
          <div className="max-w-6xl mx-auto px-5 sm:px-8 text-center">
            <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-[0.15em] mb-4">You ready?</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-[#272702] tracking-tight mb-4 leading-tight">
              Stop guessing what your<br/>pickleball game costs you.
              <br/><span className="text-[#91BE4D]">Start knowing.</span>
            </h2>
            <p className="text-gray-500 text-base mb-8 max-w-md mx-auto leading-relaxed">
              The players who improve fastest are the ones who track everything.
              It takes 60 seconds to start — and it's free.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 hover:opacity-90 text-white font-bold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-opacity shadow-md"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
              >
                Create your free account
                <ArrowRight />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center border border-[#272702]/20 text-[#272702] hover:bg-[#272702]/5 font-semibold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-colors"
              >
                I already have an account
              </Link>
            </div>
            <p className="text-gray-400 text-xs mt-5">Free to use · No credit card · Works on mobile, tablet, and desktop</p>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-[#1c1c02] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="flex flex-col sm:flex-row justify-between gap-10">

            <div className="max-w-xs">
              <div className="mb-4"><BrandLogo size="lg" /></div>
              <p className="text-sm text-slate-400 leading-relaxed">
                The tournament tracker for pickleball players. Know your profit, track your game, find your people.
              </p>
            </div>

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
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-4">Get in touch</p>
                <ul className="space-y-3">
                  <li>
                    <a href={`mailto:${supportEmail}`} className="text-sm text-slate-400 hover:text-[#91BE4D] transition-colors break-all">
                      {supportEmail}
                    </a>
                  </li>
                  <li>
                    <a
                      href={instagramUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#91BE4D] transition-colors"
                    >
                      <InstagramIcon className="w-4 h-4 text-[#91BE4D] flex-shrink-0" />
                      <span>Instagram</span>
                    </a>
                  </li>
                  <li>
                    <Link to="/privacy-policy" className="text-sm text-slate-400 hover:text-[#91BE4D] transition-colors">
                      Privacy Policy
                    </Link>
                  </li>
                  <li>
                    <Link to="/terms" className="text-sm text-slate-400 hover:text-[#91BE4D] transition-colors">
                      Terms of Service
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

          </div>

          <div className="border-t border-white/5 mt-10 pt-6 flex flex-col sm:flex-row items-center justify-between gap-2">
            <p className="text-xs text-slate-600">&copy; {year} PickleTracker. Built for the community.</p>
            <p className="text-xs text-slate-600">Made with love for the pickleball community.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
