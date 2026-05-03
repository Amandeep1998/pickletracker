import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

/**
 * First-run overlay on Calendar: pick upcoming vs past, then open the tournament form immediately
 * (no intermediate checklist step).
 */
export default function OnboardingWizard({ onDismiss, onConfirm }) {
  const { refreshUser } = useAuth();

  const markDone = async () => {
    try {
      const res = await api.updateProfile({ onboardingDone: true });
      if (res.data?.data) refreshUser(res.data.data);
    } catch {
      /* non-critical */
    }
  };

  const handleDismiss = async () => {
    await markDone();
    onDismiss?.();
  };

  const choosePath = async (path) => {
    await markDone();
    onDismiss?.();
    onConfirm?.(path);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.65)' }}>
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden">
        <div className="px-6 pt-8 pb-5 text-center border-b border-gray-100">
          <div className="text-5xl mb-3">👋</div>
          <h2 className="text-xl font-extrabold text-gray-900 mb-1.5">Welcome to PickleTracker!</h2>
          <p className="text-sm text-gray-500 leading-snug">
            Let&apos;s log your <strong>first tournament</strong> together.<br />
            Takes less than 2 minutes!
          </p>
        </div>

        <div className="px-5 py-4 space-y-3">
          <p className="text-sm font-bold text-gray-700 text-center">Tell me about your tournament 👇</p>

          <button
            type="button"
            onClick={() => void choosePath('upcoming')}
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
            onClick={() => void choosePath('past')}
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
          <button type="button" onClick={() => void handleDismiss()} className="text-xs text-gray-400 hover:text-gray-600 underline transition-colors">
            Skip for now
          </button>
        </div>
      </div>
    </div>
  );
}
