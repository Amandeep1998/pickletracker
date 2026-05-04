import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { getCurrencySymbol } from '../utils/format';

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
  { x: 42, y: -20, size: 5, color: '#f59e0b', delay: 60 },
  { x: -32, y: 22, size: 4, color: '#f59e0b', delay: 100 },
  { x: 36, y: 18, size: 6, color: '#91BE4D', delay: 40 },
  { x: 0, y: -36, size: 4, color: '#ec9937', delay: 80 },
];

/**
 * Post-save celebration: plain-language month totals (computed in the parent from fresh data).
 */
export default function SaveCelebrationModal({
  isOpen,
  onClose,
  kind = 'tournament',
  name = '',
  currency = 'INR',
  monthLabel = '',

  // Tournament (all tournaments with any day this month)
  tournamentSpendThisMonth = 0,
  tournamentPrizeThisMonth = 0,
  tournamentCountThisMonth = 0,

  // Casual + drills only, this month
  casualDrillSpendThisMonth = 0,
  casualDrillSessionCount = 0,

  newSessionRating = null,
  weaknesses = [],
  videoUrlBuilder = null,
}) {
  const [phase, setPhase] = useState(0);
  const symbol = getCurrencySymbol(currency);
  const spendFmt = formatCurrencyWhole(tournamentSpendThisMonth, currency);
  const prizeFmt = formatCurrencyWhole(tournamentPrizeThisMonth, currency);
  const practiceFmt = formatCurrencyWhole(casualDrillSpendThisMonth, currency);

  useEffect(() => {
    if (!isOpen) {
      setPhase(0);
      return;
    }
    const t1 = setTimeout(() => setPhase(1), 80);
    const t2 = setTimeout(() => setPhase(2), 520);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const bodyVisible = phase >= 2;

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
          <div
            className="h-1 w-full"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          />

          <div className="px-4 pt-4 pb-4">
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

            <p
              className="text-center text-[10px] font-bold uppercase tracking-widest mb-0.5"
              style={{ color: '#91BE4D', animation: bodyVisible ? 'labelFade 0.35s ease forwards' : 'none', opacity: bodyVisible ? 1 : 0 }}
            >
              {kind === 'session' ? 'Practice Logged!' : 'Tournament Saved!'}
            </p>
            <h2
              className="text-center text-[13px] font-bold text-gray-800 mb-3 px-1 leading-snug"
              style={{ animation: bodyVisible ? 'labelFade 0.35s 0.08s ease forwards' : 'none', opacity: bodyVisible ? 1 : 0 }}
            >
              {name}
            </h2>

            <div
              className="rounded-xl px-3 py-3 mb-3 text-left space-y-2.5 border border-gray-100 bg-gray-50/80"
              style={{
                animation: bodyVisible ? 'labelFade 0.4s 0.12s ease forwards' : 'none',
                opacity: bodyVisible ? 1 : 0,
              }}
            >
              {kind === 'tournament' ? (
                <>
                  <p className="text-sm text-gray-800 leading-snug">
                    You&apos;ve spent{' '}
                    <span className="font-black text-[#1c350a]">{spendFmt}</span>
                    {' '}on tournaments in{' '}
                    <span className="font-semibold text-gray-900">{monthLabel || 'this month'}</span>
                    {tournamentCountThisMonth > 0 && (
                      <>
                        {' '}
                        <span className="text-gray-500">
                          ({tournamentCountThisMonth === 1 ? '1 event' : `${tournamentCountThisMonth} events`} with play this month).
                        </span>
                      </>
                    )}
                  </p>
                  <p className="text-xs text-gray-600 leading-snug">
                    {tournamentPrizeThisMonth > 0 ? (
                      <>
                        Prize money recorded for those days this month:{' '}
                        <span className="font-bold text-green-700">{prizeFmt}</span>.
                      </>
                    ) : (
                      <>No prize money logged for category days in this month yet.</>
                    )}
                  </p>
                </>
              ) : (
                <p className="text-sm text-gray-800 leading-snug">
                  You&apos;ve spent{' '}
                  <span className="font-black text-[#1e293b]">{practiceFmt}</span>
                  {' '}on casual play and drills in{' '}
                  <span className="font-semibold text-gray-900">{monthLabel || 'this month'}</span>
                  {casualDrillSessionCount > 0 && (
                    <>
                      {' '}
                      <span className="text-gray-500">
                        ({casualDrillSessionCount === 1 ? '1 session' : `${casualDrillSessionCount} sessions`}).
                      </span>
                    </>
                  )}
                </p>
              )}
            </div>

            {kind === 'session' && newSessionRating != null && (
              <p
                className="text-center text-xs text-gray-600 mb-2"
                style={{ opacity: bodyVisible ? 1 : 0, transition: 'opacity 0.3s ease' }}
              >
                This session: <span className="font-bold">⭐ {newSessionRating}</span>
              </p>
            )}

            {kind === 'session' && weaknesses.length > 0 && videoUrlBuilder && (
              <div
                className="rounded-lg px-2.5 py-2 mb-2"
                style={{
                  background: '#f0f8e8',
                  border: '1px solid #d4e8b0',
                  opacity: bodyVisible ? 1 : 0,
                  transition: 'opacity 0.3s 0.1s ease',
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
              type="button"
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
