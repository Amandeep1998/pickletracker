import { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSocket } from '../context/SocketContext';
import { markAchievementShared } from '../services/api';

// ─── Tier config ──────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  common:    { label: 'Common',    className: 'bg-gray-100 text-gray-600' },
  uncommon:  { label: 'Uncommon',  className: 'bg-blue-100 text-blue-700' },
  rare:      { label: 'Rare',      className: 'bg-yellow-100 text-yellow-700' },
  epic:      { label: 'Epic',      className: 'bg-purple-100 text-purple-700' },
  legendary: { label: 'Legendary', className: 'bg-gray-900 text-yellow-400' },
};

// ─── Confetti particle (tiny squares, CSS-only) ───────────────────────────────
const CONFETTI_PIECES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  color: ['#91BE4D', '#ec9937', '#2d7005', '#f5b85a', '#c8e875', '#ffffff'][i % 6],
  left: `${5 + (i * 5.5) % 90}%`,
  delay: `${(i * 80) % 600}ms`,
  size: 6 + (i % 3) * 2,
  duration: `${700 + (i % 4) * 200}ms`,
}));

// ─── Single achievement slide ─────────────────────────────────────────────────
function AchievementSlide({ achievement, index, total, onNext, onClose }) {
  const {
    icon = '🏅',
    name = 'Achievement',
    description = '',
    tier = 'common',
    xpReward = 0,
  } = achievement;

  const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.common;
  const isLegendary = tier === 'legendary';
  const isLast = index === total - 1;

  const handleShare = async () => {
    try {
      const id = achievement._id || achievement.id;
      if (id) await markAchievementShared(id).catch(() => {});

      if (navigator.share) {
        await navigator.share({
          title: `I unlocked: ${name}`,
          text: `Just earned the "${name}" achievement on PickleTracker! ${description}`,
        }).catch(() => {});
      }
    } catch {
      // fail silently
    }
  };

  return (
    <div className="relative flex flex-col items-center text-center px-6 pb-6 pt-8">
      {/* Confetti burst */}
      <div className="absolute inset-x-0 top-0 h-24 overflow-hidden pointer-events-none" aria-hidden="true">
        {CONFETTI_PIECES.map((p) => (
          <div
            key={p.id}
            className="absolute rounded-sm"
            style={{
              left: p.left,
              top: '-8px',
              width: p.size,
              height: p.size,
              backgroundColor: p.color,
              animationDelay: p.delay,
              animationDuration: p.duration,
              animation: `confetti-fall ${p.duration} ${p.delay} ease-out forwards`,
              opacity: 0,
            }}
          />
        ))}
      </div>

      {/* "Achievement Unlocked" label */}
      <div className="mb-4">
        <span
          className="text-[11px] font-black tracking-[0.2em] uppercase"
          style={{ color: '#91BE4D', fontFamily: "'Barlow Condensed', sans-serif" }}
        >
          Achievement Unlocked
        </span>
        {total > 1 && (
          <span className="ml-2 text-[10px] text-gray-400 font-semibold">
            {index + 1} of {total}
          </span>
        )}
      </div>

      {/* Icon bubble */}
      <div
        className="relative flex items-center justify-center rounded-3xl mb-5"
        style={{
          width: 96,
          height: 96,
          background: isLegendary
            ? 'linear-gradient(135deg, #1a1a1a, #2d2d2d)'
            : 'linear-gradient(135deg, #f4f8e8, #e8f3cc)',
          boxShadow: isLegendary
            ? '0 0 0 3px #ec9937, 0 8px 32px rgba(236,153,55,0.3)'
            : '0 4px 20px rgba(145,190,77,0.25)',
        }}
      >
        <span className="text-5xl select-none leading-none">{icon}</span>

        {/* Legendary glow ring */}
        {isLegendary && (
          <div
            className="absolute inset-0 rounded-3xl pointer-events-none"
            style={{
              background: 'linear-gradient(120deg, transparent 30%, rgba(251,191,36,0.15) 50%, transparent 70%)',
              backgroundSize: '200% 100%',
              animation: 'shimmer 2s linear infinite',
            }}
          />
        )}
      </div>

      {/* Name */}
      <h2
        className="font-black text-2xl text-gray-900 leading-tight mb-2"
        style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.02em' }}
      >
        {name}
      </h2>

      {/* Description */}
      <p className="text-sm text-gray-500 leading-relaxed mb-4 max-w-[240px]">
        {description}
      </p>

      {/* Badges row */}
      <div className="flex items-center gap-2 mb-6 flex-wrap justify-center">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${tierCfg.className}`}>
          {tierCfg.label}
        </span>
        {xpReward > 0 && (
          <span
            className="inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black text-white"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
          >
            +{xpReward} XP
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="w-full flex flex-col gap-2">
        <button
          type="button"
          onClick={isLast ? onClose : onNext}
          className="w-full py-3 rounded-xl font-bold text-sm text-white transition-opacity hover:opacity-90 active:scale-[0.98]"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 60%, #ec9937)' }}
        >
          {isLast ? 'Close' : `Next  (${index + 2} of ${total})`}
        </button>

        <button
          type="button"
          onClick={handleShare}
          className="w-full py-2.5 rounded-xl text-sm font-semibold text-[#2d7005] border border-[#91BE4D]/40 hover:bg-[#f4f8e8] transition-colors"
        >
          Share
        </button>
      </div>
    </div>
  );
}

// ─── Modal shell ──────────────────────────────────────────────────────────────
function Modal({ achievements, onClose }) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [animKey, setAnimKey] = useState(0);

  const handleNext = useCallback(() => {
    setCurrentIndex((i) => i + 1);
    setAnimKey((k) => k + 1);
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  // Prevent body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, []);

  const current = achievements[currentIndex];
  if (!current) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(4px)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      aria-modal="true"
      role="dialog"
      aria-label="Achievement unlocked"
    >
      {/* Card */}
      <div
        key={animKey}
        className="relative w-full max-w-sm bg-white rounded-3xl shadow-2xl overflow-hidden"
        style={{
          animation: 'achievement-slide-in 0.45s cubic-bezier(0.34,1.56,0.64,1) both',
        }}
      >
        {/* Progress dots for multiple achievements */}
        {achievements.length > 1 && (
          <div className="absolute top-4 left-0 right-0 flex justify-center gap-1.5 z-10">
            {achievements.map((_, i) => (
              <div
                key={i}
                className="h-1.5 rounded-full transition-all duration-300"
                style={{
                  width: i === currentIndex ? 20 : 6,
                  background: i <= currentIndex ? '#91BE4D' : '#e5e7eb',
                }}
              />
            ))}
          </div>
        )}

        {/* Close X */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 z-10 w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center transition-colors"
          aria-label="Close"
        >
          <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        <AchievementSlide
          achievement={current}
          index={currentIndex}
          total={achievements.length}
          onNext={handleNext}
          onClose={onClose}
        />
      </div>

      {/* Keyframes injected once */}
      <style>{`
        @keyframes achievement-slide-in {
          from { opacity: 0; transform: translateY(40px) scale(0.92); }
          to   { opacity: 1; transform: translateY(0)   scale(1); }
        }
        @keyframes confetti-fall {
          0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(80px) rotate(360deg); }
        }
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position:  200% 0; }
        }
      `}</style>
    </div>,
    document.body
  );
}

// ─── Self-contained wrapper — mounts globally, listens to socket ──────────────
export default function AchievementUnlockModal() {
  const socket = useSocket();
  const [queue, setQueue] = useState([]); // visible achievements
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!socket) return;

    const handler = ({ achievements }) => {
      if (!Array.isArray(achievements) || achievements.length === 0) return;
      setQueue(achievements);
      setVisible(true);
    };

    socket.on('achievements:unlocked', handler);
    return () => socket.off('achievements:unlocked', handler);
  }, [socket]);

  const handleClose = useCallback(() => {
    setVisible(false);
    setQueue([]);
  }, []);

  if (!visible || queue.length === 0) return null;

  return <Modal achievements={queue} onClose={handleClose} />;
}
