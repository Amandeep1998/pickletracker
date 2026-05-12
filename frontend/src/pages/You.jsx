import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell,
} from 'recharts';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import PaddleLoader from '../components/PaddleLoader';
import EditCommunityPlayerCardModal from '../components/EditCommunityPlayerCardModal';

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

// ─── Best Partners Card ───────────────────────────────────────────────────────

function BestPartnersCard({ bestPartners }) {
  const [copied, setCopied] = useState(false);

  const handleInvite = async () => {
    const url = 'https://pickletracker.in';
    const text = 'Track your pickleball journey — tournaments, medals, stats — on PickleTracker!';
    try {
      if (navigator.share) {
        await navigator.share({ title: 'PickleTracker', text, url });
      } else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      }
    } catch { /* user dismissed */ }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
      {bestPartners.length > 0 ? (
        <>
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Best partners</p>
          <div className="space-y-2 mb-4">
            {bestPartners.map((p) => (
              <div key={p.name} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white flex-shrink-0"
                  style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D)' }}
                >
                  {p.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-gray-900 truncate">{p.name}</p>
                  <p className="text-[10px] text-gray-400">{p.total} event{p.total !== 1 ? 's' : ''} together</p>
                </div>
                {p.medals > 0 && (
                  <span className="text-[10px] font-bold text-[#2d7005] bg-[#f4f8e8] px-2 py-0.5 rounded-full flex-shrink-0">
                    {p.medals} 🏅
                  </span>
                )}
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Partners</p>
      )}

      {/* Invite CTA */}
      <button
        type="button"
        onClick={handleInvite}
        className="w-full flex items-center gap-3 rounded-xl px-4 py-3 transition-opacity hover:opacity-90 active:opacity-80"
        style={{ background: 'linear-gradient(135deg, #f4f8e8, #e8f3cc)' }}
      >
        <div
          className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 text-lg"
          style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D)' }}
        >
          {copied ? '✓' : '📨'}
        </div>
        <div className="flex-1 text-left min-w-0">
          <p className="text-sm font-bold text-gray-900 leading-tight">
            {copied ? 'Link copied!' : 'Invite your partner or friend'}
          </p>
          <p className="text-[10px] text-[#2d7005] font-semibold mt-0.5 truncate">
            pickletracker.in
          </p>
        </div>
        <svg className="w-4 h-4 text-[#2d7005] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
        </svg>
      </button>
    </div>
  );
}

// ─── Progress Tab ─────────────────────────────────────────────────────────────

function ProgressTab({ tournaments, gamificationProgress, achievements, profile }) {
  const navigate = useNavigate();

  const thisWeekStart = useMemo(() => getWeekStart(new Date()), []);
  const currentYear = new Date().getFullYear();

  const manualAchievements = useMemo(() =>
    Array.isArray(profile?.manualAchievements) ? profile.manualAchievements : [],
    [profile]);

  // ── Streak
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

  // ── Win rate by year
  const winRateByYear = useMemo(() => {
    const byYear = {};
    tournaments.forEach((t) => {
      const ds = getTournamentDate(t);
      if (!ds) return;
      const yr = new Date(ds).getFullYear();
      if (!byYear[yr]) byYear[yr] = { total: 0, medals: 0 };
      t.categories.forEach((c) => {
        byYear[yr].total++;
        if (c.medal && c.medal !== 'None') byYear[yr].medals++;
      });
    });
    return Object.entries(byYear)
      .sort(([a], [b]) => Number(a) - Number(b))
      .map(([year, { total, medals }]) => ({
        year: String(year),
        winRate: total > 0 ? Math.round((medals / total) * 100) : 0,
        total,
        medals,
      }));
  }, [tournaments]);


  // ── Best partners
  const bestPartners = useMemo(() => {
    const map = {};
    tournaments.forEach((t) => {
      t.categories.forEach((c) => {
        if (!c.partnerName?.trim()) return;
        const name = c.partnerName.trim();
        if (!map[name]) map[name] = { total: 0, medals: 0 };
        map[name].total++;
        if (c.medal && c.medal !== 'None') map[name].medals++;
      });
    });
    return Object.entries(map)
      .map(([name, { total, medals }]) => ({ name, total, medals }))
      .sort((a, b) => b.medals - a.medals || b.total - a.total)
      .slice(0, 5);
  }, [tournaments]);

  // ── 12-week activity
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

  // ── Recent app achievements
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

  const MEDAL_EMOJI = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };
  const MEDAL_COLOR = { Gold: '#D97706', Silver: '#6B7280', Bronze: '#92400E' };

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

      {/* Best partners + invite */}
      <BestPartnersCard bestPartners={bestPartners} />

      {/* Win rate by year */}
      {winRateByYear.length > 1 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-4">Win rate by year</p>
          <ResponsiveContainer width="100%" height={96}>
            <BarChart data={winRateByYear} barSize={28} margin={{ top: 4, right: 0, left: -28, bottom: 0 }}>
              <XAxis
                dataKey="year"
                tick={{ fontSize: 10, fill: '#9ca3af' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis hide domain={[0, 100]} />
              <Tooltip
                contentStyle={{ borderRadius: 10, border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)', fontSize: 11 }}
                formatter={(val, _name, { payload }) => [`${val}% (${payload.medals}/${payload.total})`, 'Win rate']}
                labelStyle={{ fontWeight: 700 }}
              />
              <Bar dataKey="winRate" radius={[4, 4, 0, 0]}>
                {winRateByYear.map((entry, idx) => (
                  <Cell
                    key={idx}
                    fill={entry.year === String(currentYear) ? '#ec9937' : '#91BE4D'}
                    fillOpacity={entry.year === String(currentYear) ? 1 : 0.65}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-[9px] text-gray-400 text-right mt-1">Orange = {currentYear}</p>
        </div>
      )}

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

      {/* Past achievements — medals won before joining */}
      {manualAchievements.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
          <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Past tournament podiums</p>
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
        </div>
      )}

      {/* Recent app achievements */}
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
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getTournaments(),
      api.getGamificationProgress(),
      api.getAchievements(),
      api.getProfile(),
    ]).then(([tRes, progRes, achRes, profRes]) => {
      setTournaments(tRes.data.data || []);
      setGamificationProgress(progRes.data.data);
      const achData = achRes.data.data || {};
      const grouped = achData.achievements || {};
      setAchievements(Object.values(grouped).flat());
      setProfile(profRes.data.data);
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
            profile={profile}
          />
        ) : (
          <MyRecordTab user={user} refreshUser={refreshUser} />
        )}
      </div>
    </div>
  );
}
