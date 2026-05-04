import React, { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { getCurrencySymbol } from '../utils/format';

function useCountUp(target, duration = 900, started = true) {
  const [value, setValue] = useState(target);
  const lastTargetRef = useRef(target);

  useEffect(() => {
    if (!started) {
      setValue(target);
      lastTargetRef.current = target;
      return;
    }
    if (target === lastTargetRef.current) return;
    const start = lastTargetRef.current;
    lastTargetRef.current = target;
    const startTime = performance.now();
    const diff = target - start;

    let raf;
    const tick = (now) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(start + diff * eased);
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, duration, started]);

  return value;
}

function formatCurrencyWhole(amount, currency = 'INR') {
  const localeMap = {
    INR: 'en-IN', USD: 'en-US', AUD: 'en-AU', EUR: 'de-DE',
    GBP: 'en-GB', CAD: 'en-CA', SGD: 'en-SG', MYR: 'ms-MY', PHP: 'en-PH',
  };
  const locale = localeMap[currency] || 'en-US';
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

const SPARKLES = [
  { x: -42, y: -16, size: 6, color: '#91BE4D', delay: 0 },
  { x: 42,  y: -20, size: 5, color: '#f59e0b', delay: 60 },
  { x: -32, y: 22,  size: 4, color: '#f59e0b', delay: 100 },
  { x: 36,  y: 18,  size: 6, color: '#91BE4D', delay: 40 },
  { x: 0,   y: -36, size: 4, color: '#ec9937', delay: 80 },
];

const ROW_THEMES = {
  entryFee: { bg: '#fef2f2', border: '#fee2e2', label: '#b91c1c', amount: '#dc2626' },
  travel:   { bg: '#f0f9ff', border: '#e0f2fe', label: '#0369a1', amount: '#0284c7' },
  winnings: { bg: '#f0fdf4', border: '#dcfce7', label: '#15803d', amount: '#16a34a' },
  courtFee: { bg: '#fefce8', border: '#fef3c7', label: '#a16207', amount: '#ca8a04' },
  coachFee: { bg: '#faf5ff', border: '#f3e8ff', label: '#7e22ce', amount: '#9333ea' },
};

const ROW_META = {
  entryFee: { icon: '🎟️', label: 'Entry fee' },
  travel:   { icon: '✈️',  label: 'Travel'    },
  winnings: { icon: '🏆', label: 'Winnings'   },
  courtFee: { icon: '🏟️', label: 'Court fee' },
  coachFee: { icon: '🎯', label: 'Coach fee' },
};

function BreakdownRow({ visible, kind, amount, currency }) {
  const theme = ROW_THEMES[kind];
  const meta = ROW_META[kind];
  if (!theme || !meta) return null;

  return (
    <div
      className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md border"
      style={{
        background: theme.bg,
        borderColor: theme.border,
        opacity: visible ? 1 : 0,
        transform: visible ? 'translateX(0)' : 'translateX(-12px)',
        transition: 'opacity 0.3s ease, transform 0.35s cubic-bezier(0.34,1.56,0.64,1)',
      }}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <span style={{ fontSize: 11 }}>{meta.icon}</span>
        <span className="text-[11px] font-semibold" style={{ color: theme.label }}>{meta.label}</span>
      </div>
      <span className="text-xs font-bold tabular-nums" style={{ color: theme.amount }}>
        +{formatCurrencyWhole(amount, currency)}
      </span>
    </div>
  );
}

/**
 * Single stat tile in the 2x2 (or 3-cell) grid.
 * Animates from `prev` to `target` once `started` is true.
 */
function StatTile({ label, value, theme = 'default', sublabel }) {
  const themes = {
    spend:    { bg: 'linear-gradient(135deg, #1c350a, #2d6e05)', label: '#91BE4D', value: '#fff' },
    earned:   { bg: 'linear-gradient(135deg, #78350f, #d97706)', label: '#fde68a', value: '#fff' },
    profit:   { bg: 'linear-gradient(135deg, #064e3b, #059669)', label: '#a7f3d0', value: '#fff' },
    loss:     { bg: 'linear-gradient(135deg, #7f1d1d, #dc2626)', label: '#fecaca', value: '#fff' },
    count:    { bg: 'linear-gradient(135deg, #1e3a8a, #3b82f6)', label: '#bfdbfe', value: '#fff' },
    rating:   { bg: 'linear-gradient(135deg, #831843, #db2777)', label: '#fbcfe8', value: '#fff' },
    practice: { bg: 'linear-gradient(135deg, #1e293b, #475569)', label: '#cbd5e1', value: '#fff' },
    default:  { bg: 'linear-gradient(135deg, #374151, #6b7280)', label: '#d1d5db', value: '#fff' },
  };
  const t = themes[theme] || themes.default;

  return (
    <div
      className="rounded-xl px-2.5 py-2 flex flex-col justify-between min-h-[62px]"
      style={{ background: t.bg }}
    >
      <p className="text-[9px] font-bold uppercase tracking-wider leading-tight" style={{ color: t.label }}>
        {label}
      </p>
      <div className="flex items-baseline gap-1">
        <span
          className="text-lg font-black tabular-nums leading-none"
          style={{ color: t.value, fontVariantNumeric: 'tabular-nums', letterSpacing: '-0.3px' }}
        >
          {value}
        </span>
        {sublabel && (
          <span className="text-[9px] font-medium opacity-75" style={{ color: t.label }}>{sublabel}</span>
        )}
      </div>
    </div>
  );
}

/**
 * Animated currency stat tile.
 */
function CurrencyStat({ label, prev, target, currency, theme, started }) {
  const display = useCountUp(started ? target : prev, 900, true);
  return <StatTile label={label} value={formatCurrencyWhole(display, currency)} theme={theme} />;
}

/**
 * Animated number stat tile (integer count).
 */
function NumberStat({ label, prev, target, theme, sublabel, started }) {
  const display = useCountUp(started ? target : prev, 900, true);
  return (
    <StatTile
      label={label}
      value={Math.round(display).toString()}
      theme={theme}
      sublabel={sublabel}
    />
  );
}

export default function SaveCelebrationModal({
  isOpen,
  onClose,
  kind = 'tournament',          // 'tournament' | 'session'
  name = '',
  additions = [],               // [{ kind, amount }]
  currency = 'INR',

  // Tournament-specific
  prevMonthSpend = 0,
  prevMonthEarnings = 0,
  prevMonthTournamentCount = 0,

  // Session-specific
  prevMonthPracticeCost = 0,
  prevMonthSessionCount = 0,
  prevMonthAvgRating = null,
  newSessionRating = null,
  weaknesses = [],
  videoUrlBuilder = null,        // (skill, rating) => url
}) {
  const [phase, setPhase] = useState(0);
  const symbol = getCurrencySymbol(currency);

  // ── derive deltas ─────────────────────────────────────────────────────
  const sumAddition = (k) => additions.filter((a) => a.kind === k).reduce((s, a) => s + a.amount, 0);

  // tournament
  const dEntry = sumAddition('entryFee');
  const dTravelT = sumAddition('travel');
  const dWinnings = sumAddition('winnings');
  const newSpend = prevMonthSpend + dEntry + dTravelT;
  const newEarnings = prevMonthEarnings + dWinnings;
  const newNet = newEarnings - newSpend;
  const newTournamentCount = prevMonthTournamentCount + 1;

  // session
  const dCourt = sumAddition('courtFee');
  const dCoach = sumAddition('coachFee');
  const dTravelS = sumAddition('travel');
  const newPracticeCost = prevMonthPracticeCost + dCourt + dCoach + dTravelS;
  const newSessionCount = prevMonthSessionCount + 1;
  // New avg rating = ((prevAvg * prevCount) + newRating) / newCount
  const newAvgRating = (() => {
    if (newSessionRating == null) return prevMonthAvgRating;
    const totalRating = (prevMonthAvgRating || 0) * prevMonthSessionCount + newSessionRating;
    return totalRating / newSessionCount;
  })();

  // Phases:
  // 0 = closed
  // 1 = coin appears
  // 2 = title fades in
  // 3+ = breakdown rows reveal sequentially
  // 3 + additions.length = stats start animating
  useEffect(() => {
    if (!isOpen) {
      setPhase(0);
      return;
    }
    const timers = [];
    timers.push(setTimeout(() => setPhase(1), 80));   // coin
    timers.push(setTimeout(() => setPhase(2), 550));  // title
    additions.forEach((_, i) => {
      timers.push(setTimeout(() => setPhase(3 + i), 850 + i * 250));
    });
    // After last row → stats animate
    timers.push(setTimeout(() => setPhase(3 + Math.max(additions.length, 1)), 850 + additions.length * 250));
    return () => timers.forEach(clearTimeout);
  }, [isOpen, additions.length]);

  if (!isOpen) return null;

  const revealedRows = Math.max(0, phase - 3);
  const statsStarted = phase >= 3 + additions.length;

  return createPortal(
    <>
      <style>{`
        @keyframes celebSlideUp {
          from { opacity: 0; transform: translateY(30px) scale(0.94); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes coinDrop {
          0%   { transform: translateY(-50px) scale(0.5) rotate(-12deg); opacity: 0; }
          70%  { transform: translateY(6px)   scale(1.08) rotate(3deg);  opacity: 1; }
          100% { transform: translateY(0)     scale(1)    rotate(0deg);  opacity: 1; }
        }
        @keyframes coinGlow {
          0%, 100% { box-shadow: 0 4px 16px rgba(245,158,11,0.4); }
          50%      { box-shadow: 0 4px 24px rgba(245,158,11,0.7); }
        }
        @keyframes sparkleOut {
          0%   { transform: scale(0);   opacity: 1; }
          60%  { opacity: 0.8; }
          100% { transform: scale(2);   opacity: 0; }
        }
        @keyframes labelFade {
          from { opacity: 0; transform: translateY(3px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes statsAppear {
          from { opacity: 0; transform: translateY(8px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      <div
        className="fixed inset-0 z-[60] flex items-center justify-center px-3"
        style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(2px)' }}
        onClick={onClose}
      >
        <div
          className="relative bg-white rounded-2xl shadow-2xl w-full max-w-[340px] overflow-hidden"
          style={{ animation: 'celebSlideUp 0.4s cubic-bezier(0.34,1.56,0.64,1) forwards' }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Top accent bar */}
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          />

          <div className="px-4 pt-4 pb-4">

            {/* Coin + sparkles */}
            <div className="relative flex justify-center mb-2" style={{ height: 52 }}>
              {phase >= 2 && SPARKLES.map((p, i) => (
                <div
                  key={i}
                  style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: p.size,
                    height: p.size,
                    borderRadius: '50%',
                    background: p.color,
                    marginTop: p.y - p.size / 2,
                    marginLeft: p.x - p.size / 2,
                    animation: `sparkleOut 0.6s ${p.delay}ms ease-out forwards`,
                    opacity: 0,
                  }}
                />
              ))}

              {phase >= 1 && (
                <div
                  className="w-[48px] h-[48px] rounded-full flex items-center justify-center select-none"
                  style={{
                    background: 'linear-gradient(135deg, #fcd34d, #f59e0b 50%, #d97706)',
                    animation: 'coinDrop 0.45s cubic-bezier(0.34,1.56,0.64,1) forwards, coinGlow 2s 0.5s ease-in-out infinite',
                    boxShadow: '0 4px 16px rgba(245,158,11,0.4)',
                    color: '#78350f',
                    fontSize: '1.25rem',
                    fontWeight: 900,
                    lineHeight: 1,
                  }}
                >
                  {kind === 'session' ? '🏸' : symbol}
                </div>
              )}
            </div>

            {/* Title */}
            <p
              className="text-center text-[10px] font-bold uppercase tracking-widest mb-0.5"
              style={{ color: '#91BE4D', animation: 'labelFade 0.3s 0.55s ease forwards', opacity: 0 }}
            >
              {kind === 'session' ? 'Practice Logged!' : 'Tournament Saved!'}
            </p>
            <h2
              className="text-center text-[13px] font-bold text-gray-800 mb-3 px-1 leading-snug truncate"
              style={{ animation: 'labelFade 0.3s 0.7s ease forwards', opacity: 0 }}
            >
              {name}
            </h2>

            {/* Breakdown rows */}
            {additions.length > 0 && (
              <div className="flex flex-col gap-1 mb-2.5">
                {additions.map((row, i) => (
                  <BreakdownRow
                    key={`${row.kind}-${i}`}
                    visible={revealedRows > i}
                    kind={row.kind}
                    amount={row.amount}
                    currency={currency}
                  />
                ))}
              </div>
            )}

            {/* Down arrow */}
            <div
              className="flex justify-center mb-2"
              style={{
                opacity: statsStarted ? 1 : 0,
                transition: 'opacity 0.3s ease',
              }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                <line x1="12" y1="5" x2="12" y2="19" />
                <polyline points="19 12 12 19 5 12" />
              </svg>
            </div>

            {/* Section label */}
            <p
              className="text-center text-[9px] font-bold uppercase tracking-widest text-gray-400 mb-1.5"
              style={{ opacity: statsStarted ? 1 : 0, transition: 'opacity 0.3s ease' }}
            >
              This month so far
            </p>

            {/* Stats grid */}
            <div
              className="grid grid-cols-2 gap-1.5 mb-3"
              style={{
                animation: statsStarted ? 'statsAppear 0.4s ease forwards' : 'none',
                opacity: statsStarted ? 1 : 0,
              }}
            >
              {kind === 'tournament' ? (
                <>
                  <CurrencyStat
                    label="Spent"
                    prev={prevMonthSpend}
                    target={newSpend}
                    currency={currency}
                    theme="spend"
                    started={statsStarted}
                  />
                  <CurrencyStat
                    label="Earned"
                    prev={prevMonthEarnings}
                    target={newEarnings}
                    currency={currency}
                    theme="earned"
                    started={statsStarted}
                  />
                  <CurrencyStat
                    label="Net this month"
                    prev={prevMonthEarnings - prevMonthSpend}
                    target={newNet}
                    currency={currency}
                    theme={newNet >= 0 ? 'profit' : 'loss'}
                    started={statsStarted}
                  />
                  <NumberStat
                    label="Tournaments"
                    prev={prevMonthTournamentCount}
                    target={newTournamentCount}
                    theme="count"
                    sublabel={newTournamentCount === 1 ? 'event' : 'events'}
                    started={statsStarted}
                  />
                </>
              ) : (
                <>
                  <CurrencyStat
                    label="Practice cost"
                    prev={prevMonthPracticeCost}
                    target={newPracticeCost}
                    currency={currency}
                    theme="practice"
                    started={statsStarted}
                  />
                  <NumberStat
                    label="Sessions"
                    prev={prevMonthSessionCount}
                    target={newSessionCount}
                    theme="count"
                    sublabel={newSessionCount === 1 ? 'played' : 'played'}
                    started={statsStarted}
                  />
                  <StatTile
                    label="Avg rating"
                    value={newAvgRating ? `⭐ ${newAvgRating.toFixed(1)}` : '—'}
                    theme="rating"
                  />
                  <StatTile
                    label="This session"
                    value={newSessionRating ? `⭐ ${newSessionRating}` : '—'}
                    theme="default"
                  />
                </>
              )}
            </div>

            {/* Session weaknesses */}
            {kind === 'session' && weaknesses.length > 0 && videoUrlBuilder && (
              <div
                className="rounded-lg px-2.5 py-2 mb-2"
                style={{
                  background: '#f0f8e8',
                  border: '1px solid #d4e8b0',
                  opacity: statsStarted ? 1 : 0,
                  transition: 'opacity 0.3s 0.2s ease',
                }}
              >
                <p className="text-[9px] font-bold uppercase tracking-wider text-[#2d5a05] mb-1">
                  Watch & improve
                </p>
                <div className="flex flex-col gap-0.5">
                  {weaknesses.slice(0, 3).map((skill) => (
                    <a
                      key={skill}
                      href={videoUrlBuilder(skill, newSessionRating)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 text-[11px] text-gray-700 hover:text-red-600 font-semibold"
                    >
                      <svg className="w-3 h-3 flex-shrink-0 text-red-500" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/>
                      </svg>
                      <span>{skill}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
            >
              Got it!
            </button>
          </div>
        </div>
      </div>
    </>,
    document.body
  );
}
