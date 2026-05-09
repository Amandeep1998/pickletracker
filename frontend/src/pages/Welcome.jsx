import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import BrandLogo from '../components/BrandLogo';

const FEATURES = [
  {
    icon: '🏆',
    title: 'Track Tournaments',
    desc: 'Log every tournament — entry fees, winnings, medals — all in one place.',
    color: 'bg-[#fff8ef] border-[#ec9937]/30',
    iconBg: 'bg-[#ec9937]/10',
  },
  {
    icon: '📊',
    title: 'See Your P&L',
    desc: 'Know exactly how much you earn (or spend) playing pickleball.',
    color: 'bg-[#f4f8e8] border-[#91BE4D]/30',
    iconBg: 'bg-[#91BE4D]/10',
  },
  {
    icon: '📅',
    title: 'Calendar View',
    desc: 'Visualise your tournament schedule at a glance.',
    color: 'bg-[#f0f7ff] border-blue-200/60',
    iconBg: 'bg-blue-100/60',
  },
  {
    icon: '👥',
    title: 'Community Feed',
    desc: 'See what other players are winning across the country.',
    color: 'bg-[#fdf4ff] border-purple-200/50',
    iconBg: 'bg-purple-100/50',
  },
];

const TOTAL_STEPS = 3;

function StepDots({ current }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
        <div
          key={i}
          className={`rounded-full transition-all duration-300 ${
            i === current
              ? 'w-6 h-2 bg-[#91BE4D]'
              : i < current
              ? 'w-2 h-2 bg-[#91BE4D]/40'
              : 'w-2 h-2 bg-gray-200'
          }`}
        />
      ))}
    </div>
  );
}

function StepHello({ user, onNext }) {
  const firstName = user?.name?.split(' ')[0] || 'there';
  return (
    <div className="text-center flex flex-col items-center">
      <div className="text-6xl mb-4">👋</div>
      <h1 className="text-3xl font-extrabold text-[#1c350a] mb-2">
        Hey, {firstName}!
      </h1>
      <p className="text-gray-500 text-sm leading-relaxed max-w-xs mb-8">
        Welcome to <strong className="text-[#2d7005]">PickleTracker</strong> — your personal pickleball finance dashboard.
        Let&apos;s get you set up in 30 seconds.
      </p>
      <button
        onClick={onNext}
        className="w-full max-w-xs py-3 rounded-xl text-white font-bold text-sm tracking-wide transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 50%, #ec9937)' }}
      >
        Let&apos;s go →
      </button>
    </div>
  );
}

function StepFeatures({ onNext, onSkip }) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-[#1c350a] text-center mb-1">
        Everything you need
      </h2>
      <p className="text-sm text-gray-400 text-center mb-5">Here&apos;s what PickleTracker does for you</p>

      <div className="space-y-3 mb-6">
        {FEATURES.map((f) => (
          <div key={f.title} className={`flex items-start gap-3 p-3.5 rounded-2xl border ${f.color}`}>
            <div className={`w-10 h-10 rounded-xl ${f.iconBg} flex items-center justify-center text-xl flex-shrink-0`}>
              {f.icon}
            </div>
            <div>
              <p className="text-sm font-bold text-gray-800">{f.title}</p>
              <p className="text-xs text-gray-500 mt-0.5 leading-snug">{f.desc}</p>
            </div>
          </div>
        ))}
      </div>

      <button
        onClick={onNext}
        className="w-full py-3 rounded-xl text-white font-bold text-sm tracking-wide transition-opacity hover:opacity-90"
        style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 50%, #ec9937)' }}
      >
        Add my first tournament →
      </button>
      <div className="text-center mt-3">
        <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors">
          Skip for now
        </button>
      </div>
    </div>
  );
}

function StepFirstTournament({ onChoice, onSkip }) {
  return (
    <div>
      <h2 className="text-xl font-extrabold text-[#1c350a] text-center mb-1">
        Log your first tournament
      </h2>
      <p className="text-sm text-gray-400 text-center mb-6">Takes less than 2 minutes!</p>

      <div className="space-y-3 mb-6">
        <button
          type="button"
          onClick={() => onChoice()}
          className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#91BE4D]/40 bg-[#f4f8e8] hover:border-[#91BE4D] hover:bg-[#edf5d4] active:scale-[0.98] transition-all text-left"
        >
          <span className="text-4xl">📅</span>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-[#1c350a]">I&apos;m playing soon</p>
            <p className="text-xs text-gray-500 mt-0.5">My tournament hasn&apos;t happened yet</p>
          </div>
          <svg className="w-4 h-4 text-[#91BE4D] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>

        <button
          type="button"
          onClick={() => onChoice()}
          className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#ec9937]/40 bg-[#fff8ef] hover:border-[#ec9937] hover:bg-[#fef0d8] active:scale-[0.98] transition-all text-left"
        >
          <span className="text-4xl">🏆</span>
          <div className="flex-1">
            <p className="text-sm font-extrabold text-[#7a4808]">I already played</p>
            <p className="text-xs text-gray-500 mt-0.5">I want to record a past tournament</p>
          </div>
          <svg className="w-4 h-4 text-[#ec9937] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>

      <div className="text-center">
        <button onClick={onSkip} className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors">
          I&apos;ll do this later
        </button>
      </div>
    </div>
  );
}

export default function Welcome() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const [checkingExisting, setCheckingExisting] = useState(true);

  // Users who already completed onboarding should not see this page
  useEffect(() => {
    if (user && user.onboardingDone) {
      navigate('/home', { replace: true });
    }
  }, [user, navigate]);

  // Existing users with tournaments already logged should bypass onboarding
  useEffect(() => {
    let cancelled = false;
    if (!user) return;
    if (user.onboardingDone) {
      setCheckingExisting(false);
      return;
    }
    (async () => {
      try {
        const res = await api.getTournaments();
        const list = res.data?.data || res.data || [];
        if (cancelled) return;
        if (Array.isArray(list) && list.length > 0) {
          try {
            const upd = await api.updateProfile({ onboardingDone: true });
            if (upd.data?.data) refreshUser(upd.data.data);
          } catch {}
          navigate('/home', { replace: true });
          return;
        }
      } catch {}
      if (!cancelled) setCheckingExisting(false);
    })();
    return () => { cancelled = true; };
  }, [user, navigate, refreshUser]);

  const markDone = async () => {
    try {
      const res = await api.updateProfile({ onboardingDone: true });
      if (res.data?.data) refreshUser(res.data.data);
    } catch {
      // non-critical
    }
  };

  const finish = async () => {
    await markDone();
    navigate('/home', { replace: true });
  };

  const goToCalendarWithTournament = async () => {
    await markDone();
    navigate('/calendar', { replace: true, state: { openAdd: 'tournament' } });
  };

  const next = () => setStep((s) => Math.min(s + 1, TOTAL_STEPS - 1));

  if (!user) return null;
  if (checkingExisting) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-[#f4f8e8] via-white to-[#fff8ef] flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-5 pt-5 pb-2">
        <BrandLogo size="lg" />
        <button
          onClick={finish}
          className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
        >
          Skip setup
        </button>
      </div>

      {/* Body */}
      <div className="flex-1 flex items-center justify-center px-5 py-6">
        <div className="w-full max-w-sm">
          <StepDots current={step} />

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6">
            {step === 0 && <StepHello user={user} onNext={next} />}
            {step === 1 && <StepFeatures onNext={next} onSkip={finish} />}
            {step === 2 && (
              <StepFirstTournament
                onChoice={goToCalendarWithTournament}
                onSkip={finish}
              />
            )}
          </div>

          {step > 0 && (
            <div className="text-center mt-4">
              <button
                onClick={() => setStep((s) => s - 1)}
                className="text-xs text-gray-400 hover:text-gray-600 transition-colors"
              >
                ← Back
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
