import { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

const UPCOMING_NEEDS = [
  { icon: '✏️', text: 'Tournament name', hint: 'e.g. "City Open 2026"' },
  { icon: '📅', text: 'Date of your match', hint: 'When is it happening?' },
  { icon: '🎯', text: 'Category you\'re playing', hint: 'e.g. Mixed Doubles, Men\'s Singles' },
  { icon: '💸', text: 'Entry fee', hint: 'How much you paid to enter (or 0 if free)' },
];

const PAST_NEEDS = [
  { icon: '✏️', text: 'Tournament name', hint: 'e.g. "City Open 2026"' },
  { icon: '📅', text: 'Date it happened', hint: 'Even an approximate date is fine' },
  { icon: '🎯', text: 'Category you played', hint: 'e.g. Mixed Doubles, Men\'s Singles' },
  { icon: '💸', text: 'Entry fee you paid', hint: 'Enter 0 if it was free' },
  { icon: '🥇', text: 'Did you win a medal?', hint: 'Gold, Silver, Bronze — or None' },
  { icon: '💰', text: 'Prize money', hint: 'Enter 0 if there was no prize' },
];

// onConfirm(path) — called when user taps the CTA. If not provided, nothing happens after marking done.
export default function OnboardingWizard({ onDismiss, onConfirm }) {
  const { refreshUser } = useAuth();
  const [step, setStep] = useState(1);
  const [path, setPath] = useState(null);

  const markDone = async () => {
    try {
      const res = await api.updateProfile({ onboardingDone: true });
      if (res.data?.data) refreshUser(res.data.data);
    } catch { /* non-critical */ }
  };

  const handleDismiss = async () => {
    await markDone();
    onDismiss?.();
  };

  const handleConfirm = async () => {
    await markDone();
    onDismiss?.();
    onConfirm?.(path);
  };

  /* ── Step 1: choose path ─────────────────────────────────────────── */
  if (step === 1) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
        <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
          <div className="px-6 pt-8 pb-5 text-center border-b border-gray-100">
            <div className="text-5xl mb-3">👋</div>
            <h2 className="text-xl font-extrabold text-gray-900 mb-1.5">Welcome to PickleTracker!</h2>
            <p className="text-sm text-gray-500 leading-snug">
              Let's log your <strong>first tournament</strong> together.<br />
              Takes less than 2 minutes!
            </p>
          </div>

          {/* Step dots */}
          <div className="flex items-center justify-center gap-1.5 pt-4 pb-1">
            <span className="w-5 h-1.5 rounded-full bg-[#91BE4D]" />
            <span className="w-5 h-1.5 rounded-full bg-gray-200" />
          </div>

          <div className="px-5 py-4 space-y-3">
            <p className="text-sm font-bold text-gray-700 text-center">Tell me about your tournament 👇</p>

            <button
              onClick={() => { setPath('upcoming'); setStep(2); }}
              className="w-full flex items-center gap-4 p-4 rounded-2xl border-2 border-[#91BE4D]/40 bg-[#f4f8e8] hover:border-[#91BE4D] hover:bg-[#edf5d4] active:scale-[0.98] transition-all text-left"
            >
              <span className="text-4xl">📅</span>
              <div className="flex-1">
                <p className="text-sm font-extrabold text-[#1c350a]">I'm playing soon</p>
                <p className="text-xs text-gray-500 mt-0.5">My tournament hasn't happened yet</p>
              </div>
              <svg className="w-4 h-4 text-[#91BE4D] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>

            <button
              onClick={() => { setPath('past'); setStep(2); }}
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

          <div className="pb-5 text-center">
            <button onClick={handleDismiss} className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors">
              Skip for now
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 2: checklist + CTA ─────────────────────────────────────── */
  const isUpcoming = path === 'upcoming';
  const needs = isUpcoming ? UPCOMING_NEEDS : PAST_NEEDS;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden max-h-[90vh] flex flex-col">
        <div
          className="px-6 pt-6 pb-4 text-center flex-shrink-0"
          style={{ background: isUpcoming ? 'linear-gradient(135deg,#f4f8e8,#edf5d4)' : 'linear-gradient(135deg,#fff8ef,#fef0d8)' }}
        >
          <div className="text-4xl mb-2">{isUpcoming ? '📅' : '🏆'}</div>
          <h2 className="text-lg font-extrabold text-gray-900 mb-1">
            {isUpcoming ? 'Adding an upcoming tournament' : 'Recording a past tournament'}
          </h2>
          <p className="text-xs text-gray-500 leading-snug">
            Grab these before you tap the button — we'll open the form right here!
          </p>
        </div>

        {/* Step dots */}
        <div className="flex items-center justify-center gap-1.5 pt-3 pb-1 flex-shrink-0">
          <span className="w-5 h-1.5 rounded-full bg-gray-200" />
          <span className={`w-5 h-1.5 rounded-full ${isUpcoming ? 'bg-[#91BE4D]' : 'bg-[#ec9937]'}`} />
        </div>

        <div className="px-5 py-3 space-y-2 overflow-y-auto flex-1">
          {needs.map((item) => (
            <div key={item.text} className="flex items-start gap-3 rounded-xl bg-gray-50 border border-gray-100 px-3 py-2.5">
              <span className="text-xl flex-shrink-0">{item.icon}</span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-gray-800 leading-tight">{item.text}</p>
                <p className="text-xs text-gray-400 leading-snug mt-0.5">{item.hint}</p>
              </div>
            </div>
          ))}
        </div>

        <div className="px-5 pb-5 pt-3 space-y-2 flex-shrink-0">
          <button
            onClick={handleConfirm}
            className="w-full text-sm text-white font-extrabold py-3.5 rounded-xl transition-opacity hover:opacity-90 active:scale-[0.98]"
            style={{ background: isUpcoming ? 'linear-gradient(to right,#2d7005,#91BE4D)' : 'linear-gradient(to right,#c07010,#ec9937)' }}
          >
            {isUpcoming ? "I'm ready, open the form! →" : "I'm ready, open the form! →"}
          </button>
          <button onClick={() => setStep(1)} className="w-full text-xs text-gray-400 hover:text-gray-600 py-1 transition-colors">
            ← Go back
          </button>
        </div>
      </div>
    </div>
  );
}
