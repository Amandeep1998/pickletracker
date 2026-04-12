import React, { useEffect, useState, useMemo } from 'react';
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
  const [tournaments, setTournaments] = useState([]);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [slowLoad, setSlowLoad] = useState(false);
  const [error, setError] = useState('');
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState('');
  const [includeCourtBooking, setIncludeCourtBooking] = useState(false);
  const [includeGear, setIncludeGear] = useState(false);

  useEffect(() => {
    // After 4 s still loading → server is cold-starting; show a friendlier message
    const slowTimer = setTimeout(() => setSlowLoad(true), 4000);

    Promise.all([api.getTournaments(), api.getExpenses()])
      .then(([tRes, eRes]) => {
        setTournaments(tRes.data.data);
        setExpenses(eRes.data.data);
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

  // Expenses in the selected year+month window
  const filteredExpenses = useMemo(() => {
    return expenses.filter((e) => {
      const [year, month] = e.date.split('-');
      if (filterYear && year !== filterYear) return false;
      if (filterMonth !== '' && String(Number(month) - 1) !== filterMonth) return false;
      return true;
    });
  }, [expenses, filterYear, filterMonth]);

  // Stat card totals — respects expense filter toggles
  const totals = useMemo(() => {
    const earnings = filteredTournaments.reduce((s, t) => s + (t.totalEarnings || 0), 0);
    const tournamentExpenses = filteredTournaments.reduce((s, t) => s + (t.totalExpenses || 0), 0);
    const courtBookingTotal = filteredExpenses
      .filter((e) => e.type === 'court_booking')
      .reduce((s, e) => s + e.amount, 0);
    const gearTotal = filteredExpenses
      .filter((e) => e.type === 'gear')
      .reduce((s, e) => s + e.amount, 0);

    const additionalExpenses =
      (includeCourtBooking ? courtBookingTotal : 0) + (includeGear ? gearTotal : 0);
    const totalExpenses = tournamentExpenses + additionalExpenses;

    return {
      earnings,
      totalExpenses,
      profit: earnings - totalExpenses,
      count: filteredTournaments.length,
    };
  }, [filteredTournaments, filteredExpenses, includeCourtBooking, includeGear]);

  // Monthly chart data for the selected year — also respects expense filter
  const chartData = useMemo(() => {
    const yearTournaments = tournaments.filter((t) =>
      getTournamentDate(t)?.startsWith(filterYear)
    );
    const yearExpenses = expenses.filter((e) => e.date?.startsWith(filterYear));

    return MONTHS.map((month, idx) => {
      const monthStr = String(idx + 1).padStart(2, '0');

      const monthTournaments = yearTournaments.filter((t) => {
        const date = getTournamentDate(t);
        return date && date.split('-')[1] === monthStr;
      });
      const monthExpenses = yearExpenses.filter((e) => e.date.split('-')[1] === monthStr);

      const tournamentExp = monthTournaments.reduce((s, t) => s + (t.totalExpenses || 0), 0);
      const courtBooking = includeCourtBooking
        ? monthExpenses.filter((e) => e.type === 'court_booking').reduce((s, e) => s + e.amount, 0)
        : 0;
      const gear = includeGear
        ? monthExpenses.filter((e) => e.type === 'gear').reduce((s, e) => s + e.amount, 0)
        : 0;

      const totalExp = tournamentExp + courtBooking + gear;
      const earnings = monthTournaments.reduce((s, t) => s + (t.totalEarnings || 0), 0);

      return {
        month,
        Expenses: +totalExp.toFixed(2),
        Profit: +(earnings - totalExp).toFixed(2),
      };
    });
  }, [tournaments, expenses, filterYear, includeCourtBooking, includeGear]);

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

  const statCards = [
    {
      label: 'Total Earnings',
      value: formatINR(totals.earnings),
      color: 'text-green-600',
      bg: 'bg-green-50',
      icon: '🏆',
    },
    {
      label: 'Total Expenses',
      value: formatINR(totals.totalExpenses),
      color: 'text-red-500',
      bg: 'bg-red-50',
      icon: '💸',
    },
    {
      label: 'Net Profit',
      value: formatINR(totals.profit),
      color: totals.profit >= 0 ? 'text-blue-600' : 'text-red-500',
      bg: totals.profit >= 0 ? 'bg-blue-50' : 'bg-red-50',
      icon: '📊',
    },
    {
      label: 'Tournaments',
      value: totals.count,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
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
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Next Tournament Widget */}
      {nextTournament && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 mb-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
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
          <span className="text-xs px-3 py-1.5 rounded-full font-medium bg-green-600 text-white border border-green-600">
            Tournament
          </span>
          <button
            onClick={() => setIncludeCourtBooking((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
              includeCourtBooking
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {includeCourtBooking ? '✓' : '+'} Court Booking
          </button>
          <button
            onClick={() => setIncludeGear((v) => !v)}
            className={`text-xs px-3 py-1.5 rounded-full font-medium transition-colors border ${
              includeGear
                ? 'bg-orange-500 text-white border-orange-500'
                : 'bg-white text-gray-600 border-gray-300 hover:border-gray-400'
            }`}
          >
            {includeGear ? '✓' : '+'} Gear
          </button>
        </div>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-2xl p-4 sm:p-5 ${card.bg}`}>
            <div className="text-xl sm:text-2xl mb-2">{card.icon}</div>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-lg sm:text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Monthly Chart */}
      {tournaments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-12 text-center text-gray-400">
          <p className="text-base sm:text-lg">No tournament data yet.</p>
          <p className="text-xs sm:text-sm mt-1">Add your first tournament to see analytics.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6 mb-6">
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
              <Bar dataKey="Profit" fill="#4ade80" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Per-Category Profit Breakdown */}
      {categoryBreakdown.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
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
