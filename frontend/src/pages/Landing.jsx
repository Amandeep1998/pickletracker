import { Link, Navigate } from 'react-router-dom';
import BrandLogo from '../components/BrandLogo';
import { useAuth } from '../context/AuthContext';

const ArrowRight = () => (
  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M13 7l5 5m0 0l-5 5m5-5H6" />
  </svg>
);

const Check = () => (
  <svg className="w-4 h-4 text-[#91BE4D] flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
  </svg>
);

const InstagramIcon = ({ className = 'w-4 h-4' }) => (
  <svg className={className} viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3.5" y="3.5" width="17" height="17" rx="4.5" stroke="currentColor" strokeWidth="1.75" />
    <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.75" />
    <circle cx="17.5" cy="6.5" r="1" fill="currentColor" />
  </svg>
);

/* ─── Reminder Phone Mockup (CSS-only, no image) ─── */
const ReminderMockup = () => (
  <div className="relative flex-shrink-0 mx-auto">
    <div className="absolute inset-0 bg-[#91BE4D] opacity-20 blur-3xl rounded-full scale-90" />
    <div className="relative bg-[#1c1c1c] rounded-[2.5rem] p-3 shadow-2xl w-[280px]">
      <div className="bg-gradient-to-b from-[#2d6e05] to-[#1c350a] rounded-[2rem] p-5 min-h-[480px] relative overflow-hidden">
        <div className="text-center text-white/80 text-xs font-medium mb-1">Tomorrow · 6:30 AM</div>
        <div className="text-center text-white text-5xl font-thin mb-1">8:32</div>
        <div className="text-center text-white/70 text-sm mb-8">Wednesday, May 12</div>

        {/* Notification card 1 */}
        <div className="bg-white/95 backdrop-blur rounded-2xl p-3.5 shadow-xl mb-2.5 animate-pulse-slow">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#2d7005] to-[#ec9937] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[10px] font-black tracking-tighter">PT</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[11px] font-bold text-gray-900">PickleTracker</span>
                <span className="text-[10px] text-gray-400">now</span>
              </div>
              <p className="text-[12px] font-bold text-gray-900 leading-snug">Mumbai Open is tomorrow 🏆</p>
              <p className="text-[11px] text-gray-600 mt-0.5 leading-snug">8 AM start. Entry fee ₹1,500. Good luck out there!</p>
            </div>
          </div>
        </div>

        {/* Notification card 2 */}
        <div className="bg-white/85 backdrop-blur rounded-2xl p-3 shadow-lg">
          <div className="flex items-start gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-[#2d7005] to-[#ec9937] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-[9px] font-black tracking-tighter">PT</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-0.5">
                <span className="text-[10px] font-bold text-gray-700">PickleTracker</span>
                <span className="text-[9px] text-gray-400">9h ago</span>
              </div>
              <p className="text-[11px] text-gray-700 leading-snug">How did Delhi Open go? Tap to log your result.</p>
            </div>
          </div>
        </div>

        <p className="text-center text-white/40 text-[10px] mt-6">Sample reminder — yours will look like this</p>
      </div>
    </div>
  </div>
);

/* ─── Section Visual Card ─── */
const VisualCard = ({ src, alt }) => (
  <div className="relative flex-shrink-0 mx-auto">
    <div className="absolute inset-0 bg-[#91BE4D] opacity-10 blur-3xl rounded-full scale-90" />
    <div className="relative bg-[#1c1c1c] rounded-[2.5rem] p-3 shadow-2xl w-[280px] sm:w-[300px]">
      <img src={src} alt={alt} className="w-full rounded-[2rem] block" loading="lazy" />
    </div>
  </div>
);

/* ─── Landing Page ─────────────────────────────────────────── */
export default function Landing() {
  const { user, authInitializing } = useAuth();
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

        {/* ── HERO (Pain-led) ─────────────────────────────────── */}
        <section className="relative bg-[#1c350a] overflow-hidden">
          <div className="absolute inset-0 opacity-[0.04]" style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)', backgroundSize: '28px 28px' }} />
          <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-[#91BE4D] opacity-10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/3" />
          <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-[#ec9937] opacity-[0.07] rounded-full blur-3xl translate-y-1/2 -translate-x-1/3" />

          <div className="relative max-w-6xl mx-auto px-5 sm:px-8 py-16 sm:py-24">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-16">

              {/* Text */}
              <div className="flex-1 text-center lg:text-left">
                <span className="inline-block bg-[#91BE4D]/15 border border-[#91BE4D]/25 text-[#91BE4D] text-[11px] font-bold px-3 py-1.5 rounded-full mb-6 tracking-[0.12em] uppercase">
                  Built for pickleball players
                </span>

                <h1 className="text-4xl sm:text-5xl lg:text-[3.3rem] font-extrabold text-white leading-[1.1] mb-6 tracking-[-0.01em]">
                  Stop losing track of your{' '}
                  <span className="text-[#ec9937]">pickleball spending.</span>
                </h1>

                <p className="text-base sm:text-[1.1rem] text-slate-300 leading-relaxed mb-8 max-w-lg mx-auto lg:mx-0">
                  Log every tournament, see your full schedule on a calendar, and get reminded the day before.{' '}
                  <span className="text-white font-semibold">All in one place. Free forever.</span>
                </p>

                <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                  <Link
                    to="/signup"
                    className="inline-flex items-center justify-center gap-2 hover:opacity-90 text-white font-bold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-opacity shadow-lg shadow-black/30"
                    style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
                  >
                    Start tracking free
                    <ArrowRight />
                  </Link>
                  <Link
                    to="/login"
                    className="inline-flex items-center justify-center border border-white/20 text-white hover:bg-white/5 font-semibold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-colors"
                  >
                    Sign in
                  </Link>
                </div>
                <p className="text-slate-500 text-xs mt-4">No credit card · No catch · Mobile-first</p>
              </div>

              {/* Hero visual: calendar screenshot */}
              <div className="flex-shrink-0">
                <VisualCard src="/landing/calendar.png" alt="PickleTracker calendar showing tournaments and sessions" />
              </div>

            </div>
          </div>
        </section>

        {/* ── PRIMARY 1: Expense Tracking ─────────────────────── */}
        <section className="bg-white py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

              {/* Visual: dashboard screenshot */}
              <div className="flex-shrink-0 order-2 lg:order-1">
                <VisualCard src="/landing/dashboard.png" alt="PickleTracker dashboard showing tournament and practice expense breakdown" />
              </div>

              {/* Copy */}
              <div className="flex-1 order-1 lg:order-2 text-center lg:text-left">
                <p className="text-[#ec9937] text-xs font-bold uppercase tracking-[0.15em] mb-3">Expense tracking</p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#272702] leading-tight tracking-tight mb-4">
                  Every fee, every prize —<br />tracked in seconds.
                </h2>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6 max-w-md mx-auto lg:mx-0">
                  Most players have no idea what they're really spending. PickleTracker totals every entry fee, court rental, coach fee, and travel cost — and shows what's actually left after prize money.
                </p>
                <ul className="space-y-2.5 max-w-md mx-auto lg:mx-0 text-left">
                  <li className="flex items-start gap-2.5 text-sm text-gray-700"><Check />Itemized travel — transport, food, stay, visa</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-700"><Check />Court fees, coach fees, gear — all counted</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-700"><Check />Month-by-month chart of profit vs. spending</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-700"><Check />Works in any currency &amp; time zone — no matter where you play</li>
                </ul>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4a6e10] hover:text-[#2d7005] transition-colors mt-7"
                >
                  See your real numbers <ArrowRight />
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* ── PRIMARY 2: Calendar View ────────────────────────── */}
        <section className="bg-[#f4f8e8] border-y border-[#91BE4D]/15 py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

              {/* Copy */}
              <div className="flex-1 text-center lg:text-left">
                <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-[0.15em] mb-3">Calendar view</p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#1c350a] leading-tight tracking-tight mb-4">
                  Your whole season<br />on one screen.
                </h2>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6 max-w-md mx-auto lg:mx-0">
                  Past tournaments, upcoming ones, casual play, drills — all on a calendar. Tap any day to log or edit. Tap any tournament to see your profit at a glance.
                </p>
                <ul className="space-y-2.5 max-w-md mx-auto lg:mx-0 text-left">
                  <li className="flex items-start gap-2.5 text-sm text-gray-700"><Check />Past + upcoming in one view</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-700"><Check />Tap to add or edit any session</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-700"><Check />Color-coded by type (tournament / casual / drill)</li>
                </ul>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4a6e10] hover:text-[#2d7005] transition-colors mt-7"
                >
                  Plan your season <ArrowRight />
                </Link>
              </div>

              {/* Visual */}
              <div className="flex-shrink-0">
                <VisualCard src="/landing/calendar.png" alt="PickleTracker calendar with tournaments, drills, and casual play" />
              </div>

            </div>
          </div>
        </section>

        {/* ── PRIMARY 3: Reminders ────────────────────────────── */}
        <section className="bg-white py-16 sm:py-24">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="flex flex-col lg:flex-row items-center gap-12 lg:gap-20">

              {/* Visual */}
              <div className="flex-shrink-0 order-2 lg:order-1">
                <ReminderMockup />
              </div>

              {/* Copy */}
              <div className="flex-1 order-1 lg:order-2 text-center lg:text-left">
                <p className="text-[#ec9937] text-xs font-bold uppercase tracking-[0.15em] mb-3">Reminders</p>
                <h2 className="text-3xl sm:text-4xl font-extrabold text-[#272702] leading-tight tracking-tight mb-4">
                  Show up prepared,<br />not scrambling.
                </h2>
                <p className="text-gray-600 text-base sm:text-lg leading-relaxed mb-6 max-w-md mx-auto lg:mx-0">
                  Get an email and push notification the day before every tournament. Plus a late-evening nudge to log your result. Never miss a date or forget to record what happened.
                </p>
                <ul className="space-y-2.5 max-w-md mx-auto lg:mx-0 text-left">
                  <li className="flex items-start gap-2.5 text-sm text-gray-700"><Check />Day-before email reminder</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-700"><Check />Push notifications — no app install needed</li>
                  <li className="flex items-start gap-2.5 text-sm text-gray-700"><Check />Time-zone aware — fires in your local time</li>
                </ul>
                <Link
                  to="/signup"
                  className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4a6e10] hover:text-[#2d7005] transition-colors mt-7"
                >
                  Never miss a tournament <ArrowRight />
                </Link>
              </div>

            </div>
          </div>
        </section>

        {/* ── Other Benefits Grid ─────────────────────────────── */}
        <section className="bg-[#f9fafb] border-y border-gray-100 py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="text-center mb-10">
              <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-[0.15em] mb-3">More reasons to love it</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#272702] leading-tight tracking-tight">
                And a few more things you'll like.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 max-w-5xl mx-auto">
              {[
                { emoji: '🎯', title: 'Performance journal', desc: 'Log skills you nailed, weaknesses you noticed, drills you ran. Spot patterns over time.' },
                { emoji: '🎥', title: 'YouTube tips for your weaknesses', desc: 'Pick what you struggled with and we surface drill videos matched to your level — fundamentals, technique, or advanced drills.' },
                { emoji: '👨‍🏫', title: 'Coach mode', desc: 'Track your coaching income, students, and sessions separately from your own play.' },
                { emoji: '✈️', title: 'Travel breakdown', desc: 'Transport, food, accommodation, visa, insurance — itemized so you see the real cost.' },
                { emoji: '🏅', title: 'Medals & achievements', desc: 'Every gold, silver, and bronze you win is tracked across categories and shown on your profile.' },
                { emoji: '💸', title: '100% free', desc: 'No paywalls, no credit card, no hidden plan. Track everything, forever.' },
              ].map(b => (
                <div key={b.title} className="bg-white rounded-2xl p-5 border border-gray-100 hover:border-[#91BE4D]/30 hover:shadow-md transition-all">
                  <div className="text-2xl mb-2.5">{b.emoji}</div>
                  <h3 className="text-sm font-bold text-[#272702] mb-1.5">{b.title}</h3>
                  <p className="text-xs text-gray-500 leading-relaxed">{b.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ── Who It's For ─────────────────────────────────────── */}
        <section className="bg-white py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="text-center mb-10">
              <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-[0.15em] mb-3">Who it's for</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#272702] leading-tight tracking-tight">
                Your role. Your features.
              </h2>
              <p className="text-gray-500 text-sm mt-3 max-w-xl mx-auto leading-relaxed">
                Pick your role on signup — the app shows only what's relevant to you.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 max-w-3xl mx-auto">
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
                <ul className="space-y-2 mb-5">
                  {['Track prize money vs. entry fees', 'See which category earns more', 'Log practice sessions, court fees & travel', 'Track gear spend — paddles, shoes', 'Full calendar view of your season'].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <Check />{f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="inline-flex items-center gap-1.5 text-sm font-bold text-[#4a6e10] hover:text-[#2d7005] transition-colors">
                  Get started as a Player <ArrowRight />
                </Link>
              </div>

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
                <ul className="space-y-2 mb-5">
                  {['Log private, group, or monthly coaching', 'Record income and any costs', 'See coaching in dashboard totals', 'Optionally track totals by student', 'Everything a player gets — plus coaching'].map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                      <svg className="w-4 h-4 text-green-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                      </svg>
                      {f}
                    </li>
                  ))}
                </ul>
                <Link to="/signup" className="inline-flex items-center gap-1.5 text-sm font-bold text-green-700 hover:text-green-800 transition-colors">
                  Get started as a Coach <ArrowRight />
                </Link>
              </div>
            </div>
          </div>
        </section>

        {/* ── Testimonials ────────────────────────────────────── */}
        <section className="bg-[#f9fafb] border-y border-gray-100 py-16 sm:py-20">
          <div className="max-w-6xl mx-auto px-5 sm:px-8">
            <div className="text-center mb-10">
              <p className="text-[#ec9937] text-xs font-bold uppercase tracking-[0.15em] mb-3">What players are saying</p>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-[#272702] leading-tight tracking-tight">
                Real players. Real reviews.
              </h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 max-w-5xl mx-auto">
              {[
                {
                  quote: "The expense tracker is really helpful. I finally know exactly what I'm spending on pickleball — and on which area. Will share more feedback as I keep using it.",
                  name: 'Rohan S.',
                  role: 'Tournament Player',
                  avatarBg: 'from-[#2d7005] to-[#91BE4D]',
                },
                {
                  quote: "Great initiative for players at every level. It's helped me stay on top of my pickleball schedule.",
                  name: 'Priya M.',
                  role: 'Active Player',
                  avatarBg: 'from-[#ec9937] to-[#a86010]',
                },
                {
                  quote: "I started using it to track my expenses and also to check how often I've been playing. Finally have both numbers in one place.",
                  name: 'Vikram R.',
                  role: 'Casual + Tournament',
                  avatarBg: 'from-[#4a6e10] to-[#91BE4D]',
                },
              ].map((t) => (
                <div key={t.name} className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-md hover:border-[#91BE4D]/30 transition-all flex flex-col">
                  <svg className="w-7 h-7 text-[#91BE4D]/40 mb-3 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                    <path d="M9.583 6c-3.42 0-6.583 2.96-6.583 7.054 0 3.014 2.123 4.946 4.524 4.946 2.001 0 3.476-1.517 3.476-3.464 0-1.973-1.394-3.27-2.998-3.27-.327 0-.785.054-.917.108.246-1.621 1.989-3.567 3.755-4.378l-1.257-.996zM18.583 6c-3.42 0-6.583 2.96-6.583 7.054 0 3.014 2.123 4.946 4.524 4.946 2.001 0 3.476-1.517 3.476-3.464 0-1.973-1.394-3.27-2.998-3.27-.327 0-.785.054-.917.108.246-1.621 1.989-3.567 3.755-4.378l-1.257-.996z" />
                  </svg>
                  <p className="text-sm text-gray-700 leading-relaxed mb-5 flex-1">"{t.quote}"</p>
                  <div className="flex items-center gap-3 pt-4 border-t border-gray-100">
                    <div className={`w-10 h-10 rounded-full bg-gradient-to-br ${t.avatarBg} flex items-center justify-center flex-shrink-0`}>
                      <span className="text-white text-sm font-black">{t.name.split(' ').map(n => n[0]).join('')}</span>
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-[#272702] truncate">{t.name}</p>
                      <p className="text-xs text-gray-500 truncate">{t.role}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <p className="text-center text-xs text-gray-400 mt-8">
              Based on real feedback from active PickleTracker users.
            </p>
          </div>
        </section>

        {/* ── Final CTA ───────────────────────────────────────── */}
        <section className="bg-[#1c350a] py-16 sm:py-20 relative overflow-hidden">
          <div className="absolute right-0 top-0 w-64 h-64 bg-[#91BE4D] opacity-5 rounded-full blur-3xl" />
          <div className="absolute left-0 bottom-0 w-48 h-48 bg-[#ec9937] opacity-5 rounded-full blur-3xl" />
          <div className="relative max-w-3xl mx-auto px-5 sm:px-8 text-center">
            <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-[0.15em] mb-4">Ready?</p>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-4 leading-tight">
              Track your tournaments.<br />
              <span className="text-[#91BE4D]">Know what you're spending.</span>
            </h2>
            <p className="text-slate-400 text-base mb-8 max-w-md mx-auto leading-relaxed">
              Takes 60 seconds to start. No credit card. Free forever.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Link
                to="/signup"
                className="inline-flex items-center justify-center gap-2 hover:opacity-90 text-white font-bold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-opacity shadow-lg"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
              >
                Create your free account
                <ArrowRight />
              </Link>
              <Link
                to="/login"
                className="inline-flex items-center justify-center border border-white/20 text-white hover:bg-white/5 font-semibold px-8 py-3.5 rounded-lg text-sm tracking-wide transition-colors"
              >
                I already have an account
              </Link>
            </div>
          </div>
        </section>

      </main>

      {/* ── Footer ──────────────────────────────────────────── */}
      <footer className="bg-[#1c1c02] border-t border-white/5">
        <div className="max-w-6xl mx-auto px-5 sm:px-8 py-12">
          <div className="flex flex-col sm:flex-row justify-between gap-10">

            <div className="max-w-md">
              <div className="mb-4"><BrandLogo size="lg" /></div>
              <p className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.14em] mb-3">About</p>
              <p className="text-sm text-slate-400 leading-relaxed mb-3">
                Hi, I'm <span className="text-white font-semibold">Amandeep Saini</span> — a software engineer and a passionate pickleball player. I built PickleTracker to help fellow players track what they're spending on the sport and get better at the same time.
              </p>
              <p className="text-sm text-slate-400 leading-relaxed">
                Built by a player, for players.
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
                    <a href={instagramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-[#91BE4D] transition-colors">
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
