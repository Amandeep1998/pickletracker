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

export default function Dashboard() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filterYear, setFilterYear] = useState(String(currentYear));
  const [filterMonth, setFilterMonth] = useState('');

  useEffect(() => {
    api
      .getTournaments()
      .then((res) => setTournaments(res.data.data))
      .catch(() => setError('Failed to load data'))
      .finally(() => setLoading(false));
  }, []);

  const filtered = useMemo(() => {
    return tournaments.filter((t) => {
      // Parse date string (YYYY-MM-DD) to avoid timezone issues
      const [year, month] = t.date.split('-');
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
    const yearData = tournaments.filter(
      (t) => t.date.startsWith(filterYear)
    );
    return MONTHS.map((month, idx) => {
      const monthTournaments = yearData.filter((t) => {
        const [, m] = t.date.split('-');
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
