import React from 'react';
import { createPortal } from 'react-dom';

export default function PushPermissionPrompt({ tournamentName, onAccept, onDismiss, blocked = false }) {
  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-end sm:items-center justify-center"
      style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
    >
      <div className="absolute inset-0 bg-black/50" onClick={onDismiss} />
      <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-sm mx-4 mb-4 sm:mb-0 overflow-hidden">
        <div className={`px-5 pt-5 pb-4 text-white ${blocked ? 'bg-gradient-to-br from-gray-700 via-gray-600 to-gray-500' : 'bg-gradient-to-br from-[#1c350a] via-[#2d6e05] to-[#3a8a06]'}`}>
          <div className="text-3xl mb-2">{blocked ? '🔕' : '🔔'}</div>
          <h2 className="text-base font-bold leading-tight">
            {blocked ? 'Notifications are blocked' : 'Get tournament reminders?'}
          </h2>
          <p className="text-xs text-white/65 mt-1">
            {blocked
              ? 'You\'ve turned off notifications for PickleTracker.'
              : 'Day-before heads-up and a late-evening nudge on play day to log results (your profile time zone).'}
          </p>
        </div>
        <div className="px-5 py-4">
          {blocked ? (
            <>
              <p className="text-sm text-gray-600 leading-relaxed">
                To get a reminder for{' '}
                <span className="font-semibold text-gray-900">{tournamentName}</span>, re-enable
                notifications in your browser settings:
              </p>
              <ol className="mt-3 space-y-1.5 text-xs text-gray-500 list-decimal list-inside leading-relaxed">
                <li>Tap the <span className="font-semibold text-gray-700">lock icon</span> in your browser's address bar</li>
                <li>Find <span className="font-semibold text-gray-700">Notifications</span> and set it to <span className="font-semibold text-gray-700">Allow</span></li>
                <li>Reload the page</li>
              </ol>
              <button
                onClick={onDismiss}
                className="mt-4 w-full py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
              >
                Got it
              </button>
            </>
          ) : (
            <>
              <p className="text-sm text-gray-600 leading-relaxed">
                Don't miss{' '}
                <span className="font-semibold text-gray-900">{tournamentName}</span>. Allow
                notifications for a day-before reminder and a late-evening nudge on play day to log results (your profile time zone) — no
                app store needed.
              </p>
              <div className="mt-4 flex gap-2.5">
                <button
                  onClick={onDismiss}
                  className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-500 hover:bg-gray-50 active:bg-gray-100 transition-colors"
                >
                  Not now
                </button>
                <button
                  onClick={onAccept}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-opacity active:opacity-80"
                  style={{
                    background: 'linear-gradient(to right, #2d6e05, #91BE4D)',
                  }}
                >
                  Allow
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}
