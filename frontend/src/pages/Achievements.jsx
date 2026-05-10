import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  getGamificationProgress,
  getAchievements,
  triggerAchievementCheck,
} from '../services/api';
import PaddleLoader from '../components/PaddleLoader';
// ─── Tier config ──────────────────────────────────────────────────────────────
const TIER_CONFIG = {
  common:    { label: 'Common',    className: 'bg-gray-100 text-gray-600' },
  uncommon:  { label: 'Uncommon',  className: 'bg-blue-100 text-blue-700' },
  rare:      { label: 'Rare',      className: 'bg-yellow-100 text-yellow-700' },
  epic:      { label: 'Epic',      className: 'bg-purple-100 text-purple-700' },
  legendary: { label: 'Legendary', className: 'bg-gray-900 text-yellow-400' },
};

// ─── Category filter pills ────────────────────────────────────────────────────
const CATEGORIES = [
  'All', 'Beginner', 'Consistency', 'Tournament', 'Wins',
  'Medals', 'Earnings', 'Gear', 'Travel', 'Weekend', 'Elite', 'Hidden',
];

const FILTER_TABS = ['All', 'Unlocked', 'Locked'];

// ─── Momentum badge ───────────────────────────────────────────────────────────
function MomentumBadge({ momentum }) {
  if (momentum >= 70) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-orange-500/20 text-orange-200 text-xs font-semibold">
        🔥 High
      </span>
    );
  }
  if (momentum >= 40) {
    return (
      <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-yellow-400/20 text-yellow-200 text-xs font-semibold">
        ⚡ Building
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-white/10 text-white/60 text-xs font-semibold">
      😴 Resting
    </span>
  );
}

// ─── XP progress bar ─────────────────────────────────────────────────────────
function XPBar({ level, currentLevelXP, nextLevelXP, xp }) {
  const pct = nextLevelXP > 0 ? Math.min(100, Math.round(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100)) : 100;

  return (
    <div className="mt-4 w-full">
      <div className="flex items-center justify-between mb-1.5">
        <span className="text-white/70 text-xs font-semibold">Lvl {level}</span>
        <span className="text-white/60 text-[11px]">{xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP</span>
        <span className="text-white/70 text-xs font-semibold">Lvl {level + 1}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{
            width: `${pct}%`,
            background: 'linear-gradient(to right, #91BE4D, #ec9937)',
          }}
        />
      </div>
    </div>
  );
}

// ─── Skeleton card ────────────────────────────────────────────────────────────
function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 p-4 animate-pulse">
      <div className="flex items-start gap-3">
        <div className="w-12 h-12 rounded-xl bg-gray-200 flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
          <div className="h-3 bg-gray-100 rounded w-full mb-1" />
          <div className="h-3 bg-gray-100 rounded w-2/3" />
        </div>
      </div>
      <div className="mt-3 flex items-center gap-2">
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
        <div className="h-5 w-20 bg-gray-100 rounded-full ml-auto" />
      </div>
    </div>
  );
}

// ─── Achievement card ─────────────────────────────────────────────────────────
function AchievementCard({ achievement }) {
  const {
    name,
    description,
    icon,
    tier = 'common',
    unlocked,
    unlockedAt,
    xpReward,
    hidden,
  } = achievement;

  const isHiddenLocked = hidden && !unlocked;
  const tierCfg = TIER_CONFIG[tier] || TIER_CONFIG.common;

  const displayName = isHiddenLocked ? 'Mystery Achievement' : name;
  const displayIcon = isHiddenLocked ? '???' : (icon || '🏅');
  const displayDesc = isHiddenLocked ? 'Keep playing to reveal this achievement.' : description;

  const cardBase = unlocked
    ? 'bg-white border-gray-100'
    : 'bg-gray-50/80 border-gray-100/60';

  const formattedDate = unlockedAt
    ? new Date(unlockedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })
    : null;

  return (
    <div
      className={`relative rounded-2xl border p-4 transition-all duration-200 ${cardBase} ${
        unlocked ? 'shadow-sm hover:shadow-md' : 'opacity-70'
      }`}
    >
      {/* Legendary shimmer ring */}
      {tier === 'legendary' && unlocked && (
        <div
          className="absolute inset-0 rounded-2xl pointer-events-none"
          style={{
            background:
              'linear-gradient(120deg, transparent 30%, rgba(251,191,36,0.08) 50%, transparent 70%)',
            backgroundSize: '200% 100%',
            animation: 'shimmer 2.5s linear infinite',
          }}
        />
      )}

      <div className="flex items-start gap-3">
        {/* Icon bubble */}
        <div
          className={`w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0 ${
            unlocked
              ? tier === 'legendary'
                ? 'bg-gray-900'
                : 'bg-gradient-to-br from-[#f4f8e8] to-[#e8f3cc]'
              : 'bg-gray-100'
          }`}
        >
          {isHiddenLocked ? (
            <span className="text-gray-400 font-black text-lg select-none">???</span>
          ) : (
            <span className="select-none">{displayIcon}</span>
          )}
        </div>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 flex-wrap">
            <h3
              className={`font-bold text-sm leading-tight truncate ${
                unlocked ? 'text-gray-900' : 'text-gray-400'
              }`}
            >
              {displayName}
            </h3>
            {/* Lock icon */}
            {!unlocked && (
              <svg className="w-3.5 h-3.5 text-gray-300 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fillRule="evenodd"
                  d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
                  clipRule="evenodd"
                />
              </svg>
            )}
          </div>
          <p className={`text-xs mt-0.5 leading-relaxed line-clamp-2 ${unlocked ? 'text-gray-500' : 'text-gray-400'}`}>
            {displayDesc}
          </p>
        </div>
      </div>

      {/* Footer row */}
      <div className="mt-3 flex items-center justify-between flex-wrap gap-1.5">
        {/* Tier badge */}
        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${tierCfg.className}`}>
          {tierCfg.label}
        </span>

        <div className="flex items-center gap-1.5">
          {/* XP pill */}
          {xpReward > 0 && (
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold ${
                unlocked
                  ? 'bg-[#91BE4D]/15 text-[#2d7005]'
                  : 'bg-gray-100 text-gray-400'
              }`}
            >
              +{xpReward} XP
            </span>
          )}
          {/* Unlock date */}
          {formattedDate && (
            <span className="text-[10px] text-gray-400 font-medium">{formattedDate}</span>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function Achievements() {
  useAuth(); // ensure user session is available

  const [progress, setProgress] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [filterTab, setFilterTab] = useState('All');
  const [categoryFilter, setCategoryFilter] = useState('All');

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const [progRes, achRes] = await Promise.all([
        getGamificationProgress(),
        getAchievements(),
      ]);
      setProgress(progRes.data);
      setAchievements(achRes.data.achievements || []);
      setUnlockedCount(achRes.data.unlockedCount || 0);
      setTotalCount(achRes.data.totalCount || 0);
    } catch {
      setError('Failed to load achievements. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      await triggerAchievementCheck().catch(() => {});
      load();
    };
    init();
  }, [load]);

  // ── Filtering ──
  const filtered = achievements.filter((a) => {
    const tabOk =
      filterTab === 'All' ||
      (filterTab === 'Unlocked' && a.unlocked) ||
      (filterTab === 'Locked' && !a.unlocked);

    const catOk =
      categoryFilter === 'All' ||
      (a.category || '').toLowerCase() === categoryFilter.toLowerCase();

    return tabOk && catOk;
  });

  const xp = progress?.xp ?? 0;
  const level = progress?.level ?? 1;
  const levelTitle = progress?.levelTitle ?? '';
  const nextLevelXP = progress?.nextLevelXP ?? 100;
  const currentLevelXP = progress?.currentLevelXP ?? 0;
  const momentum = progress?.momentum ?? 0;

  return (
    <div className="min-h-screen bg-[#F3F8F9]">

      <div className="max-w-3xl mx-auto px-4 pt-4 pb-24">
        {/* ── Header card ── */}
        <div
          className="rounded-2xl p-5 sm:p-6 mb-5 relative overflow-hidden"
          style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d7005 55%, #4a8a10 100%)' }}
        >
          {/* Decorative rings */}
          <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full border border-white/5 pointer-events-none" />
          <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full border border-white/5 pointer-events-none" />

          <div className="relative flex items-start gap-4">
            {/* Level badge */}
            <div
              className="flex-shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl flex flex-col items-center justify-center shadow-lg"
              style={{ background: 'linear-gradient(135deg, #ec9937, #f5b85a)' }}
            >
              <span className="text-white font-black text-2xl sm:text-3xl leading-none" style={{ fontFamily: "'Barlow Condensed', sans-serif" }}>
                {level}
              </span>
              <span className="text-white/80 text-[9px] font-bold uppercase tracking-widest">Level</span>
            </div>

            {/* Level info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1
                  className="text-white font-black text-xl sm:text-2xl leading-tight"
                  style={{ fontFamily: "'Barlow Condensed', sans-serif", letterSpacing: '0.02em' }}
                >
                  {levelTitle || 'Pickleball Player'}
                </h1>
                <MomentumBadge momentum={momentum} />
              </div>

              <XPBar
                level={level}
                currentLevelXP={currentLevelXP}
                nextLevelXP={nextLevelXP}
                xp={xp}
              />
            </div>
          </div>
        </div>

        {/* ── Stats chips ── */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: 'Unlocked', value: unlockedCount },
            { label: 'Total', value: totalCount },
            { label: 'XP Earned', value: xp.toLocaleString() },
          ].map((stat) => (
            <div key={stat.label} className="bg-white rounded-xl border border-gray-100 p-3 text-center shadow-sm">
              <div
                className="font-black text-xl leading-tight"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", color: '#2d7005' }}
              >
                {stat.value}
              </div>
              <div className="text-[11px] text-gray-500 font-medium mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>

        {/* ── Filter tabs ── */}
        <div className="flex gap-2 mb-3">
          {FILTER_TABS.map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setFilterTab(tab)}
              className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-all ${
                filterTab === tab
                  ? 'text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-[#91BE4D] hover:text-[#2d7005]'
              }`}
              style={filterTab === tab ? { background: 'linear-gradient(to right, #2d7005, #91BE4D)' } : {}}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* ── Category pills (horizontal scroll) ── */}
        <div className="flex gap-2 overflow-x-auto pb-2 mb-5 [scrollbar-width:none] [-webkit-overflow-scrolling:touch]">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setCategoryFilter(cat)}
              className={`flex-shrink-0 px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                categoryFilter === cat
                  ? 'text-white shadow-sm'
                  : 'bg-white text-gray-500 border border-gray-200 hover:border-[#91BE4D] hover:text-[#2d7005]'
              }`}
              style={categoryFilter === cat ? { background: '#91BE4D' } : {}}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* ── Content ── */}
        {loading ? (
          <div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
            <div className="flex justify-center mt-8">
              <PaddleLoader label="Loading achievements..." />
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-gray-500 font-medium">{error}</p>
            <button
              type="button"
              onClick={load}
              className="mt-4 px-5 py-2 rounded-full text-sm font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
            >
              Try again
            </button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 rounded-2xl bg-gray-100 flex items-center justify-center mx-auto mb-4">
              <svg className="w-8 h-8 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <p className="text-gray-500 font-semibold">No achievements found</p>
            <p className="text-gray-400 text-sm mt-1">Try adjusting your filters.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filtered.map((ach) => (
              <AchievementCard key={ach._id || ach.id || ach.slug} achievement={ach} />
            ))}
          </div>
        )}
      </div>

      {/* Shimmer keyframe for legendary cards */}
      <style>{`
        @keyframes shimmer {
          0%   { background-position: -200% 0; }
          100% { background-position: 200% 0; }
        }
      `}</style>
    </div>
  );
}
