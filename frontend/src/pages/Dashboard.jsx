import React, { useEffect, useState, useMemo, useCallback } from 'react';
import { NavLink, useNavigate, Link } from 'react-router-dom';
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
import { formatCurrency, getCurrencySymbol } from '../utils/format';
import useCurrency from '../hooks/useCurrency';
import TournamentShareModal from '../components/TournamentShareModal';
import BannerMedalStrip from '../components/BannerMedalStrip';
import { computeMedalTally } from '../utils/medals';
import { InstallAppCard } from '../components/InstallAppButton';
import PaddleLoader from '../components/PaddleLoader';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// Helper: earliest category date for sorting/filtering
const getTournamentDate = (tournament) => {
  if (!tournament?.categories || tournament.categories.length === 0) return null;
  let earliest = null;
  for (const cat of tournament.categories) {
    if (!cat?.date) continue;
    const dateStr = cat.date.split('T')[0];
    if (!earliest || dateStr < earliest) earliest = dateStr;
  }
  return earliest;
};

/** Parse calendar year + month from API date strings (supports ISO datetimes). */
function yearMonthFromRecordDate(dateStr) {
  if (!dateStr || typeof dateStr !== 'string') return null;
  const dayPart = dateStr.split('T')[0];
  const parts = dayPart.split('-');
  if (parts.length < 2 || !parts[0] || !parts[1]) return null;
  return { year: parts[0], month: parts[1] };
}

export default function Dashboard() {
  const { user } = useAuth();
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);
  const navigate = useNavigate();

  const [tournaments, setTournaments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [allSessions, setAllSessions] = useState([]);
  const [coachingIncomes, setCoachingIncomes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error, setError] = useState('');
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState('');

  // Profile nudge — hidden if user already has city, or if dismissed this session
  const nudgeKey = `profileNudgeDismissed_${user?.id}`;
  const [nudgeDismissed, setNudgeDismissed] = useState(
    () => sessionStorage.getItem(nudgeKey) === '1'
  );
  const profileIncomplete = !user?.city;
  const showNudge = profileIncomplete && !nudgeDismissed;
  const dismissNudge = useCallback(() => {
    sessionStorage.setItem(nudgeKey, '1');
    setNudgeDismissed(true);
  }, [nudgeKey]);

  useEffect(() => {
    let cancelled = false;

    const slowTimer = setTimeout(() => setSlowLoad(true), 4000);

    const load = async () => {
      try {
        setError('');
        const tournamentsPromise = api.getTournaments();
        const expensesPromise = api.getExpenses();
        const sessionsPromise = api.getSessions();

        const tRes = await tournamentsPromise;
        if (!cancelled) {
          const tData = tRes.data.data || [];
          setTournaments(tData);
          clearTimeout(slowTimer);
          setLoading(false);
          setSlowLoad(false);
        }

        const coachingPromise = api.getCoachingIncomes();
        const [eRes, sRes, cRes] = await Promise.allSettled([expensesPromise, sessionsPromise, coachingPromise]);
        if (cancelled) return;

        if (eRes.status === 'fulfilled') setExpenses(eRes.value.data.data || []);
        if (sRes.status === 'fulfilled') setAllSessions(sRes.value.data.data || []);
        if (cRes.status === 'fulfilled') setCoachingIncomes(cRes.value.data.data || []);
      } catch {
        if (!cancelled) {
          clearTimeout(slowTimer);
          setLoading(false);
          setSlowLoad(false);
          setError('Failed to load data');
        }
      }
    };

    load();

    return () => {
      cancelled = true;
      clearTimeout(slowTimer);
    };
  }, []);


  const tournamentDateMap = useMemo(() => {
    const map = {};
    tournaments.forEach((t) => {
      map[t._id] = getTournamentDate(t);
    });
    return map;
  }, [tournaments]);

  const medalTally = useMemo(
    () => computeMedalTally(tournaments, user?.manualAchievements),
    [tournaments, user?.manualAchievements]
  );

  // Next upcoming tournament
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

  // Filtered data for selected year+month
  const filteredTournaments = useMemo(() => {
    return tournaments.filter((t) => {
      const dateStr = tournamentDateMap[t._id];
      if (!dateStr) return false;
      const [year, month] = dateStr.split('-');
      if (filterYear && year !== filterYear) return false;
      if (filterMonth !== '' && String(Number(month) - 1) !== filterMonth) return false;
      return true;
    });
  }, [tournaments, tournamentDateMap, filterYear, filterMonth]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const ym = yearMonthFromRecordDate(e.date);
      if (!ym) return false;
      if (filterYear && ym.year !== filterYear) return false;
      if (filterMonth !== '' && String(Number(ym.month) - 1) !== filterMonth) return false;
      return true;
    });
  }, [expenses, filterYear, filterMonth]);

  const filteredGearExpenses = useMemo(() => {
    return filteredExpenses
      .filter((e) => e.type === 'gear')
      .slice()
      .sort((a, b) => {
        const d = (b.date || '').localeCompare(a.date || '');
        if (d !== 0) return d;
        const ca = a.createdAt ? String(a.createdAt) : '';
        const cb = b.createdAt ? String(b.createdAt) : '';
        return cb.localeCompare(ca);
      });
  }, [filteredExpenses]);

  const filteredSessions = useMemo(() => {
    return allSessions.filter((s) => {
      const ym = yearMonthFromRecordDate(s.date);
      if (!ym) return false;
      if (filterYear && ym.year !== filterYear) return false;
      if (filterMonth !== '' && String(Number(ym.month) - 1) !== filterMonth) return false;
      return true;
    });
  }, [allSessions, filterYear, filterMonth]);

  const filteredCoachingIncomes = useMemo(() => {
    return coachingIncomes.filter((c) => {
      const ym = yearMonthFromRecordDate(c.date);
      if (!ym) return false;
      if (filterYear && ym.year !== filterYear) return false;
      if (filterMonth !== '' && String(Number(ym.month) - 1) !== filterMonth) return false;
      return true;
    });
  }, [coachingIncomes, filterYear, filterMonth]);

  // Financial totals
  const totals = useMemo(() => {
    const earnings = filteredTournaments.reduce((s, t) => s + (t.totalEarnings || 0), 0);

    const coachEntries = filteredCoachingIncomes.filter((c) => c.entryRole !== 'player');
    const playerEntries = filteredCoachingIncomes.filter((c) => c.entryRole === 'player');
    const coachingGross = coachEntries.reduce((s, c) => s + (c.totalEarned || 0), 0);
    const coachingSessionCosts = coachEntries.reduce((s, c) => s + (c.expensesTotal || 0), 0);
    const playerCoachingSpend = playerEntries.reduce((s, c) => s + (Number(c.playerAmountPaid) || 0), 0);

    const tournamentEntryFees = filteredTournaments.reduce((s, t) => s + (t.totalExpenses || 0), 0);
    const tournamentTravel = filteredExpenses
      .filter((e) => e.type === 'travel')
      .reduce((s, e) => s + e.amount, 0);
    const tournamentTotal = tournamentEntryFees + tournamentTravel;

    const sessionCourtFees = filteredSessions.reduce((s, x) => s + (x.courtFee || 0), 0);
    const sessionTravel = filteredSessions.reduce((s, x) => s + (x.travelExpense?.total || 0), 0);
    const sessionTotal = sessionCourtFees + sessionTravel;

    const gearTotal = filteredExpenses
      .filter((e) => e.type === 'gear')
      .reduce((s, e) => s + e.amount, 0);

    const totalSpent = tournamentTotal + sessionTotal + gearTotal + coachingSessionCosts + playerCoachingSpend;
    const totalIn = earnings + coachingGross;
    const net = totalIn - totalSpent;

    return {
      earnings,
      coachingGross,
      coachingSessionCosts,
      playerCoachingSpend,
      tournamentEntryFees,
      tournamentTravel,
      tournamentTotal,
      sessionCourtFees,
      sessionTravel,
      sessionTotal,
      gearTotal,
      totalSpent,
      net,
      count: filteredTournaments.length,
    };
  }, [filteredTournaments, filteredExpenses, filteredSessions, filteredCoachingIncomes]);

  // Monthly chart data
  const chartData = useMemo(() => {
    const yearTournaments = tournaments.filter((t) =>
      tournamentDateMap[t._id]?.startsWith(filterYear)
    );
    const yearExpenses = expenses.filter((e) => e.date?.startsWith(filterYear));
    const yearSessions = allSessions.filter((s) => s.date?.startsWith(filterYear));
    const yearCoaching = coachingIncomes.filter((c) => c.date?.startsWith(filterYear));

    return MONTHS.map((month, idx) => {
      const monthStr = String(idx + 1).padStart(2, '0');

      const monthTournaments = yearTournaments.filter((t) => {
        const date = tournamentDateMap[t._id];
        return date && date.split('-')[1] === monthStr;
      });
      const monthExpenses = yearExpenses.filter((e) => {
        const ym = yearMonthFromRecordDate(e.date);
        return ym && ym.month === monthStr;
      });
      const monthSessions = yearSessions.filter((s) => {
        const ym = yearMonthFromRecordDate(s.date);
        return ym && ym.month === monthStr;
      });
      const monthCoaching = yearCoaching.filter((c) => {
        const ym = yearMonthFromRecordDate(c.date);
        return ym && ym.month === monthStr;
      });

      const tournamentExp =
        monthTournaments.reduce((s, t) => s + (t.totalExpenses || 0), 0) +
        monthExpenses.filter((e) => e.type === 'travel').reduce((s, e) => s + e.amount, 0);
      const sessionExp = monthSessions.reduce(
        (s, x) => s + (x.courtFee || 0) + (x.travelExpense?.total || 0), 0
      );
      const gear = monthExpenses.filter((e) => e.type === 'gear').reduce((s, e) => s + e.amount, 0);
      const coachingGrossM = monthCoaching.reduce(
        (s, c) => (c.entryRole === 'player' ? s : s + (c.totalEarned || 0)),
        0
      );
      const coachingCostsM = monthCoaching.reduce((s, c) => {
        if (c.entryRole === 'player') return s + (Number(c.playerAmountPaid) || 0);
        return s + (c.expensesTotal || 0);
      }, 0);

      const totalExp = tournamentExp + sessionExp + gear + coachingCostsM;
      const totalIn = monthTournaments.reduce((s, t) => s + (t.totalEarnings || 0), 0) + coachingGrossM;

      return {
        month,
        Expenses: +totalExp.toFixed(2),
        Profit: +(totalIn - totalExp).toFixed(2),
      };
    });
  }, [tournaments, expenses, allSessions, coachingIncomes, tournamentDateMap, filterYear]);

  // Per-category profit breakdown
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

  // Playing streak
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

  // Most-recurring weakness
  const focusArea = useMemo(() => {
    const freq = {};
    allSessions.forEach((s) => {
      (s.wentWrong || []).forEach((tag) => { freq[tag] = (freq[tag] || 0) + 1; });
    });
    const top = Object.entries(freq).sort((a, b) => b[1] - a[1])[0];
    return top ? top[0] : null;
  }, [allSessions]);

  // Upcoming tournaments grouped by tournament
  const todayStr = new Date().toISOString().split('T')[0];
  const upcomingTournaments = useMemo(() => {
    const map = {};
    tournaments.forEach((t) => {
      const upcomingCats = (t.categories || [])
        .map((cat) => ({ ...cat, date: cat.date ? cat.date.split('T')[0] : null }))
        .filter((cat) => cat.date && cat.date >= todayStr);
      if (!upcomingCats.length) return;
      const earliestDate = upcomingCats.map((c) => c.date).sort()[0];
      map[t._id] = { tournament: t, categories: upcomingCats, earliestDate };
    });
    return Object.values(map)
      .sort((a, b) => (a.earliestDate < b.earliestDate ? -1 : 1))
      .slice(0, 6);
  }, [tournaments, todayStr]);

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 12) return 'Good morning';
    if (h < 17) return 'Good afternoon';
    return 'Good evening';
  })();
  const firstName = user?.name?.split(' ')[0] || 'Player';

  // Build stat cards — always show all 5; add Coach Income card for coaches
  const statCards = [
    {
      label: 'Prize Earned',
      value: formatCurrency(totals.earnings, currency),
      gradient: 'from-[#91BE4D] to-[#6a9020]',
    },
    {
      label: 'Tournament Costs',
      sublabel: 'Entry + Travel',
      value: formatCurrency(totals.tournamentTotal, currency),
      gradient: 'from-[#ec9937] to-[#c07010]',
    },
    {
      label: 'Practice Costs',
      sublabel: 'Court + Travel',
      value: formatCurrency(totals.sessionTotal, currency),
      gradient: 'from-blue-500 to-blue-700',
    },
    {
      label: 'Gear',
      value: formatCurrency(totals.gearTotal, currency),
      gradient: 'from-violet-500 to-purple-600',
    },
    {
      label: 'Net Profit/Loss',
      value: (totals.net < 0 ? '-' : '+') + formatCurrency(Math.abs(totals.net), currency),
      gradient: totals.net >= 0 ? 'from-emerald-500 to-green-700' : 'from-rose-600 to-red-700',
    },
  ];

  const cardCount = statCards.length;
  const gridCols = cardCount <= 5
    ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-5'
    : cardCount === 6
      ? 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-6'
      : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';

  if (loading) {
    return (
      <div className="text-center py-24 px-4">
        <div className="inline-flex flex-col items-center gap-2">
          {!slowLoad ? (
            <PaddleLoader label="Loading dashboard..." />
          ) : (
            <div className="text-center">
              <div className="mb-2">
                <PaddleLoader label="Server is waking up..." />
              </div>
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
        <div className="relative flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-1">PickleTracker</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">{greeting}, {firstName}!</h1>
            <p className="text-slate-400 text-xs sm:text-sm mt-1">
              {streak > 0 ? `🔥 ${streak}-day streak · ` : ''}
              {weekStats.count > 0 ? `${weekStats.count} session${weekStats.count !== 1 ? 's' : ''} this week` : 'No sessions yet this week'}
              {weekStats.avg ? ` · avg ${weekStats.avg}/5` : ''}
            </p>
            <BannerMedalStrip medals={medalTally} className="mt-3" />
          </div>
          <div className="relative select-none opacity-90 flex-shrink-0 hidden sm:block">
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

      {/* Time filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-4">
        <div className="relative">
          <select
            value={filterYear}
            onChange={(e) => setFilterYear(e.target.value)}
            className="appearance-none w-full sm:w-36 rounded-xl border border-[#91BE4D]/35 bg-[#f4f8e8] px-3 py-2.5 pr-9 text-xs sm:text-sm font-semibold text-[#1c350a] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
          >
            {YEARS.map((y) => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#4a6e10]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        <div className="relative">
          <select
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            className="appearance-none w-full sm:w-40 rounded-xl border border-[#ec9937]/35 bg-[#fff8ef] px-3 py-2.5 pr-9 text-xs sm:text-sm font-semibold text-[#7a4808] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#ec9937] focus:border-[#ec9937]"
          >
            <option value="">All months</option>
            {MONTHS.map((m, i) => (
              <option key={m} value={i}>{m}</option>
            ))}
          </select>
          <svg className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#a86010]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {filterMonth !== '' && (
          <button
            onClick={() => setFilterMonth('')}
            className="text-xs sm:text-sm font-semibold text-[#4a6e10] hover:text-[#2d7005] underline underline-offset-2 self-start sm:self-center"
          >
            Clear month
          </button>
        )}
      </div>

      {/* Stat Cards */}
      <div className={`grid ${gridCols} gap-2 sm:gap-3 mb-4`}>
        {statCards.map((card) => {
          const vlen = card.value.length;
          const valueClass =
            vlen > 13 ? 'text-xs sm:text-sm'
            : vlen > 10 ? 'text-sm sm:text-base'
            : vlen > 8  ? 'text-base sm:text-lg'
            : 'text-lg sm:text-xl';
          return (
            <div
              key={card.label}
              className={`rounded-2xl p-3 sm:p-4 bg-gradient-to-br ${card.gradient} shadow-md min-w-0 flex flex-col h-full`}
            >
              <p className="text-[10px] sm:text-xs text-white/70 font-medium mb-0.5 leading-snug">{card.label}</p>
              <p className="text-[9px] sm:text-[10px] text-white/50 mb-1 leading-snug min-h-[1.125rem] sm:min-h-[1.25rem]">
                {card.sublabel || '\u00a0'}
              </p>
              <p className={`${valueClass} font-extrabold text-white leading-tight whitespace-nowrap mt-auto`}>
                {card.value}
              </p>
            </div>
          );
        })}
      </div>

      {/* Financial Breakdown Card */}
      {(totals.earnings > 0 ||
        totals.coachingGross > 0 ||
        totals.coachingSessionCosts > 0 ||
        totals.playerCoachingSpend > 0 ||
        totals.totalSpent > 0) && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 sm:p-5 mb-4">
          <h2 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-3">
            Spending Breakdown — {filterYear}{filterMonth !== '' ? ` · ${MONTHS[Number(filterMonth)]}` : ''}
          </h2>

          <div className="space-y-2">
            {/* Prize Money */}
            <div className="flex items-center justify-between rounded-xl bg-green-50 border border-green-100 px-3 py-2.5">
              <div className="flex items-center gap-2">
                <span className="text-base">💰</span>
                <span className="text-sm font-semibold text-green-800">Prize Money Won</span>
              </div>
              <span className="text-sm font-extrabold text-green-700">{formatCurrency(totals.earnings, currency)}</span>
            </div>

            {/* Tournament block */}
            <div className="rounded-xl border border-orange-100 overflow-hidden">
              <div className="flex items-center justify-between bg-orange-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🏆</span>
                  <span className="text-sm font-bold text-orange-800">Tournament</span>
                </div>
                <span className="text-sm font-extrabold text-orange-700">{formatCurrency(totals.tournamentTotal, currency)}</span>
              </div>
              <div className="px-3 py-2 space-y-1.5 bg-white">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-300 inline-block"></span>
                    Entry fees
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{formatCurrency(totals.tournamentEntryFees, currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-300 inline-block"></span>
                    Travel
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{formatCurrency(totals.tournamentTravel, currency)}</span>
                </div>
              </div>
            </div>

            {/* Practice block */}
            <div className="rounded-xl border border-blue-100 overflow-hidden">
              <div className="flex items-center justify-between bg-blue-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎯</span>
                  <span className="text-sm font-bold text-blue-800">Practice <span className="font-normal text-blue-500 text-xs">(Casual + Drill)</span></span>
                </div>
                <span className="text-sm font-extrabold text-blue-700">{formatCurrency(totals.sessionTotal, currency)}</span>
              </div>
              <div className="px-3 py-2 space-y-1.5 bg-white">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-300 inline-block"></span>
                    Court fees
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{formatCurrency(totals.sessionCourtFees, currency)}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-xs text-gray-500 flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-blue-300 inline-block"></span>
                    Travel
                  </span>
                  <span className="text-xs font-semibold text-gray-700">{formatCurrency(totals.sessionTravel, currency)}</span>
                </div>
              </div>
            </div>

            {/* Gear */}
            <div className="rounded-xl border border-violet-100 overflow-hidden">
              <div className="flex items-center justify-between bg-violet-50 px-3 py-2">
                <div className="flex items-center gap-2">
                  <span className="text-base">🎒</span>
                  <span className="text-sm font-bold text-violet-800">Gear</span>
                </div>
                <span className="text-sm font-extrabold text-violet-700">{formatCurrency(totals.gearTotal, currency)}</span>
              </div>
              <div className="px-3 py-2 space-y-1.5 bg-white">
                {filteredGearExpenses.length === 0 ? (
                  <p className="text-xs text-gray-400">No gear purchases this period</p>
                ) : (
                  <>
                    {filteredGearExpenses.slice(0, 12).map((e, idx) => (
                      <div
                        key={e._id != null ? String(e._id) : `gear-${idx}-${e.date || ''}-${e.title || ''}`}
                        className="flex justify-between items-center gap-2"
                      >
                        <span className="text-xs text-gray-500 flex items-center gap-1.5 min-w-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-violet-300 flex-shrink-0 inline-block" />
                          <span className="truncate" title={e.title}>{e.title}</span>
                        </span>
                        <span className="text-xs font-semibold text-gray-700 flex-shrink-0 tabular-nums">
                          {formatCurrency(e.amount, currency)}
                        </span>
                      </div>
                    ))}
                    {filteredGearExpenses.length > 12 && (
                      <p className="text-[11px] text-gray-400 pt-0.5">
                        +{filteredGearExpenses.length - 12} more —{' '}
                        <Link to="/expenses" className="text-violet-600 hover:text-violet-800 font-medium">
                          view all gear
                        </Link>
                      </p>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Coaching — teaching income + costs, and/or what you paid as a student */}
            {(totals.coachingGross > 0 ||
              totals.coachingSessionCosts > 0 ||
              totals.playerCoachingSpend > 0) && (
              <div className="rounded-xl border border-teal-100 overflow-hidden">
                <div className="flex items-center justify-between bg-teal-50 px-3 py-2">
                  <div className="flex items-center gap-2">
                    <span className="text-base">👨‍🏫</span>
                    <span className="text-sm font-bold text-teal-800">Coaching</span>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-teal-700 leading-tight">
                      {formatCurrency(
                        Math.max(0, totals.coachingGross - totals.coachingSessionCosts),
                        currency
                      )}
                    </p>
                    <p className="text-[9px] font-semibold text-teal-600/80">Coach net</p>
                  </div>
                </div>
                <div className="px-3 py-2 space-y-1.5 bg-white">
                  {totals.coachingGross > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-teal-300 inline-block"></span>
                        Gross earned (teaching)
                      </span>
                      <span className="text-xs font-semibold text-gray-700">{formatCurrency(totals.coachingGross, currency)}</span>
                    </div>
                  )}
                  {totals.coachingSessionCosts > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-red-300 inline-block"></span>
                        Costs running lessons
                      </span>
                      <span className="text-xs font-semibold text-red-500">
                        -{formatCurrency(totals.coachingSessionCosts, currency)}
                      </span>
                    </div>
                  )}
                  {totals.playerCoachingSpend > 0 && (
                    <div className="flex justify-between items-center">
                      <span className="text-xs text-gray-500 flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 inline-block"></span>
                        Paid for your lessons
                      </span>
                      <span className="text-xs font-semibold text-rose-600">
                        -{formatCurrency(totals.playerCoachingSpend, currency)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Totals footer */}
          <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs font-semibold text-gray-500">Total Spent</span>
              <span className="text-sm font-bold text-gray-800">{formatCurrency(totals.totalSpent, currency)}</span>
            </div>
            <div className="flex justify-between items-center rounded-xl px-3 py-2" style={{ background: totals.net >= 0 ? '#f0fdf4' : '#fff1f2', border: `1px solid ${totals.net >= 0 ? '#bbf7d0' : '#fecdd3'}` }}>
              <span className="text-sm font-bold" style={{ color: totals.net >= 0 ? '#166534' : '#9f1239' }}>Net P&L</span>
              <span className="text-base font-extrabold" style={{ color: totals.net >= 0 ? '#16a34a' : '#e11d48' }}>
                {(totals.net < 0 ? '-' : '+') + formatCurrency(Math.abs(totals.net), currency)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid gap-2 mb-4 grid-cols-3">
        <button
          onClick={() => navigate('/sessions')}
          className="flex flex-col items-center gap-1 py-3 px-2 rounded-xl border-2 border-[#91BE4D]/30 bg-[#91BE4D]/5 hover:bg-[#91BE4D]/10 transition-colors text-center"
        >
          <span className="text-xl">🎯</span>
          <span className="text-xs font-bold text-[#4a6e10] leading-tight text-center">Casual Play / Drill</span>
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

      <InstallAppCard />

      {/* Upcoming Tournaments Share Widget */}
      <div className="rounded-2xl overflow-hidden mb-6 shadow-md relative" style={{ background: 'linear-gradient(145deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}>
        <div className="absolute pointer-events-none" style={{ top: -40, right: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(145,190,77,0.1)' }} />
        <div className="absolute pointer-events-none" style={{ bottom: -30, left: -30, width: 120, height: 120, borderRadius: '50%', background: 'rgba(236,153,55,0.08)' }} />

        <div className="relative flex items-center justify-between px-4 pt-4 pb-0">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(145,190,77,0.15)', border: '1px solid rgba(145,190,77,0.3)' }}>
              <span className="text-[10px] font-black text-[#c8e875]">PT</span>
            </div>
            <span className="text-[10px] font-bold text-[#91BE4D] uppercase tracking-widest">PickleTracker</span>
          </div>
          <NavLink to="/calendar" className="text-[10px] text-white/40 hover:text-white/60 transition-colors">
            View calendar →
          </NavLink>
        </div>

        <div className="relative px-4 pt-3 pb-3">
          <p className="text-white/50 text-[10px] uppercase tracking-widest font-semibold mb-1">
            {firstName}'s upcoming tournaments
          </p>
          {upcomingTournaments.length > 0 ? (() => {
            const totalCats = upcomingTournaments.reduce((s, t) => s + t.categories.length, 0);
            const multipleCats = totalCats > upcomingTournaments.length;
            return (
              <p className="text-white font-black text-base leading-tight">
                Playing{' '}
                <span style={{ color: '#c8e875' }}>{upcomingTournaments.length}</span>
                {upcomingTournaments.length === 1 ? ' tournament' : ' tournaments'}
                {multipleCats && (
                  <span className="font-black">
                    {' '}across{' '}
                    <span style={{ color: '#ffd580' }}>{totalCats}</span>
                    {' categories'}
                  </span>
                )}
                {' '}soon 🏆
              </p>
            );
          })() : (
            <p className="text-white/60 text-sm font-semibold">No upcoming tournaments yet</p>
          )}
        </div>

        <div className="relative px-4 pb-3 space-y-2">
          {upcomingTournaments.length === 0 ? (
            <NavLink
              to="/tournaments"
              className="block text-center text-xs font-bold py-2.5 rounded-xl transition-colors"
              style={{ color: '#c8e875', border: '1px solid rgba(145,190,77,0.3)', background: 'rgba(255,255,255,0.04)' }}
            >
              + Add a tournament
            </NavLink>
          ) : (
            upcomingTournaments.slice(0, 4).map((item, i) => {
              const d = new Date(item.earliestDate + 'T00:00:00');
              const now = new Date(); now.setHours(0, 0, 0, 0);
              const diff = Math.round((d - now) / 86400000);
              const label = diff === 0 ? 'Today' : diff === 1 ? 'Tomorrow' : `${diff}d`;
              const catNames = item.categories.map((c) => c.categoryName).join(' · ');
              return (
                <div key={i} className="py-2 px-3 rounded-xl" style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(145,190,77,0.15)' }}>
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-white text-xs font-bold truncate flex-1">{item.tournament.name}</p>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full flex-shrink-0" style={{ background: 'rgba(145,190,77,0.2)', color: '#c8e875' }}>
                      {label}
                    </span>
                  </div>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {catNames}{item.tournament.location?.name ? ` · ${item.tournament.location.name}` : ''}
                  </p>
                </div>
              );
            })
          )}
          {upcomingTournaments.length > 4 && (
            <p className="text-center text-[10px]" style={{ color: 'rgba(255,255,255,0.3)' }}>
              +{upcomingTournaments.length - 4} more · <NavLink to="/calendar" className="underline">view all</NavLink>
            </p>
          )}
        </div>

        {upcomingTournaments.length > 0 && (
          <div className="relative px-4 pb-4 pt-2" style={{ borderTop: '1px solid rgba(255,255,255,0.08)' }}>
            <button
              onClick={() => setShareModalOpen(true)}
              className="w-full flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-semibold text-white transition-opacity hover:opacity-90"
              style={{ background: 'linear-gradient(to right, rgba(45,112,5,0.9), rgba(145,190,77,0.7), rgba(168,96,16,0.8))', border: '1px solid rgba(145,190,77,0.3)' }}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Share Upcoming Tournaments
            </button>
          </div>
        )}
      </div>

      {/* Monthly Chart */}
      {(tournaments.length > 0 || coachingIncomes.length > 0) && (
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
                tickFormatter={(v) => `${symbol}${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`}
              />
              <Tooltip
                formatter={(value, name) => [
                  formatCurrency(value, currency),
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

      {/* Travel Spend Widget */}
      {(() => {
        const yearTravel = expenses
          .filter((e) => e.type === 'travel' && e.date?.startsWith(filterYear))
          .sort((a, b) => (b.date || '').localeCompare(a.date || ''));
        const yearTravelTotal = yearTravel.reduce((s, e) => s + e.amount, 0);
        if (yearTravel.length === 0) return null;

        return (
          <div className="bg-white rounded-2xl border border-gray-100 shadow-md p-4 sm:p-6 mb-6">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span className="text-lg">✈️</span>
                <h2 className="text-sm sm:text-base font-semibold text-gray-700">
                  Travel Spend — {filterYear}
                </h2>
                {yearTravelTotal > 0 && (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-teal-50 text-teal-600 border border-teal-200">
                    {formatCurrency(yearTravelTotal, currency)}
                  </span>
                )}
              </div>
              <Link to="/travel" className="text-xs text-teal-600 hover:text-teal-800 font-semibold transition-colors">
                View all →
              </Link>
            </div>
            <div className="space-y-2">
              {yearTravel.slice(0, 3).map((e) => (
                <div key={e._id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{e.title}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <p className="text-xs text-gray-400">
                        {e.date
                          ? new Date(`${e.date.split('T')[0]}T00:00:00`).toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                            })
                          : '—'}
                      </p>
                      {e.fromCity && e.toCity && (
                        <p className="text-xs text-gray-500">{e.fromCity} → {e.toCity}</p>
                      )}
                      {e.isInternational && (
                        <span className="text-xs px-1.5 py-0.5 bg-teal-50 text-teal-600 rounded-full border border-teal-200 font-medium">Intl</span>
                      )}
                    </div>
                  </div>
                  <p className="text-sm font-bold text-teal-600 flex-shrink-0">{formatCurrency(e.amount, currency)}</p>
                </div>
              ))}
              {yearTravel.length > 3 && (
                <p className="text-xs text-gray-400 pt-1 text-center">
                  +{yearTravel.length - 3} more trip{yearTravel.length - 3 !== 1 ? 's' : ''} —{' '}
                  <Link to="/travel" className="text-teal-600 hover:underline font-medium">view all</Link>
                </p>
              )}
            </div>
          </div>
        );
      })()}

      {/* Get started prompt */}
      {tournaments.length === 0 && allSessions.length === 0 && expenses.length === 0 && coachingIncomes.length === 0 && (
        <div className="bg-white rounded-2xl border border-dashed border-gray-200 p-6 text-center mb-6">
          <p className="text-3xl mb-3">🏆</p>
          <p className="text-sm font-bold text-gray-700 mb-1">Your stats will appear here</p>
          <p className="text-xs text-gray-400 mb-4">
            Add a tournament or log casual play / drill to see your numbers here.
          </p>
          <div className="flex gap-2 justify-center flex-wrap">
            <button
              onClick={() => navigate('/tournaments')}
              className="text-xs font-bold px-4 py-2 rounded-lg text-white hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
            >
              + Add Tournament
            </button>
            <button
              onClick={() => navigate('/sessions')}
              className="text-xs font-bold px-4 py-2 rounded-lg border-2 border-[#91BE4D]/40 text-[#4a6e10] hover:bg-[#91BE4D]/5 transition-colors"
            >
              + Casual Play / Drill
            </button>
          </div>
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
                      <span className="text-xs text-gray-400 hidden sm:block">{formatCurrency(row.earnings, currency)} earned</span>
                      <span className={`text-xs sm:text-sm font-semibold ${isProfit ? 'text-green-600' : 'text-red-500'}`}>
                        {isProfit ? '+' : ''}{formatCurrency(row.profit, currency)}
                      </span>
                    </div>
                  </div>
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

      {shareModalOpen && (
        <TournamentShareModal
          items={upcomingTournaments}
          onClose={() => setShareModalOpen(false)}
        />
      )}

      {/* Profile completion nudge */}
      {showNudge && (
        <div className="bg-[#f4f8e8] border border-[#91BE4D]/30 rounded-xl px-4 py-3 mt-6 flex items-start gap-3">
          <span className="text-lg flex-shrink-0 mt-0.5">✨</span>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-[#272702]">Make PickleTracker work harder for you</p>
            <p className="text-xs text-gray-500 mt-0.5">
              Add your city to personalise your profile and appear in the Nearby Players directory.
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
    </div>
  );
}
