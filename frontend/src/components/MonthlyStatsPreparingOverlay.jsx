import React from 'react';
import { createPortal } from 'react-dom';

/**
 * Brief overlay after saving a tournament or session while lists refresh
 * before SaveCelebrationModal opens — explains why there is a short wait.
 */
export default function MonthlyStatsPreparingOverlay({ open, variant = 'tournament' }) {
  if (!open) return null;

  const isSession = variant === 'session';

  return createPortal(
    <div
      className="fixed inset-0 z-[59] flex items-center justify-center px-4"
      style={{ background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(2px)' }}
      aria-live="polite"
      aria-busy="true"
      role="status"
    >
      <div className="bg-white rounded-2xl shadow-xl px-6 py-5 max-w-sm w-full text-center border border-gray-100">
        <div
          className="w-9 h-9 border-2 border-[#91BE4D] border-t-transparent rounded-full animate-spin mx-auto mb-3"
          aria-hidden
        />
        <p className="text-sm font-bold text-gray-900">
          {isSession ? 'Updating your month snapshot…' : 'Calculating your monthly totals…'}
        </p>
        <p className="text-xs text-gray-500 mt-1.5 leading-snug">
          {isSession
            ? 'Syncing sessions and costs so this month’s summary is up to date.'
            : 'Refreshing tournaments and expenses so this month’s summary is accurate.'}
        </p>
      </div>
    </div>,
    document.body
  );
}
