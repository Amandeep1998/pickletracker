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
import { connectGoogleCalendar } from '../services/firebase';
import { isCalendarConnected, disconnectCalendar } from '../services/googleCalendar';

const MONTHS = [
  'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

const currentYear = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - i);

// Helper: Get earliest date from tournament's categories (for sorting/filtering)
const getTournamentDate = (tournament) => {
  if (!tournament?.categories || tournament.categories.length === 0) {
    return null;
  }
  const dates = tournament.categories
    .map((cat) => cat.date)
    .filter((date) => date); // Filter out undefined/null dates
  if (dates.length === 0) return null;
  return dates.sort()[0]; // Return earliest date (lexicographic sort works for YYYY-MM-DD)
};

const CalendarIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <rect x="3" y="4" width="18" height="18" rx="2" stroke="#4285F4" strokeWidth="2" fill="white" />
    <path d="M3 9h18" stroke="#4285F4" strokeWidth="2" />
    <path d="M8 2v4M16 2v4" stroke="#4285F4" strokeWidth="2" strokeLinecap="round" />
    <rect x="7" y="13" width="3" height="3" rx="0.5" fill="#EA4335" />
    <rect x="11" y="13" width="3" height="3" rx="0.5" fill="#34A853" />
    <rect x="15" y="13" width="3" height="3" rx="0.5" fill="#FBBC05" />
  </svg>
);

export default function Dashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState('');
  const [calendarConnected, setCalendarConnected] = useState(isCalendarConnected);
  const [calendarLoading, setCalendarLoading] = useState(false);

  const handleConnectCalendar = async () => {
    setCalendarLoading(true);
    try {
      await connectGoogleCalendar();
      setCalendarConnected(true);
    } catch (err) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        alert('Failed to connect Google Calendar. Please try again.');
      }
    } finally {
      setCalendarLoading(false);
    }
  };

  const handleDisconnectCalendar = () => {
    disconnectCalendar();
    setCalendarConnected(false);
  };

  useEffect(() => {
    api
      .getTournaments()
      .then((res) => setTournaments(res.data.data))
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      // Get earliest date from categories
      const dateStr = getTournamentDate(t);
      if (!dateStr) return false; // Skip tournaments with no valid dates

      // Parse date string (YYYY-MM-DD) to avoid timezone issues
      const [year, month] = dateStr.split('-');
      if (filterYear && year !== filterYear) return false;
      if (filterMonth !== '' && String(Number(month) - 1) !== filterMonth) return false;
      return true;
    });
  }, [tournaments, filterYear, filterMonth]);

  const totals = useMemo(() => {
    return filtered.reduce(
      (acc, t) => {
        acc.earnings += t.totalEarnings || 0;
        acc.expenses += t.totalExpenses || 0;
        acc.profit += t.totalProfit || 0;
        return acc;
      },
      { earnings: 0, expenses: 0, profit: 0 }
    );
  }, [filtered]);

  // Build monthly chart data for the selected year
  const chartData = useMemo(() => {
    const yearData = tournaments.filter((t) => {
      const dateStr = getTournamentDate(t);
      return dateStr?.startsWith(filterYear);
    });
    return MONTHS.map((month, idx) => {
      const monthTournaments = yearData.filter((t) => {
        const dateStr = getTournamentDate(t);
        if (!dateStr) return false;
        const [, m] = dateStr.split('-');
        return Number(m) - 1 === idx;
      });
      const expenses = monthTournaments.reduce((s, t) => s + (t.totalExpenses || 0), 0);
      const profit = monthTournaments.reduce((s, t) => s + (t.totalProfit || 0), 0);
      return { month, Expenses: +expenses.toFixed(2), Profit: +profit.toFixed(2) };
    });
  }, [tournaments, filterYear]);

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
      value: formatINR(totals.expenses),
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
      value: filtered.length,
      color: 'text-purple-600',
      bg: 'bg-purple-50',
      icon: '🎾',
    },
  ];

  if (loading) {
    return <div className="text-center py-24 text-gray-400">Loading dashboard...</div>;
  }

  if (error) {
    return (
      <div className="text-center py-24 text-red-500">{error}</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6">Dashboard</h1>

      {/* Google Calendar Connect */}
      <div className="flex items-center justify-between bg-white rounded-xl border border-gray-100 px-4 py-3 mb-6 shadow-sm">
        <div className="flex items-center gap-3">
          <CalendarIcon />
          <div>
            <p className="text-sm font-medium text-gray-900">Google Calendar</p>
            <p className="text-xs text-gray-500">
              {calendarConnected ? 'Tournaments sync automatically' : 'Connect to sync tournaments to your calendar'}
            </p>
          </div>
        </div>
        {calendarConnected ? (
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
              <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
              Connected
            </span>
            <button
              onClick={handleDisconnectCalendar}
              className="text-xs text-gray-400 hover:text-red-500 transition-colors"
            >
              Disconnect
            </button>
          </div>
        ) : (
          <button
            onClick={handleConnectCalendar}
            disabled={calendarLoading}
            className="bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60"
          >
            {calendarLoading ? 'Connecting...' : 'Connect'}
          </button>
        )}
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-2 sm:gap-3 mb-6">
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

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {statCards.map((card) => (
          <div key={card.label} className={`rounded-2xl p-4 sm:p-5 ${card.bg}`}>
            <div className="text-xl sm:text-2xl mb-2">{card.icon}</div>
            <p className="text-xs text-gray-500 mb-1">{card.label}</p>
            <p className={`text-lg sm:text-xl font-bold ${card.color}`}>{card.value}</p>
          </div>
        ))}
      </div>

      {/* Chart */}
      {tournaments.length === 0 ? (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 sm:p-12 text-center text-gray-400">
          <p className="text-base sm:text-lg">No tournament data yet.</p>
          <p className="text-xs sm:text-sm mt-1">Add your first tournament to see analytics.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 sm:p-6">
          <h2 className="text-sm sm:text-base font-semibold text-gray-700 mb-4">
            Monthly Expenses vs Profit — {filterYear}
          </h2>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={chartData} margin={{ top: 5, right: 10, left: 10, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="month" tick={{ fontSize: 12 }} />
              <YAxis tick={{ fontSize: 12 }} tickFormatter={(v) => `₹${v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v}`} />
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

      {/* Empty filter state */}
      {tournaments.length > 0 && filtered.length === 0 && (
        <div className="mt-6 text-center text-gray-400 text-sm">
          No tournaments found for the selected period.
        </div>
      )}
    </div>
  );
}
