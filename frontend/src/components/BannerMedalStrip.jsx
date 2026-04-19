import React from 'react';

const ITEMS = [
  { key: 'Gold',   emoji: '🥇' },
  { key: 'Silver', emoji: '🥈' },
  { key: 'Bronze', emoji: '🥉' },
];

/**
 * Compact medal tally chip strip designed for the dark banner gradients used
 * across the app (Dashboard, Calendar, Journal, Nearby Players).
 *
 * - Emoji on top (rendered with no color filter so the native gold/silver/bronze
 *   stays vibrant against the dark background — the user explicitly asked that
 *   the colour not get overridden).
 * - Bold white count below.
 * - Glassy translucent chip background so the strip reads as part of the banner
 *   rather than fighting it.
 *
 * Pass `medals = { Gold, Silver, Bronze }`. Zero counts are shown by default so
 * the affordance is always present and motivational; pass `hideWhenEmpty` to
 * suppress when nothing is logged yet.
 */
export default function BannerMedalStrip({ medals, className = '', hideWhenEmpty = false }) {
  const safe = medals || { Gold: 0, Silver: 0, Bronze: 0 };
  const total = (safe.Gold || 0) + (safe.Silver || 0) + (safe.Bronze || 0);
  if (hideWhenEmpty && total === 0) return null;

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {ITEMS.map((m) => {
        const count = safe[m.key] || 0;
        return (
          <div
            key={m.key}
            className="flex flex-col items-center justify-center min-w-[46px] px-2.5 py-1 rounded-lg bg-white/10 border border-white/20 backdrop-blur-sm"
            title={`${count} ${m.key} medal${count === 1 ? '' : 's'}`}
          >
            <span className="text-base sm:text-lg leading-none" aria-hidden="true">{m.emoji}</span>
            <span className="text-sm sm:text-base font-extrabold text-white leading-tight mt-0.5">
              {count}
            </span>
          </div>
        );
      })}
    </div>
  );
}
