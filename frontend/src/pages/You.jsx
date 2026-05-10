import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import PaddleLoader from '../components/PaddleLoader';
import EditCommunityPlayerCardModal from '../components/EditCommunityPlayerCardModal';
import { getCurrencySymbol } from '../utils/format';
import useCurrency from '../hooks/useCurrency';

// ─── Helpers ──────────────────────────────────────────────────────────────────

const getTournamentDate = (t) => {
  if (!t?.categories?.length) return null;
  let earliest = null;
  for (const cat of t.categories) {
    if (!cat?.date) continue;
    const d = cat.date.split('T')[0];
    if (!earliest || d < earliest) earliest = d;
  }
  return earliest;
};

const getWeekStart = (date) => {
  const d = new Date(date);
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  d.setHours(0, 0, 0, 0);
  return d;
};

const fmtWeekLabel = (date) =>
  date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });


// ─── XP bar ───────────────────────────────────────────────────────────────────

function XPBar({ level, currentLevelXP, nextLevelXP, xp }) {
  const pct = nextLevelXP > currentLevelXP
    ? Math.min(100, Math.round(((xp - currentLevelXP) / (nextLevelXP - currentLevelXP)) * 100))
    : 100;
  return (
    <div className="mt-3 w-full">
      <div className="flex items-center justify-between mb-1">
        <span className="text-white/60 text-[10px] font-semibold">Lvl {level}</span>
        <span className="text-white/50 text-[10px]">{xp.toLocaleString()} / {nextLevelXP.toLocaleString()} XP</span>
        <span className="text-white/60 text-[10px] font-semibold">Lvl {level + 1}</span>
      </div>
      <div className="w-full h-2 rounded-full bg-white/20 overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: 'linear-gradient(to right, #91BE4D, #ec9937)' }}
        />
      </div>
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({ tournaments, gamificationProgress, achievements }) {
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);
  const navigate = useNavigate();

  const thisWeekStart = useMemo(() => getWeekStart(new Date()), []);
  const currentYear = new Date().getFullYear();

  const weeklyData = useMemo(() => {
    const weeks = [];
    for (let i = 11; i >= 0; i--) {
      const wStart = new Date(thisWeekStart);
      wStart.setDate(wStart.getDate() - i * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);
      weeks.push({ start: wStart, end: wEnd, label: fmtWeekLabel(wStart), count: 0 });
    }
    for (const t of tournaments) {
      const dateStr = getTournamentDate(t);
      if (!dateStr) continue;
      const d = new Date(dateStr);
      for (const w of weeks) {
        if (d >= w.start && d < w.end) { w.count++; break; }
      }
    }
    return weeks.map(({ label, count }) => ({ label, count }));
  }, [tournaments, thisWeekStart]);

  const thisYearTournaments = useMemo(() =>
    tournaments.filter((t) => {
      const ds = getTournamentDate(t);
      return ds && new Date(ds).getFullYear() === currentYear;
    }), [tournaments, currentYear]);

  const thisYearMedals = thisYearTournaments.reduce((acc, t) => {
    t.categories.forEach((c) => { if (c.medal && c.medal !== 'None') acc++; });
    return acc;
  }, 0);

  const thisYearEarnings = thisYearTournaments.reduce((acc, t) =>
    acc + t.categories.reduce((s, c) => s + (((c.prizeAmount || 0) - (c.entryFee || 0))), 0), 0);

  const totalCategories = useMemo(() =>
    tournaments.reduce((acc, t) => acc + t.categories.length, 0), [tournaments]);

  const totalMedalsCount = useMemo(() =>
    tournaments.reduce((acc, t) =>
      acc + t.categories.filter((c) => c.medal && c.medal !== 'None').length, 0),
    [tournaments]);

  const winRate = totalCategories > 0 ? Math.round((totalMedalsCount / totalCategories) * 100) : 0;

  const totalTournaments = tournaments.length;
  const totalEarnings = useMemo(() =>
    tournaments.reduce((acc, t) => acc + t.categories.reduce((s, c) => s + (((c.prizeAmount || 0) - (c.entryFee || 0))), 0), 0),
    [tournaments]);

  const avgEarnings = totalTournaments > 0 ? Math.round(totalEarnings / totalTournaments) : 0;

  const avgPerMonth = useMemo(() => {
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const recent = tournaments.filter((t) => {
      const ds = getTournamentDate(t);
      return ds && new Date(ds) >= sixMonthsAgo;
    });
    return (recent.length / 6).toFixed(1);
  }, [tournaments]);

  const streak = useMemo(() => {
    let s = 0;
    for (let i = 0; i < 52; i++) {
      const wStart = new Date(thisWeekStart);
      wStart.setDate(wStart.getDate() - i * 7);
      const wEnd = new Date(wStart);
      wEnd.setDate(wEnd.getDate() + 7);
      const hasActivity = tournaments.some((t) => {
        const ds = getTournamentDate(t);
        if (!ds) return false;
        const d = new Date(ds);
        return d >= wStart && d < wEnd;
      });
      if (hasActivity) s++;
      else break;
    }
    return s;
  }, [tournaments, thisWeekStart]);

  const recentAchievements = useMemo(() =>
    [...(achievements || [])]
      .filter((a) => a.unlocked)
      .sort((a, b) => new Date(b.unlockedAt) - new Date(a.unlockedAt))
      .slice(0, 4),
    [achievements]);

  const xp = gamificationProgress?.xp ?? 0;
  const level = gamificationProgress?.level ?? 1;
  const levelTitle = gamificationProgress?.levelTitle ?? '';
  const nextLevelXP = gamificationProgress?.nextLevelXP ?? 100;
  const currentLevelXP = gamificationProgress?.currentLevelXP ?? 0;
  const momentum = gamificationProgress?.momentum ?? 0;

  return (
    <div className="space-y-4">

      {/* Level hero */}
      <div
        className="rounded-2xl p-5 relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d7005 55%, #4a8a10 100%)' }}
      >
        <div className="absolute -right-10 -top-10 w-48 h-48 rounded-full border border-white/5 pointer-events-none" />
        <div className="absolute -right-4 -top-4 w-32 h-32 rounded-full border border-white/5 pointer-events-none" />
        <div className="relative flex items-center gap-4">
          <div
            className="flex-shrink-0 w-16 h-16 rounded-2xl flex flex-col items-center justify-center shadow-lg"
            style={{ background: 'linear-gradient(135deg, #ec9937, #f5b85a)' }}
          >
            <span className="text-white font-black text-2xl leading-none">{level}</span>
            <span className="text-white/70 text-[8px] font-bold uppercase tracking-widest">Level</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-white font-black text-lg leading-tight">{levelTitle || 'Pickleball Player'}</h2>
              {momentum >= 70
                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-200 text-[10px] font-semibold">🔥 High</span>
                : momentum >= 40
                ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-yellow-400/20 text-yellow-200 text-[10px] font-semibold">⚡ Building</span>
                : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-white/10 text-white/50 text-[10px] font-semibold">😴 Resting</span>
              }
            </div>
            <XPBar level={level} currentLevelXP={currentLevelXP} nextLevelXP={nextLevelXP} xp={xp} />
          </div>
        </div>
        <div className="relative mt-4 flex justify-end">
          <button
            type="button"
            onClick={() => navigate('/achievements')}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-xl bg-white/15 hover:bg-white/25 text-white transition-colors"
          >
            View All Rewards
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Career snapshot */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Career snapshot</p>
        <div className="grid grid-cols-2 gap-3">
          {[
            {
              label: 'Win Rate',
              value: `${winRate}%`,
              icon: '🎯',
              sub: `${totalMedalsCount} medals · ${totalCategories} events`,
            },
            {
              label: 'Tournaments',
              value: totalTournaments,
              icon: '🎾',
              sub: `${avgPerMonth}/month avg`,
            },
            {
              label: 'Net Earnings',
              value: `${totalEarnings >= 0 ? '+' : '-'}${symbol}${Math.abs(totalEarnings).toLocaleString()}`,
              icon: totalEarnings >= 0 ? '📈' : '📉',
              sub: 'all-time profit',
            },
            {
              label: 'Avg per Event',
              value: `${avgEarnings >= 0 ? '+' : '-'}${symbol}${Math.abs(avgEarnings).toLocaleString()}`,
              icon: '💰',
              sub: 'earnings per tournament',
            },
          ].map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-xl p-3">
              <div className="text-xl mb-1">{s.icon}</div>
              <div
                className="font-black text-xl text-gray-900 leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {s.value}
              </div>
              <div className="text-[10px] text-gray-500 font-semibold mt-0.5">{s.label}</div>
              <div className="text-[9px] text-gray-400 mt-0.5">{s.sub}</div>
            </div>
          ))}
        </div>
      </div>

      {/* This year */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">{currentYear} so far</p>
        <div className="grid grid-cols-3 gap-4">
          {[
            { label: 'Tournaments', value: thisYearTournaments.length, icon: '🎾' },
            { label: 'Medals', value: thisYearMedals, icon: '🏅' },
            {
              label: 'Earnings',
              value: `${thisYearEarnings >= 0 ? '+' : '-'}${symbol}${Math.abs(thisYearEarnings).toLocaleString()}`,
              icon: thisYearEarnings >= 0 ? '📈' : '📉',
            },
          ].map((s) => (
            <div key={s.label} className="text-center">
              <div className="text-2xl mb-1">{s.icon}</div>
              <div
                className="font-black text-xl text-gray-900 leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
              >
                {s.value}
              </div>
              <div className="text-[10px] text-gray-400 font-medium mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 12-week activity chart */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <div className="flex items-center justify-between mb-4">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">12-week activity</p>
          <span className="text-[10px] text-gray-400">Orange = this week</span>
        </div>
        <ResponsiveContainer width="100%" height={96}>
          <BarChart data={weeklyData} barSize={12} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
            <XAxis
              dataKey="label"
              tick={{ fontSize: 8, fill: '#9ca3af' }}
              tickLine={false}
              axisLine={false}
              interval={2}
            />
            <YAxis hide allowDecimals={false} />
            <Tooltip
              contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 11 }}
              formatter={(val) => [val, 'tournaments']}
              labelStyle={{ fontWeight: 700 }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]}>
              {weeklyData.map((_, idx) => (
                <Cell
                  key={idx}
                  fill={idx === 11 ? '#ec9937' : '#91BE4D'}
                  fillOpacity={idx === 11 ? 1 : 0.65}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Streak + avg per month */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl mb-1">🔥</div>
          <div
            className="font-black text-3xl text-gray-900 leading-none"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {streak}
          </div>
          <div className="text-[10px] text-gray-400 font-medium mt-1">Week streak</div>
        </div>
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 text-center">
          <div className="text-2xl mb-1">📅</div>
          <div
            className="font-black text-3xl text-gray-900 leading-none"
            style={{ fontFamily: "'Barlow Condensed', sans-serif" }}
          >
            {avgPerMonth}
          </div>
          <div className="text-[10px] text-gray-400 font-medium mt-1">Avg / month</div>
        </div>
      </div>

      {/* Recent achievements */}
      {recentAchievements.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <div className="flex items-center justify-between mb-3">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest">Recent achievements</p>
            <button
              type="button"
              onClick={() => navigate('/achievements')}
              className="text-[10px] font-bold text-[#2d7005] hover:text-[#4a8a10] transition-colors"
            >
              View all →
            </button>
          </div>
          <div className="space-y-3">
            {recentAchievements.map((ach) => (
              <div key={ach._id || ach.slug} className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-xl flex items-center justify-center text-xl flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #f4f8e8, #e8f3cc)' }}
                >
                  {ach.icon || '🏅'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-gray-900 truncate">{ach.name}</p>
                  <p className="text-[10px] text-gray-400 truncate">{ach.description}</p>
                </div>
                {ach.xpReward > 0 && (
                  <span className="text-[10px] font-bold text-[#2d7005] bg-[#f4f8e8] px-2 py-0.5 rounded-full flex-shrink-0">
                    +{ach.xpReward} XP
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── My Record Tab ────────────────────────────────────────────────────────────

function MyRecordTab({ user, refreshUser }) {
  const [loading, setLoading] = useState(true);
  const [tournaments, setTournaments] = useState([]);
  const [profile, setProfile] = useState(null);
  const [showEditModal, setShowEditModal] = useState(false);

  const loadData = useCallback(async () => {
    try {
      const [profRes, tRes] = await Promise.all([api.getProfile(), api.getTournaments()]);
      setProfile(profRes.data.data);
      setTournaments(tRes.data.data);
    } catch { /* silent */ } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const medalTally = useMemo(() => {
    const tally = { Gold: 0, Silver: 0, Bronze: 0 };
    tournaments.forEach((t) =>
      t.categories.forEach((c) => { if (tally[c.medal] !== undefined) tally[c.medal]++; })
    );
    ((profile?.manualAchievements) || []).forEach((a) => {
      if (tally[a.medal] !== undefined) tally[a.medal]++;
    });
    return tally;
  }, [tournaments, profile]);

  const totalMedals = medalTally.Gold + medalTally.Silver + medalTally.Bronze;
  const manualAchievements = Array.isArray(profile?.manualAchievements) ? profile.manualAchievements : [];

  const MEDAL_EMOJI = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };
  const MEDAL_COLOR = { Gold: '#D97706', Silver: '#6B7280', Bronze: '#92400E' };

  if (loading) return <div className="py-16"><PaddleLoader label="Loading your record…" /></div>;

  return (
    <div className="space-y-4">

      {/* All-time medal tally */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">All-time medals</p>
        <div className="flex items-center justify-around">
          {['Gold', 'Silver', 'Bronze'].map((m) => (
            <div key={m} className="text-center">
              <div className="text-4xl mb-1">{MEDAL_EMOJI[m]}</div>
              <div
                className="font-black text-3xl leading-none"
                style={{ fontFamily: "'Barlow Condensed', sans-serif", color: MEDAL_COLOR[m] }}
              >
                {medalTally[m]}
              </div>
              <div className="text-[10px] text-gray-400 mt-0.5">{m}</div>
            </div>
          ))}
        </div>
        {totalMedals > 0 && (
          <div className="mt-4 flex rounded-full overflow-hidden h-2 gap-0.5">
            {medalTally.Gold > 0 && <div className="h-full rounded-full" style={{ flex: medalTally.Gold, background: '#F59E0B' }} />}
            {medalTally.Silver > 0 && <div className="h-full rounded-full" style={{ flex: medalTally.Silver, background: '#9CA3AF' }} />}
            {medalTally.Bronze > 0 && <div className="h-full rounded-full" style={{ flex: medalTally.Bronze, background: '#B45309' }} />}
          </div>
        )}
      </div>

      {/* Won medals before joining — display + Update button */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
        <div className="mb-3">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-bold text-gray-900">Won medals before joining?</p>
            <button
              type="button"
              onClick={() => setShowEditModal(true)}
              className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-xl text-white hover:opacity-95 transition-opacity shadow-sm whitespace-nowrap flex-shrink-0"
              style={{ background: 'linear-gradient(to right, #1e3a5f, #2563ab)' }}
            >
              <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
              Update
            </button>
          </div>
          <p className="text-xs text-gray-400 mt-0.5">Past tournament podiums added to your all-time record</p>
        </div>

        {manualAchievements.length === 0 ? (
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="w-full border-2 border-dashed border-gray-200 rounded-xl py-6 text-sm text-gray-400 hover:border-[#91BE4D]/40 hover:text-[#4a6e10] transition-colors flex flex-col items-center gap-1"
          >
            <span className="text-2xl">🏆</span>
            Add a past tournament podium
          </button>
        ) : (
          <div className="space-y-2">
            {manualAchievements.map((a, idx) => (
              <div key={idx} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <span className="text-xl flex-shrink-0">{MEDAL_EMOJI[a.medal] || '🏅'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{a.tournamentName || '—'}</p>
                  {a.categoryName && (
                    <p className="text-[11px] text-gray-400 truncate">{a.categoryName}</p>
                  )}
                </div>
                {a.date && (
                  <span className="text-[11px] text-gray-400 flex-shrink-0">
                    {new Date(a.date).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Player card section */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-5">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-sm font-bold text-gray-900">Your player card</p>
            <p className="text-xs text-gray-400 mt-0.5">DUPR ratings, photo, playing since</p>
          </div>
          <button
            type="button"
            onClick={() => setShowEditModal(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3 rounded-xl text-white hover:opacity-95 transition-opacity shadow-sm whitespace-nowrap flex-shrink-0"
            style={{ background: 'linear-gradient(to right, #1e3a5f, #2563ab)' }}
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Update
          </button>
        </div>
        {(profile?.duprSingles || profile?.duprDoubles || profile?.playingSince) && (
          <div className="mt-3 flex flex-wrap gap-2">
            {profile.duprSingles && (
              <span className="text-xs bg-[#f4f8e8] text-[#4a6e10] font-semibold px-2.5 py-1 rounded-full">
                Singles {profile.duprSingles}
              </span>
            )}
            {profile.duprDoubles && (
              <span className="text-xs bg-[#f4f8e8] text-[#4a6e10] font-semibold px-2.5 py-1 rounded-full">
                Doubles {profile.duprDoubles}
              </span>
            )}
            {profile.playingSince && (
              <span className="text-xs bg-gray-100 text-gray-500 font-semibold px-2.5 py-1 rounded-full">
                Since {profile.playingSince}
              </span>
            )}
          </div>
        )}
      </div>

      {showEditModal && (
        <EditCommunityPlayerCardModal
          onClose={() => setShowEditModal(false)}
          onSaved={async () => {
            try {
              const res = await api.getProfile();
              setProfile(res.data.data);
              refreshUser(res.data.data);
            } catch { /* silent */ }
          }}
        />
      )}
    </div>
  );
}

// ─── Main You page ────────────────────────────────────────────────────────────

export default function You() {
  const { user, refreshUser } = useAuth();
  const [activeTab, setActiveTab] = useState('record');

  const [tournaments, setTournaments] = useState([]);
  const [gamificationProgress, setGamificationProgress] = useState(null);
  const [achievements, setAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getTournaments(),
      api.getGamificationProgress(),
      api.getAchievements(),
    ]).then(([tRes, progRes, achRes]) => {
      setTournaments(tRes.data.data || []);
      setGamificationProgress(progRes.data.data);
      const achData = achRes.data.data || {};
      const grouped = achData.achievements || {};
      setAchievements(Object.values(grouped).flat());
    }).catch(() => {}).finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen bg-[#F3F8F9]">
      <div className="max-w-2xl mx-auto px-4 pb-28 pt-4">

        {/* Tab switcher */}
        <div className="flex gap-1 bg-white rounded-xl p-1 border border-gray-100 shadow-sm mb-4">
          {[
            { id: 'record', label: 'My Record', icon: '🏅' },
            { id: 'progress', label: 'Progress', icon: '📊' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-lg text-sm font-bold transition-all ${
                activeTab === tab.id ? 'text-white shadow-sm' : 'text-gray-500 hover:text-gray-700'
              }`}
              style={activeTab === tab.id
                ? { background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }
                : {}}
            >
              <span>{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab content */}
        {loading ? (
          <div className="py-16"><PaddleLoader label="Loading your stats…" /></div>
        ) : activeTab === 'progress' ? (
          <ProgressTab
            tournaments={tournaments}
            gamificationProgress={gamificationProgress}
            achievements={achievements}
          />
        ) : (
          <MyRecordTab user={user} refreshUser={refreshUser} />
        )}
      </div>
    </div>
  );
}
