import React, { useState } from 'react';

const STEPS = [
  {
    icon: (
      <svg className="w-8 h-8 text-[#ec9937]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
      </svg>
    ),
    title: 'Add a Tournament',
    desc: "Tap '+ Add Tournament' to log a pickleball event. Enter the name, location, and the categories you're playing.",
  },
  {
    icon: (
      <svg className="w-8 h-8 text-[#91BE4D]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
      </svg>
    ),
    title: 'Track Your Results',
    desc: 'For each category, record your entry fee, medal, and prize money. Your profit is calculated automatically.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
      </svg>
    ),
    title: 'Use Your Calendar',
    desc: 'The Calendar tab shows all your tournaments by date. Tap any date to add a tournament directly from there.',
  },
  {
    icon: (
      <svg className="w-8 h-8 text-purple-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.8}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
    title: 'See Your Analytics',
    desc: 'The Dashboard shows your total earnings, expenses, net profit, and a month-by-month chart of your performance.',
  },
];

const STORAGE_KEY = 'pt_onboarding_done';

export default function WelcomeModal({ userName }) {
  const [step, setStep] = useState(0);
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));

  if (!visible) return null;

  const isLast = step === STEPS.length - 1;
  const current = STEPS[step];

  const dismiss = () => {
    localStorage.setItem(STORAGE_KEY, '1');
    setVisible(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.55)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        {/* Header */}
        <div className="bg-gradient-to-r from-[#272702] to-[#2a3300] px-6 pt-7 pb-6 text-center">
          <div className="flex items-baseline justify-center gap-0.5 mb-1">
            <span className="text-2xl font-bold text-[#91BE4D]">Pickle</span>
            <span className="text-2xl font-bold text-[#ec9937]">Tracker</span>
          </div>
          <p className="text-slate-300 text-sm mt-1">
            Welcome{userName ? `, ${userName.split(' ')[0]}` : ''}! Here's how to get started.
          </p>
        </div>

        {/* Step dots */}
        <div className="flex justify-center gap-2 pt-5 px-6">
          {STEPS.map((_, i) => (
            <button
              key={i}
              onClick={() => setStep(i)}
              className={`h-1.5 rounded-full transition-all ${
                i === step ? 'w-6 bg-[#91BE4D]' : 'w-1.5 bg-gray-200'
              }`}
            />
          ))}
        </div>

        {/* Step content */}
        <div className="px-6 py-6 text-center min-h-[180px] flex flex-col items-center justify-center">
          <div className="w-16 h-16 rounded-2xl bg-gray-50 border border-gray-100 flex items-center justify-center mb-4">
            {current.icon}
          </div>
          <h2 className="text-base font-bold text-gray-900 mb-2">{current.title}</h2>
          <p className="text-sm text-gray-500 leading-relaxed">{current.desc}</p>
        </div>

        {/* Actions */}
        <div className="px-6 pb-6 flex gap-3">
          <button
            onClick={dismiss}
            className="flex-1 text-sm text-gray-400 hover:text-gray-600 font-medium py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
          >
            Skip
          </button>
          <button
            onClick={isLast ? dismiss : () => setStep((s) => s + 1)}
            className="flex-1 text-sm bg-[#ec9937] hover:bg-[#d4831f] text-white font-bold py-2.5 rounded-xl transition-colors"
          >
            {isLast ? "Let's Go!" : 'Next'}
          </button>
        </div>
      </div>
    </div>
  );
}
