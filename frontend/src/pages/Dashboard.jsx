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

// Helper: earliest category date for sorting/filtering
const getTournamentDate = (tournament) => {
  if (!tournament?.categories || tournament.categories.length === 0) return null;
  const dates = tournament.categories.map((cat) => cat.date).filter(Boolean);
  if (dates.length === 0) return null;
  return dates.sort()[0];
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
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState('');
  const [includeCourtBooking, setIncludeCourtBooking] = useState(false);
  const [includeGear, setIncludeGear] = useState(false);
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
    Promise.all([api.getTournaments(), api.getExpenses()])
      .then(([tRes, eRes]) => {
        setTournaments(tRes.data.data);
        setExpenses(eRes.data.data);
      })
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

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
    return <div className="text-center py-24 text-gray-400">Loading dashboard...</div>;
  }

  if (error) {
    return <div className="text-center py-24 text-red-500">{error}</div>;
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
          {/* Tournament is always on — shown as a static pill */}
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
              <YAxis
                tick={{ fontSize: 12 }}
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

      {tournaments.length > 0 && filteredTournaments.length === 0 && (
        <div className="mt-6 text-center text-gray-400 text-sm">
          No tournaments found for the selected period.
        </div>
      )}
    </div>
  );
}
