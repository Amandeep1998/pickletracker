import { Link } from 'react-router-dom';

// Pickleball ball SVG — chartreuse with hole pattern
const PickleballSVG = ({ size = 80, className = '' }) => (
  <svg width={size} height={size} viewBox="0 0 80 80" fill="none" className={className} aria-hidden="true">
    <circle cx="40" cy="40" r="36" fill="#C8D636" />
    <circle cx="40" cy="40" r="36" fill="url(#pbGrad)" opacity="0.5" />
    <defs>
      <radialGradient id="pbGrad" cx="35%" cy="30%" r="60%">
        <stop offset="0%" stopColor="white" stopOpacity="0.35" />
        <stop offset="100%" stopColor="black" stopOpacity="0.15" />
      </radialGradient>
    </defs>
    {/* Hole pattern — pickleball has 40 holes */}
    {[
      [28,22],[40,18],[52,22],
      [20,32],[32,30],[44,30],[56,32],
      [24,42],[36,40],[44,40],[56,42],
      [28,52],[40,56],[52,52],
      [40,40],
    ].map(([cx, cy], i) => (
      <circle key={i} cx={cx} cy={cy} r="2.8" fill="#272702" opacity="0.3" />
    ))}
  </svg>
);

const FEATURES = [
  {
    icon: '🏆',
    title: 'Tournament Tracker',
    desc: 'Log every tournament with categories, entry fees, prize winnings, and medals. See net profit per event at a glance.',
  },
  {
    icon: '📊',
    title: 'Financial Dashboard',
    desc: 'Monthly earnings vs expenses charts, per-category profit trends, and year-end summaries — all in one place.',
  },
  {
    icon: '🗓️',
    title: 'Google Calendar Sync',
    desc: 'Connect your Google Calendar to auto-add tournament dates. Your schedule stays in sync — no manual entry.',
  },
  {
    icon: '📅',
    title: 'Visual Calendar',
    desc: 'A monthly calendar view of all your upcoming and past tournaments. Add events by tapping any date cell.',
  },
  {
    icon: '💸',
    title: 'Expense Tracking',
    desc: 'Track court booking fees and gear separately from entry fees for a complete financial picture.',
  },
  {
    icon: '📍',
    title: 'Location & Maps',
    desc: 'Save tournament venues with Google Maps integration. One tap to get directions to any court.',
  },
];

export default function Landing() {
  return (
    <div className="min-h-screen flex flex-col">

      {/* ── Navbar ── */}
      <header className="bg-[#272702] sticky top-0 z-20 shadow-lg">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="PickleTracker" className="h-9 w-9 object-contain" />
            <div className="hidden sm:flex items-baseline gap-0.5">
              <span className="text-lg font-bold text-[#91BE4D]">Pickle</span>
              <span className="text-lg font-bold text-[#ec9937]">Tracker</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/login" className="text-sm font-medium text-slate-300 hover:text-[#ec9937] transition-colors">
              Sign In
            </Link>
            <Link to="/signup" className="text-sm font-bold bg-[#ec9937] hover:bg-[#d4831f] text-white px-4 py-2 rounded tracking-wide transition-colors">
              Get Started
            </Link>
          </div>
        </div>
      </header>

      <main className="flex-1">

        {/* ── Hero ── */}
        <section className="bg-gradient-to-br from-[#272702] via-[#1e1e01] to-[#2a3300] overflow-hidden">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-20 sm:py-28 flex flex-col lg:flex-row items-center gap-10 lg:gap-16">

            <div className="flex-1 text-center lg:text-left">
              <div className="inline-flex items-center gap-2 bg-[#91BE4D]/20 border border-[#91BE4D]/30 text-[#91BE4D] text-xs font-bold px-3 py-1.5 rounded mb-6 tracking-widest uppercase">
                Built for pickleball players in India
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white leading-tight mb-5 tracking-wide">
                Track Your{' '}
                <span className="text-[#91BE4D]">Tournament</span>{' '}
                Finances
              </h1>
              <p className="text-base sm:text-lg text-slate-300 max-w-xl mb-8 leading-relaxed mx-auto lg:mx-0">
                PickleTracker helps you log every tournament — entry fees, prize winnings, medals — and gives you a clear financial picture of your pickleball journey.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link to="/signup" className="bg-[#ec9937] hover:bg-[#d4831f] text-white font-bold px-7 py-3.5 rounded text-sm tracking-wide transition-colors shadow-lg shadow-black/30">
                  Start Tracking Free
                </Link>
                <Link to="/login" className="bg-white/10 hover:bg-white/20 border border-white/20 text-white font-semibold px-7 py-3.5 rounded text-sm tracking-wide transition-colors">
                  Sign In
                </Link>
              </div>
            </div>

            {/* Decorative pickleball cluster */}
            <div className="flex-shrink-0 flex items-center justify-center gap-3 opacity-90 select-none">
              <div className="flex flex-col gap-4 mt-8">
                <PickleballSVG size={72} />
                <PickleballSVG size={48} className="ml-6" />
              </div>
              <PickleballSVG size={148} />
              <div className="flex flex-col gap-4 mb-8">
                <PickleballSVG size={48} />
                <PickleballSVG size={72} className="mr-6" />
              </div>
            </div>

          </div>
        </section>

        {/* ── Stats strip ── */}
        <section className="bg-[#91BE4D] py-5">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-6 text-center">
              {[
                { value: 'Free', label: 'Forever Plan' },
                { value: 'Multi', label: 'Category Tracking' },
                { value: 'Auto', label: 'Calendar Sync' },
                { value: 'Live', label: 'Profit Dashboard' },
              ].map((s) => (
                <div key={s.label}>
                  <p className="text-2xl sm:text-3xl font-extrabold text-[#272702]">{s.value}</p>
                  <p className="text-xs font-semibold text-[#272702]/70 tracking-widest uppercase mt-0.5">{s.label}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Features ── */}
        <section className="bg-[#F3F8F9] py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="text-center mb-12">
              <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-2">Features</p>
              <h2 className="text-3xl sm:text-4xl font-extrabold text-[#272702]">
                Everything You Need to Manage Your Game
              </h2>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {FEATURES.map((f) => (
                <div
                  key={f.title}
                  className="bg-white rounded-xl p-6 border border-gray-100 shadow-sm hover:shadow-md hover:border-[#91BE4D]/40 transition-all group"
                >
                  <div className="w-12 h-12 rounded-lg bg-[#272702] flex items-center justify-center text-2xl mb-4 group-hover:bg-[#91BE4D]/20 transition-colors">
                    {f.icon}
                  </div>
                  <h3 className="text-lg font-bold text-[#272702] mb-2 tracking-wide">{f.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Google Calendar explanation ── */}
        <section className="bg-white py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6">
            <div className="bg-[#272702] rounded-2xl px-6 py-10 sm:px-12 sm:py-12 flex flex-col sm:flex-row items-start gap-6">
              <div className="w-14 h-14 rounded-xl bg-[#91BE4D]/20 flex items-center justify-center text-3xl flex-shrink-0">🗓️</div>
              <div>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-white mb-3 tracking-wide">
                  How We Use Google Calendar
                </h2>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  PickleTracker lets you optionally connect your Google Calendar account. When connected, we create calendar events for your upcoming tournaments so your schedule is always visible alongside your other commitments.
                </p>
                <p className="text-sm text-slate-300 leading-relaxed mb-3">
                  We only request access to create, update, and delete events that PickleTracker itself creates. We do not read your existing calendar events, contacts, or any other Google data.
                </p>
                <p className="text-sm text-slate-400 leading-relaxed">
                  You can disconnect Google Calendar at any time from the Calendar page. Disconnecting removes access immediately and does not affect your tournament data.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* ── CTA ── */}
        <section className="bg-[#272702] py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 text-center">
            <div className="flex justify-center gap-4 mb-8 opacity-70 select-none">
              <PickleballSVG size={36} />
              <PickleballSVG size={52} />
              <PickleballSVG size={36} />
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3 tracking-wide">
              Ready to Take Control of Your<br className="hidden sm:block" /> Pickleball Finances?
            </h2>
            <p className="text-slate-400 text-sm mb-8">Free to use. No credit card required.</p>
            <Link
              to="/signup"
              className="inline-block bg-[#ec9937] hover:bg-[#d4831f] text-white font-bold px-10 py-3.5 rounded text-sm tracking-wide transition-colors shadow-lg shadow-black/30"
            >
              Create Your Free Account
            </Link>
          </div>
        </section>

      </main>

      {/* ── Footer ── */}
      <footer className="bg-[#272702] border-t border-white/10 py-6">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="h-5 w-5 object-contain opacity-70" />
            <p className="text-xs text-slate-400">&copy; {new Date().getFullYear()} PickleTracker. All rights reserved.</p>
          </div>
          <div className="flex items-center gap-4">
            <Link to="/privacy-policy" className="text-xs text-slate-400 hover:text-[#91BE4D] transition-colors">Privacy Policy</Link>
            <span className="text-slate-600 text-xs">·</span>
            <Link to="/terms" className="text-xs text-slate-400 hover:text-[#91BE4D] transition-colors">Terms of Service</Link>
            <span className="text-slate-600 text-xs">·</span>
            <a href="mailto:amandeepsaini336@gmail.com" className="text-xs text-slate-400 hover:text-[#91BE4D] transition-colors">Contact</a>
          </div>
        </div>
      </footer>

    </div>
  );
}
