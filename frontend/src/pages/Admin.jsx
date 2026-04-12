import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { formatINR } from '../utils/format';

const ADMIN_EMAIL = import.meta.env.VITE_ADMIN_EMAIL;

const STATUS_STYLES = {
  active:   { dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700',  label: 'Active' },
  recent:   { dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700', label: 'Recent' },
  inactive: { dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-500',    label: 'Inactive' },
};

function timeAgo(date) {
  const diff = Math.floor((Date.now() - new Date(date)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-5 py-4">
      <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">{label}</p>
      <p className={`text-2xl font-bold ${color}`}>{value}</p>
      {sub && <p className="text-xs text-gray-400 mt-0.5">{sub}</p>}
    </div>
  );
}

function MedalBadge({ medal, count }) {
  if (!count) return null;
  const colors = {
    Gold:   'bg-yellow-50 text-yellow-700 border-yellow-200',
    Silver: 'bg-gray-100 text-gray-600 border-gray-200',
    Bronze: 'bg-orange-50 text-orange-600 border-orange-200',
  };
  return (
    <span className={`text-xs font-medium px-1.5 py-0.5 rounded border ${colors[medal]}`}>
      {count} {medal}
    </span>
  );
}

export default function Admin() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [expandedId, setExpandedId] = useState(null);

  // Guard: only admin can access
  useEffect(() => {
    if (user && user.email !== ADMIN_EMAIL) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    api.getAdminUsers()
      .then((res) => setData(res.data.data))
      .catch(() => setError('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);

  const filteredUsers = useMemo(() => {
    if (!data?.users) return [];
    const q = search.toLowerCase();
    return data.users
      .filter((u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q))
      .sort((a, b) => {
        if (sortBy === 'createdAt') return new Date(b.createdAt) - new Date(a.createdAt);
        if (sortBy === 'lastActive') return new Date(b.lastActive) - new Date(a.lastActive);
        if (sortBy === 'tournaments') return b.tournamentCount - a.tournamentCount;
        if (sortBy === 'profit') return b.totalProfit - a.totalProfit;
        return 0;
      });
  }, [data, search, sortBy]);

  if (loading) {
    return (
      <div className="text-center py-24 text-gray-400 text-sm">Loading admin panel...</div>
    );
  }

  if (error) {
    return <div className="text-center py-24 text-red-500 text-sm">{error}</div>;
  }

  const { stats } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Admin Panel</h1>
        <p className="text-sm text-gray-400 mt-1">User analytics and activity overview</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-8">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Active This Week" value={stats.activeThisWeek} color="text-green-600" />
        <StatCard label="Active This Month" value={stats.activeThisMonth} color="text-yellow-600" />
        <StatCard label="Tournaments" value={stats.totalTournaments} />
        <StatCard label="Google Sign-In" value={stats.googleUsers} sub={`${stats.totalUsers - stats.googleUsers} email`} />
        <StatCard
          label="Revenue Tracked"
          value={formatINR(stats.totalRevenueTracked)}
          color="text-green-700"
        />
      </div>

      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        />
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
        >
          <option value="createdAt">Sort: Newest joined</option>
          <option value="lastActive">Sort: Last active</option>
          <option value="tournaments">Sort: Most tournaments</option>
          <option value="profit">Sort: Highest profit</option>
        </select>
      </div>

      {/* User count */}
      <p className="text-xs text-gray-400 mb-3">
        Showing {filteredUsers.length} of {data.users.length} users
      </p>

      {/* User list */}
      <div className="space-y-2">
        {filteredUsers.map((u) => {
          const st = STATUS_STYLES[u.activityStatus];
          const isExpanded = expandedId === u._id;

          return (
            <div
              key={u._id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden"
            >
              {/* Row — click to expand */}
              <div
                className="flex items-center gap-3 px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : u._id)}
              >
                {/* Avatar */}
                <div className="w-9 h-9 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center flex-shrink-0 uppercase">
                  {u.name.charAt(0)}
                </div>

                {/* Name + email + mobile meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                    {/* Auth badge — visible on all sizes */}
                    {u.isGoogleUser ? (
                      <span className="text-xs bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full border border-blue-100 flex-shrink-0">Google</span>
                    ) : (
                      <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-200 flex-shrink-0">Email</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  {/* Mobile-only sub-row */}
                  <div className="flex items-center gap-3 mt-1 sm:hidden">
                    <span className="text-xs text-gray-500">{u.tournamentCount} events</span>
                    <span className={`text-xs font-semibold ${u.totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatINR(u.totalProfit)}
                    </span>
                  </div>
                </div>

                {/* Joined — hidden on mobile */}
                <div className="hidden md:block text-xs text-gray-400 flex-shrink-0 w-24 text-right">
                  <p className="text-gray-500 font-medium">Joined</p>
                  <p>{new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: '2-digit' })}</p>
                </div>

                {/* Last active — hidden on mobile */}
                <div className="hidden lg:block text-xs text-gray-400 flex-shrink-0 w-24 text-right">
                  <p className="text-gray-500 font-medium">Last active</p>
                  <p>{timeAgo(u.lastActive)}</p>
                </div>

                {/* Tournaments — hidden on mobile (shown inline above) */}
                <div className="hidden sm:block text-xs text-center flex-shrink-0 w-14">
                  <p className="text-gray-500 font-medium">Events</p>
                  <p className="text-gray-900 font-bold">{u.tournamentCount}</p>
                </div>

                {/* Profit — hidden on mobile */}
                <div className="hidden sm:block text-xs text-right flex-shrink-0 w-20">
                  <p className="text-gray-500 font-medium">Net Profit</p>
                  <p className={`font-bold ${u.totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                    {formatINR(u.totalProfit)}
                  </p>
                </div>

                {/* Status badge — hidden on mobile */}
                <div className="hidden sm:flex flex-shrink-0">
                  <span className={`flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${st.badge}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                    {st.label}
                  </span>
                </div>

                {/* Status dot only — mobile */}
                <div className="sm:hidden flex-shrink-0">
                  <span className={`w-2 h-2 rounded-full block ${st.dot}`} />
                </div>

                {/* Expand chevron */}
                <svg
                  className={`w-4 h-4 text-gray-400 flex-shrink-0 transition-transform ${isExpanded ? 'rotate-180' : ''}`}
                  fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                >
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>

              {/* Expanded detail */}
              {isExpanded && (
                <div className="border-t border-gray-100 px-4 py-4 bg-gray-50">
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">

                    {/* Activity stats */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Activity</p>
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Joined</span>
                          <span className="font-medium text-gray-900">
                            {new Date(u.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last active</span>
                          <span className="font-medium text-gray-900">{timeAgo(u.lastActive)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tournaments played</span>
                          <span className="font-medium text-gray-900">{u.tournamentCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total categories</span>
                          <span className="font-medium text-gray-900">{u.totalCategories}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Expenses logged</span>
                          <span className="font-medium text-gray-900">{u.expenseCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Upcoming tournaments</span>
                          <span className={`font-medium ${u.upcomingCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {u.upcomingCount || '—'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Financials + medals */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Financials</p>
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Total earnings</span>
                          <span className="font-medium text-green-600">{formatINR(u.totalEarnings)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total entry fees</span>
                          <span className="font-medium text-red-500">{formatINR(u.totalExpenses)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net profit</span>
                          <span className={`font-bold ${u.totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatINR(u.totalProfit)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Medals</p>
                      <div className="flex flex-wrap gap-1.5">
                        <MedalBadge medal="Gold" count={u.medals.Gold} />
                        <MedalBadge medal="Silver" count={u.medals.Silver} />
                        <MedalBadge medal="Bronze" count={u.medals.Bronze} />
                        {!u.medals.Gold && !u.medals.Silver && !u.medals.Bronze && (
                          <span className="text-xs text-gray-400">No medals yet</span>
                        )}
                      </div>

                      {u.topCategory && (
                        <>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-1">Top Category</p>
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100">
                            {u.topCategory}
                          </span>
                        </>
                      )}
                    </div>

                    {/* Recent tournaments + monthly chart */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Tournaments</p>
                      {u.recentTournaments.length === 0 ? (
                        <p className="text-xs text-gray-400">No tournaments yet</p>
                      ) : (
                        <div className="space-y-2">
                          {u.recentTournaments.map((t, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-gray-100">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">{t.name}</p>
                                <p className="text-xs text-gray-400">{t.categoryCount} {t.categoryCount === 1 ? 'category' : 'categories'}</p>
                              </div>
                              <span className={`text-xs font-semibold flex-shrink-0 ml-2 ${t.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {t.profit >= 0 ? '+' : ''}{formatINR(t.profit)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* 6-month activity bar chart */}
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">
                        Activity (6 months)
                      </p>
                      <div className="flex items-end gap-1 h-10">
                        {u.monthlyActivity.map((m, i) => {
                          const max = Math.max(...u.monthlyActivity.map((x) => x.count), 1);
                          const height = Math.round((m.count / max) * 100);
                          return (
                            <div key={i} className="flex-1 flex flex-col items-center gap-0.5" title={`${m.month}: ${m.count} tournament(s)`}>
                              <div
                                className="w-full rounded-sm bg-green-400"
                                style={{ height: `${Math.max(height, m.count > 0 ? 8 : 2)}%`, minHeight: m.count > 0 ? '4px' : '2px' }}
                              />
                            </div>
                          );
                        })}
                      </div>
                      <div className="flex gap-1 mt-1">
                        {u.monthlyActivity.map((m, i) => (
                          <p key={i} className="flex-1 text-center text-gray-400" style={{ fontSize: '9px' }}>{m.month}</p>
                        ))}
                      </div>
                    </div>

                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredUsers.length === 0 && (
          <div className="text-center py-12 text-gray-400 text-sm">No users match your search.</div>
        )}
      </div>
    </div>
  );
}
