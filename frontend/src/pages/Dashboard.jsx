import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import * as api from '../services/api';
import { formatINR } from '../utils/format';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// Helper: earliest category date for sorting/filtering
const getTournamentDate = (tournament) => {
  if (!tournament?.categories || tournament.categories.length === 0) return null;
  const dates = tournament.categories.map((cat) => cat.date).filter(Boolean);
  if (dates.length === 0) return null;
  return dates.sort()[0];
};

export default function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [tournaments, setTournaments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [recentSessions, setRecentSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error, setError] = useState('');
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState('');
  const [includeTournaments, setIncludeTournaments] = useState(true);
  const [includeCourtFees, setIncludeCourtFees] = useState(true);
  const [includeGear, setIncludeGear] = useState(false);

  // Profile nudge — hidden if user already has phone+city, or if dismissed this session
  const nudgeKey = `profileNudgeDismissed_${user?.id}`;
  const [nudgeDismissed, setNudgeDismissed] = useState(
    () => sessionStorage.getItem(nudgeKey) === '1'
  );
  const profileIncomplete = !user?.city || !user?.state;
  const showNudge = profileIncomplete && !nudgeDismissed;
  const dismissNudge = useCallback(() => {
    sessionStorage.setItem(nudgeKey, '1');
    setNudgeDismissed(true);
  }, [nudgeKey]);

  useEffect(() => {
    // After 4 s still loading → server is cold-starting; show a friendlier message
    const slowTimer = setTimeout(() => setSlowLoad(true), 4000);

    Promise.all([api.getTournaments(), api.getExpenses(), api.getSessions()])
      .then(([tRes, eRes, sRes]) => {
        setTournaments(tRes.data.data);
        setExpenses(eRes.data.data);
        setAllSessions(sRes.data.data);
        setRecentSessions(sRes.data.data.slice(0, 3));
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => {
        clearTimeout(slowTimer);
        setLoading(false);
        setSlowLoad(false);
      });

    return () => clearTimeout(slowTimer);
  }, []);

  // Next upcoming tournament (across all years, nearest future date)
  const nextTournament = useMemo(() => {
    const todayStr = new Date().toISOString().split('T')[0];
    let nearest = null;

    for (const t of tournaments) {
      for (const cat of t.categories) {
        if (!cat.date) continue;
        const dateStr = cat.date.split('T')[0];
        if (dateStr >= todayStr) {
          if (!nearest || dateStr < nearest.dateStr) {
            nearest = { tournament: t, cat, dateStr };
          }
        }
      }
    }

    if (!nearest) return null;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const eventDate = new Date(nearest.dateStr + 'T00:00:00');
    const diffDays = Math.round((eventDate - today) / (1000 * 60 * 60 * 24));

    return { ...nearest, diffDays };
  }, [tournaments]);

  // Tournaments in the selected year+month window
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const dateStr = getTournamentDate(t);
      if (!dateStr) return false;
      const [year, month] = dateStr.split('-');
      if (filterYear && year !== filterYear) return false;
      if (filterMonth !== '' && String(Number(month) - 1) !== filterMonth) return false;
      return true;
    });
  }, [tournaments, filterYear, filterMonth]);

  // Gear expenses in the selected year+month window
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const [year, month] = e.date.split('-');
      if (filterYear && year !== filterYear) return false;
      if (filterMonth !== '' && String(Number(month) - 1) !== filterMonth) return false;
      return true;
    });
  }, [expenses, filterYear, filterMonth]);

  // Sessions in the selected year+month window
  const filteredSessions = useMemo(() => {
    return allSessions.filter((s) => {
      const [year, month] = s.date.split('-');
      if (filterYear && year !== filterYear) return false;
      if (filterMonth !== '' && String(Number(month) - 1) !== filterMonth) return false;
      return true;
    });
  }, [allSessions, filterYear, filterMonth]);

  // Stat card totals
  const totals = useMemo(() => {
    const earnings = includeTournaments
      ? filteredTournaments.reduce((s, t) => s + (t.totalEarnings || 0), 0)
      : 0;
    const tournamentExpenses = includeTournaments
      ? filteredTournaments.reduce((s, t) => s + (t.totalExpenses || 0), 0)
      : 0;
    const courtFeesTotal = includeCourtFees
      ? filteredSessions.reduce((s, x) => s + (x.courtFee || 0), 0)
      : 0;
    const gearTotal = filteredExpenses
      .filter((e) => e.type === 'gear')
      .reduce((s, e) => s + e.amount, 0);

    const totalExpenses = tournamentExpenses + courtFeesTotal + (includeGear ? gearTotal : 0);

    return {
      earnings,
      totalExpenses,
      profit: earnings - totalExpenses,
      count: filteredTournaments.length,
    };
  }, [filteredTournaments, filteredExpenses, filteredSessions, includeTournaments, includeCourtFees, includeGear]);

  // Monthly chart data for the selected year
  const chartData = useMemo(() => {
    const yearTournaments = tournaments.filter((t) =>
      getTournamentDate(t)?.startsWith(filterYear)
    );
    const yearExpenses = expenses.filter((e) => e.date?.startsWith(filterYear));
    const yearSessions = allSessions.filter((s) => s.date?.startsWith(filterYear));

    return MONTHS.map((month, idx) => {
      const monthStr = String(idx + 1).padStart(2, '0');

      const monthTournaments = yearTournaments.filter((t) => {
        const date = getTournamentDate(t);
        return date && date.split('-')[1] === monthStr;
      });
      const monthExpenses = yearExpenses.filter((e) => e.date.split('-')[1] === monthStr);
      const monthSessions = yearSessions.filter((s) => s.date.split('-')[1] === monthStr);

      const tournamentExp = includeTournaments
        ? monthTournaments.reduce((s, t) => s + (t.totalExpenses || 0), 0)
        : 0;
      const courtFees = includeCourtFees
        ? monthSessions.reduce((s, x) => s + (x.courtFee || 0), 0)
        : 0;
      const gear = includeGear
        ? monthExpenses.filter((e) => e.type === 'gear').reduce((s, e) => s + e.amount, 0)
        : 0;

      const totalExp = tournamentExp + courtFees + gear;
      const earnings = includeTournaments
        ? monthTournaments.reduce((s, t) => s + (t.totalEarnings || 0), 0)
        : 0;

      return {
        month,
        Expenses: +totalExp.toFixed(2),
        Profit: +(earnings - totalExp).toFixed(2),
      };
    });
  }, [tournaments, expenses, allSessions, filterYear, includeTournaments, includeCourtFees, includeGear]);

  // Per-category profit breakdown — uses filteredTournaments so year/month filter applies
  const categoryBreakdown = useMemo(() => {
    const map = {};

    for (const t of filteredTournaments) {
      for (const cat of t.categories) {
        if (!cat.categoryName) continue;
        if (!map[cat.categoryName]) {
          map[cat.categoryName] = { entries: 0, earnings: 0, expenses: 0 };
        }
        const row = map[cat.categoryName];
        row.entries += 1;
        row.earnings += cat.prizeAmount || 0;
        row.expenses += cat.entryFee || 0;
      }
    }

    return Object.entries(map)
      .map(([name, data]) => ({
        name,
        entries: data.entries,
        earnings: data.earnings,
        expenses: data.expenses,
        profit: data.earnings - data.expenses,
      }))
      .sort((a, b) => b.profit - a.profit);
  }, [filteredTournaments]);

  // Playing streak — consecutive days with at least one session (ending today or yesterday)
  const streak = useMemo(() => {
    if (allSessions.length === 0) return 0;
    const uniqueDates = [...new Set(allSessions.map((s) => s.date))].sort().reverse();
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    let count = 0;
    for (let i = 0; i < uniqueDates.length; i++) {
      const expected = new Date(today);
      expected.setDate(today.getDate() - i);
      const expectedStr = expected.toISOString().split('T')[0];
      if (uniqueDates[i] === expectedStr) {
        count++;
      } else {
        break;
      }
    }
    return count;
  }, [allSessions]);

  // This-week session count + avg rating
  const weekStats = useMemo(() => {
    const now = new Date();
    const startOfWeek = new Date(now);
    startOfWeek.setDate(now.getDate() - now.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startStr = startOfWeek.toISOString().split('T')[0];
    const week = allSessions.filter((s) => s.date >= startStr);
    const avg = week.length > 0
      ? (week.reduce((s, x) => s + (x.rating || 0), 0) / week.length).toFixed(1)
      : null;
    return { count: week.length, avg };
  }, [allSessions]);

  // Most-recurring weakness across all sessions
  const focusArea = useMemo(() => {
    const freq = {};
    allSessions.forEach((s) => {
      (s.wentWrong || []).forEach((tag) => { freq[tag] = (freq[tag] || 0) + 1; });
    });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  }, [allSessions]);

  // Greeting based on time of day
  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();
  const firstName = user?.name?.split(' ')[0] || 'Player';

  const statCards = [
    {
      label: 'Total Earnings',
      value: formatINR(totals.earnings),
      gradient: 'from-[#91BE4D] to-[#6a9020]',
      icon: '🏆',
    },
    {
      label: 'Total Expenses',
      value: formatINR(totals.totalExpenses),
      gradient: 'from-[#ec9937] to-[#c07010]',
      icon: '💸',
    },
    {
      label: 'Net Profit',
      value: formatINR(totals.profit),
      gradient: totals.profit >= 0 ? 'from-blue-500 to-indigo-600' : 'from-rose-600 to-red-700',
      icon: '📊',
    },
    {
      label: 'Tournaments',
      value: totals.count,
      gradient: 'from-[#1c350a] to-[#2a5010]',
      icon: '🎾',
    },
  ];

  if (loading) {
    return (
      <div className="text-center py-24 px-4">
        <div className="inline-flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-green-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          {!slowLoad ? (
            <p className="text-gray-400 text-sm">Loading dashboard...</p>
          ) : (
            <div className="text-center">
              <p className="text-gray-600 text-sm font-medium">Server is waking up...</p>
              <p className="text-gray-400 text-xs mt-1">
                This takes up to 30 seconds on first load. Hang tight!
              </p>
            </div>
          )}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="text-center py-24 text-red-500">{error}</div>;
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Hero Banner */}
      <div className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-4 overflow-hidden relative" style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}>
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        <div className="relative flex items-center justify-between">
          <div>
            <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-1">PickleTracker</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">{greeting}, {firstName}!</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              {streak > 0 ? `🔥 ${streak}-day streak · ` : ''}
              {weekStats.count > 0 ? `${weekStats.count} session${weekStats.count !== 1 ? 's' : ''} this week` : 'No sessions yet this week'}
              {weekStats.avg ? ` · avg ${weekStats.avg}/5` : ''}
            </p>
          </div>
          <div className="relative select-none opacity-90 flex-shrink-0">
            <svg width="60" height="60" viewBox="0 0 80 80" fill="none" aria-hidden="true">
              <circle cx="40" cy="40" r="36" fill="#C8D636" />
              <circle cx="40" cy="40" r="36" fill="white" opacity="0.12" />
              {[[28,22],[40,18],[52,22],[20,32],[32,30],[44,30],[56,32],[24,42],[36,40],[44,40],[56,42],[28,52],[40,56],[52,52],[40,40]].map(([cx,cy],i)=>(
                <circle key={i} cx={cx} cy={cy} r="2.8" fill="#272702" opacity="0.3"/>
              ))}
            </svg>
          </div>
        </div>
      </div>

      {/* Profile completion nudge */}
      {showNudge && (
        <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 rounded-xl px-4 py-3 mb-4 flex items-start gap-3">
          <span className="text-lg flex-shrink-0 mt-0.5">✨</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#272702]">Make PickleTracker work harder for you</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Add your city and state to personalise your profile and appear in the community player directory.
            </p>
            <NavLink
              to="/profile"
              className="inline-block mt-2 text-xs font-bold text-[#4a6e10] hover:underline"
            >
              Complete my profile →
            </NavLink>
          </div>
          <button
            onClick={dismissNudge}
            className="flex-shrink-0 text-gray-400 hover:text-gray-600 p-1 rounded transition-colors"
            aria-label="Dismiss"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        <button
          onClick={() => navigate('/sessions')}
          className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 border-[#91BE4D]/30 bg-[#91BE4D]/5 hover:bg-[#91BE4D]/10 transition-colors text-center"
        >
          <span className="text-xl">🎯</span>
          <span className="text-xs font-bold text-[#4a6e10] leading-tight">Log Session</span>
        </button>
        <button
          onClick={() => navigate('/tournaments')}
          className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 border-[#ec9937]/30 bg-[#ec9937]/5 hover:bg-[#ec9937]/10 transition-colors text-center"
        >
          <span className="text-xl">🏆</span>
          <span className="text-xs font-bold text-orange-700 leading-tight">Tournament</span>
        </button>
        <button
          onClick={() => navigate('/expenses')}
          className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 border-gray-200 bg-gray-50 hover:bg-gray-100 transition-colors text-center"
        >
          <span className="text-xl">🎒</span>
          <span className="text-xs font-bold text-gray-600 leading-tight">Add Gear</span>
        </button>
      </div>

      {/* Performance Snapshot */}
      {allSessions.length > 0 && (
        <div className="grid grid-cols-3 gap-2 mb-4">
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-3 text-center">
            <p className="text-2xl font-black" style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {streak}
            </p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Day Streak</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-3 text-center">
            <p className="text-2xl font-black" style={{ background: 'linear-gradient(to right, #2d7005, #ec9937)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
              {weekStats.avg ?? '—'}
            </p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Week Avg</p>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-3 py-3 text-center">
            <p className="text-xs font-bold text-orange-600 leading-tight truncate" title={focusArea || 'None'}>
              {focusArea ? focusArea.split(' ').slice(0, 2).join(' ') : '—'}
            </p>
            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wide mt-0.5">Focus Area</p>
          </div>
        </div>
      )}

      {/* Recent Sessions Widget */}
      <div className="bg-white rounded-2xl border border-gray-100 shadow-md px-4 py-4 mb-6">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <span className="text-base">📓</span>
            <p className="text-sm font-bold text-gray-800">Performance Journal</p>
          </div>
          <NavLink to="/sessions" className="text-xs font-semibold text-[#4a6e10] hover:underline">
            View all →
          </NavLink>
        </div>
        {recentSessions.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-xs text-gray-400 mb-2">No sessions logged yet</p>
            <NavLink
              to="/sessions"
              className="inline-block text-xs font-bold px-4 py-1.5 rounded-lg hover:opacity-90 text-white transition-opacity"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
            >
              Log your first session
            </NavLink>
          </div>
        ) : (
          <div className="space-y-2">
            {recentSessions.map((s) => {
              const EMOJI = { 1: '😫', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' };
              const TYPE_ICON = { tournament: '🏆', casual: '🏸', practice: '🎯' };
              const TYPE_LABEL = { tournament: 'Tournament', casual: 'Casual', practice: 'Practice' };
              const [y, m, d] = s.date.split('-');
              const dateLabel = new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
              return (
                <div key={s._id} className="flex items-center justify-between py-1.5 border-b border-gray-50 last:border-0">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-sm">{TYPE_ICON[s.type]}</span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-gray-700">{TYPE_LABEL[s.type]}</p>
                      <p className="text-[10px] text-gray-400">{dateLabel}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    {s.wentWrong?.[0] && (
                      <span className="text-[10px] bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full border border-orange-100 font-medium hidden sm:inline">
                        ✗ {s.wentWrong[0]}
                      </span>
                    )}
                    <span className="text-lg">{EMOJI[s.rating]}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Next Tournament Widget */}
      {nextTournament && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md px-4 py-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0 text-lg">
              🗓️
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Next Tournament</p>
              <p className="text-sm font-semibold text-gray-900 mt-0.5">{nextTournament.tournament.name}</p>
              <p className="text-xs text-gray-500">
                {nextTournament.cat.categoryName}
                {nextTournament.tournament.location?.name && (
                  <span className="text-gray-400"> · {nextTournament.tournament.location.name}</span>
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 sm:flex-col sm:items-end">
            <div className={`text-xs font-semibold px-3 py-1.5 rounded-full ${
              nextTournament.diffDays === 0
                ? 'bg-green-100 text-green-700'
                : nextTournament.diffDays <= 7
                ? 'bg-orange-50 text-orange-600'
                : 'bg-blue-50 text-blue-600'
            }`}>
              {nextTournament.diffDays === 0
                ? 'Today!'
                : nextTournament.diffDays === 1
                ? 'Tomorrow'
                : `In ${nextTournament.diffDays} days`}
            </div>
            <p className="text-xs text-gray-400">
              {new Date(nextTournament.dateStr + 'T00:00:00').toLocaleDateString('en-IN', {
                day: 'numeric',
                month: 'short',
                year: 'numeric',
              })}
            </p>
          </div>
        </div>
      )}

      {/* Time filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <select
          value={filterYear}
          onChange={(e) => setFilterYear(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          {YEARS.map((y) => (
            <option key={y} value={y}>{y}</option>
          ))}
        </select>

        <select
          value={filterMonth}
          onChange={(e) => setFilterMonth(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="">All months</option>
          {MONTHS.map((m, i) => (
            <option key={m} value={i}>{m}</option>
          ))}
        </select>

        {filterMonth !== '' && (
          <button
            onClick={() => setFilterMonth('')}
            className="text-sm text-gray-400 hover:text-gray-600 underline"
          >
            Clear month
          </button>
        )}
      </div>

      {/* Expense filter toggles */}
      <div className="flex items-center gap-2 flex-wrap mb-6">
        <span className="text-xs text-gray-500 font-medium">Include in expenses:</span>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setIncludeTournaments((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded font-semibold tracking-wide transition-colors border ${
              includeTournaments
                ? 'bg-[#91BE4D] text-white border-[#91BE4D]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#91BE4D] hover:text-[#91BE4D]'
            }`}
          >
            {includeTournaments ? '✓' : '+'} Tournament
          </button>
          <button
            onClick={() => setIncludeCourtFees((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded font-semibold tracking-wide transition-colors border ${
              includeCourtFees
                ? 'bg-blue-500 text-white border-blue-500'
                : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-500'
            }`}
          >
            {includeCourtFees ? '✓' : '+'} Court Fees
          </button>
          <button
            onClick={() => setIncludeGear((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded font-semibold tracking-wide transition-colors border ${
              includeGear
                ? 'bg-[#ec9937] text-white border-[#ec9937]'
                : 'bg-white text-gray-600 border-gray-300 hover:border-[#ec9937] hover:text-[#ec9937]'
            }`}
          >
            {includeGear ? '✓' : '+'} Gear
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-2xl p-4 sm:p-5 bg-gradient-to-br ${card.gradient} shadow-md`}>
            <div className="text-xl sm:text-2xl mb-2 filter drop-shadow-sm">{card.icon}</div>
            <p className="text-xs text-white/70 font-medium mb-1">{card.label}</p>
            <p className="text-lg sm:text-xl font-extrabold text-white leading-tight">{card.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly Chart */}
      {tournaments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-6 sm:p-12 text-center text-gray-400">
          <p className="text-base sm:text-lg">No tournament data yet.</p>
          <p className="text-xs sm:text-sm mt-1">Add your first tournament to see analytics.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 sm:p-6 mb-6">
          <h2 className="text-sm sm:text-base font-semibold text-gray-700 mb-4">
            Monthly Expenses vs Profit — {filterYear}
          </h2>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} />
              <YAxis
                width={48}
                tick={{ fontSize: 11 }}
                tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                formatter={(value, name) => [
                  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(value),
                  name,
                ]}
              />
              <Legend />
              <Bar dataKey="Expenses" fill="#f87171" radius={[4, 4, 0, 0]} />
              <Bar dataKey="Profit" fill="#91BE4D" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-Category Profit Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-gray-700 mb-4">
            Profit by Category — {filterYear}{filterMonth !== '' ? ` · ${MONTHS[Number(filterMonth)]}` : ''}
          </h2>
          <div className="space-y-3">
            {categoryBreakdown.map((row) => {
              const isProfit = row.profit >= 0;
              const maxAbsProfit = Math.max(...categoryBreakdown.map((r) => Math.abs(r.profit)), 1);
              const barWidth = Math.round((Math.abs(row.profit) / maxAbsProfit) * 100);

              return (
                <div key={row.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs sm:text-sm text-gray-700 font-medium truncate">{row.name}</span>
                      <span className="text-xs text-gray-400 flex-shrink-0">
                        {row.entries} {row.entries === 1 ? 'entry' : 'entries'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 flex-shrink-0 ml-2">
                      <span className="text-xs text-gray-400 hidden sm:block">{formatINR(row.earnings)} earned</span>
                      <span className={`text-xs sm:text-sm font-semibold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                        {isProfit ? '+' : ''}{formatINR(row.profit)}
                      </span>
                    </div>
                  </div>
                  {/* Progress bar */}
                  <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${isProfit ? 'bg-green-400' : 'bg-red-400'}`}
                      style={{ width: `${barWidth}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>

          {/* Summary row */}
          <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap gap-4 text-xs text-gray-500">
            <span>
              Best:{' '}
              <span className="font-medium text-green-600">{categoryBreakdown[0]?.name}</span>
            </span>
            {categoryBreakdown.length > 1 && categoryBreakdown[categoryBreakdown.length - 1].profit < 0 && (
              <span>
                Worst:{' '}
                <span className="font-medium text-red-500">{categoryBreakdown[categoryBreakdown.length - 1]?.name}</span>
              </span>
            )}
          </div>
        </div>
      )}

      {tournaments.length > 0 && filteredTournaments.length === 0 && (
        <div className="mt-6 text-center text-gray-400 text-sm">
          No tournaments found for the selected period.
        </div>
      )}
    </div>
  );
}
