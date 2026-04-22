import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { formatCurrency } from '../utils/format';
import useCurrency from '../hooks/useCurrency';
import { deleteAdminUser, broadcastEmail as apiBroadcastEmail } from '../services/api';
import AdminUserCalendar from '../components/AdminUserCalendar';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

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
  return new Date(date).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' });
}

function StatCard({ label, value, sub, color = 'text-gray-900' }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-3 py-3 sm:px-5 sm:py-4">
      <p className="text-[10px] sm:text-xs text-gray-400 font-medium uppercase tracking-wide mb-1 leading-tight">{label}</p>
      <p className={`text-lg sm:text-2xl font-bold truncate ${color}`}>{value}</p>
      {sub && <p className="text-[10px] sm:text-xs text-gray-400 mt-0.5 truncate">{sub}</p>}
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
  const currency = useCurrency();
  const navigate = useNavigate();

  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('createdAt');
  const [expandedId, setExpandedId] = useState(null);
  const [calendarUser, setCalendarUser] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null); // user object pending delete
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  // Broadcast email
  const [broadcastOpen, setBroadcastOpen] = useState(false);
  const [broadcastTemplate, setBroadcastTemplate] = useState('tournament_reminder');
  const [broadcastTarget, setBroadcastTarget] = useState('inactive');
  const [broadcastConfirm, setBroadcastConfirm] = useState(false);
  const [broadcastLoading, setBroadcastLoading] = useState(false);
  const [broadcastResult, setBroadcastResult] = useState(null); // { sent, failed, total, failures }
  const [showFailures, setShowFailures] = useState(false);

  // Guard: only admin can access
  useEffect(() => {
    if (user && !ADMIN_EMAILS.includes(user.email?.toLowerCase())) {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  useEffect(() => {
    api.getAdminUsers()
      .then((res) => {
        setData(res.data.data);
      })
      .catch(() => setError('Failed to load admin data'))
      .finally(() => setLoading(false));
  }, []);


  const handleDeleteUser = async () => {
    if (!deleteConfirm) return;
    setDeleteLoading(true);
    setDeleteError('');
    try {
      await deleteAdminUser(deleteConfirm._id);
      setData((prev) => ({
        ...prev,
        users: prev.users.filter((u) => u._id !== deleteConfirm._id),
      }));
      setDeleteConfirm(null);
      if (expandedId === deleteConfirm._id) setExpandedId(null);
    } catch {
      setDeleteError('Failed to delete user. Please try again.');
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleBroadcast = async () => {
    setBroadcastLoading(true);
    setBroadcastResult(null);
    try {
      const res = await apiBroadcastEmail(broadcastTemplate, broadcastTarget);
      setBroadcastResult(res.data);
      setBroadcastConfirm(false);
      setShowFailures(false);
    } catch {
      setBroadcastResult({ error: true });
    } finally {
      setBroadcastLoading(false);
    }
  };

  const broadcastAudienceCount = useMemo(() => {
    if (!data?.users) return 0;
    if (broadcastTarget === 'all') return data.users.length;
    if (broadcastTarget === 'inactive') return data.users.filter((u) => u.tournamentCount === 0 && u.sessionCount === 0).length;
    return data.users.filter((u) => u.tournamentCount > 0 || u.sessionCount > 0).length;
  }, [data, broadcastTarget]);

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
      <div className="grid grid-cols-3 sm:grid-cols-3 lg:grid-cols-6 gap-2 sm:gap-3 mb-3">
        <StatCard label="Total Users" value={stats.totalUsers} />
        <StatCard label="Active Week" value={stats.activeThisWeek} color="text-green-600" />
        <StatCard label="Active Month" value={stats.activeThisMonth} color="text-yellow-600" />
        <StatCard label="Tournaments" value={stats.totalTournaments} />
        <StatCard label="Google" value={stats.googleUsers} sub={`${stats.totalUsers - stats.googleUsers} email`} />
        <StatCard
          label="Revenue"
          value={formatCurrency(stats.totalRevenueTracked, currency)}
          color="text-green-700"
        />
      </div>
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-6">
        <StatCard label="Sessions" value={stats.totalSessions} color="text-blue-600" sub="all users" />
        <StatCard label="Gear Spend" value={formatCurrency(stats.totalGearSpend, currency)} color="text-purple-600" sub="all gear" />
        <StatCard label="Travel" value={formatCurrency(stats.totalTravelSpend, currency)} color="text-orange-600" sub="all travel" />
      </div>

      {/* Broadcast Email Panel */}
      <div className="mb-6 bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden">
        <button
          onClick={() => { setBroadcastOpen((o) => !o); setBroadcastResult(null); }}
          className="w-full flex items-center justify-between px-5 py-4 hover:bg-gray-50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-green-50 border border-green-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div className="text-left">
              <p className="text-sm font-semibold text-gray-900">Broadcast Email</p>
              <p className="text-xs text-gray-400">Send a one-time email to users</p>
            </div>
          </div>
          <svg className={`w-4 h-4 text-gray-400 transition-transform ${broadcastOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {broadcastOpen && (
          <div className="border-t border-gray-100 px-5 py-5 bg-gray-50">
            {/* Template picker */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Choose a template</p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-5">
              {[
                {
                  id: 'tournament_reminder',
                  icon: '🏆',
                  title: 'Tournament reminder',
                  desc: '"Got a tournament coming up? Log it now." Good for all users.',
                },
                {
                  id: 'first_entry',
                  icon: '🚀',
                  title: 'First entry nudge',
                  desc: '"Your dashboard is empty — start in 2 minutes." Best for inactive users.',
                },
                {
                  id: 'monthly_checkin',
                  icon: '📊',
                  title: 'Monthly check-in',
                  desc: '"How\'s your pickleball going? Check your stats." Good for active users.',
                },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setBroadcastTemplate(t.id)}
                  className={`text-left p-3.5 rounded-xl border-2 transition-all ${
                    broadcastTemplate === t.id
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 bg-white hover:border-gray-300'
                  }`}
                >
                  <span className="text-xl mb-1.5 block">{t.icon}</span>
                  <p className={`text-sm font-semibold mb-0.5 ${broadcastTemplate === t.id ? 'text-green-800' : 'text-gray-800'}`}>{t.title}</p>
                  <p className="text-xs text-gray-500 leading-relaxed">{t.desc}</p>
                </button>
              ))}
            </div>

            {/* Target picker */}
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Target audience</p>
            <div className="flex flex-wrap gap-2 mb-5">
              {[
                { id: 'inactive', label: 'Inactive only', hint: 'No tournaments or sessions logged' },
                { id: 'active',   label: 'Active only',   hint: 'Have at least 1 tournament or session' },
                { id: 'all',      label: 'Everyone',      hint: 'All opted-in users' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setBroadcastTarget(t.id)}
                  title={t.hint}
                  className={`text-sm font-medium px-4 py-2 rounded-xl border-2 transition-all ${
                    broadcastTarget === t.id
                      ? 'border-green-500 bg-green-600 text-white'
                      : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
                  }`}
                >
                  {t.label}
                  {data && (
                    <span className={`ml-1.5 text-xs ${broadcastTarget === t.id ? 'text-green-100' : 'text-gray-400'}`}>
                      (~{broadcastAudienceCount})
                    </span>
                  )}
                </button>
              ))}
            </div>

            {/* Result banner */}
            {broadcastResult && !broadcastResult.error && (
              <div className="mb-4">
                <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-4 py-3">
                  <svg className="w-4 h-4 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <p className="text-sm text-green-800 font-medium flex-1">
                    Sent to <strong>{broadcastResult.sent}</strong> users
                    {broadcastResult.failed > 0 && (
                      <> · <span className="text-red-600 font-bold">{broadcastResult.failed} failed</span></>
                    )}
                    <span className="text-green-600 font-normal"> (of {broadcastResult.total} matched)</span>
                  </p>
                  {broadcastResult.failed > 0 && (
                    <button
                      onClick={() => setShowFailures((v) => !v)}
                      className="text-xs text-red-600 underline font-medium flex-shrink-0"
                    >
                      {showFailures ? 'Hide' : 'Show failures'}
                    </button>
                  )}
                </div>
                {showFailures && broadcastResult.failures?.length > 0 && (
                  <div className="mt-2 border border-red-100 rounded-xl overflow-hidden">
                    <div className="bg-red-50 px-4 py-2 border-b border-red-100">
                      <p className="text-xs font-semibold text-red-700">Failed deliveries — {broadcastResult.failures.length} users</p>
                    </div>
                    <div className="divide-y divide-red-50 max-h-64 overflow-y-auto">
                      {broadcastResult.failures.map((f, i) => (
                        <div key={i} className="px-4 py-2.5 bg-white">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-gray-900">{f.name}</p>
                              <p className="text-xs text-gray-500">{f.email}</p>
                            </div>
                            <p className="text-xs text-red-500 text-right flex-shrink-0 max-w-[55%] leading-relaxed">{f.reason}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {broadcastResult?.error && (
              <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3 mb-4">
                Something went wrong. Please try again.
              </div>
            )}

            {/* Send button */}
            <button
              onClick={() => setBroadcastConfirm(true)}
              disabled={broadcastLoading}
              className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-bold px-5 py-2.5 rounded-xl transition-colors disabled:opacity-50"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send emails
            </button>
          </div>
        )}
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
                className="flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={() => setExpandedId(isExpanded ? null : u._id)}
              >
                {/* Avatar */}
                <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-green-100 text-green-700 font-bold text-sm flex items-center justify-center flex-shrink-0 uppercase">
                  {u.name.charAt(0)}
                </div>

                {/* Name + email + mobile meta */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <p className="text-sm font-semibold text-gray-900 truncate">{u.name}</p>
                    {u.isGoogleUser ? (
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-1.5 py-0.5 rounded-full border border-blue-100 flex-shrink-0">G</span>
                    ) : (
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full border border-gray-200 flex-shrink-0">E</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 truncate">{u.email}</p>
                  {/* Mobile-only sub-row */}
                  <div className="flex items-center gap-3 mt-0.5 sm:hidden">
                    <span className="text-xs text-gray-500">{u.tournamentCount} events</span>
                    <span className={`text-xs font-semibold ${u.totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                      {formatCurrency(u.totalProfit, currency)}
                    </span>
                    <span className={`flex items-center gap-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${st.badge}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {st.label}
                    </span>
                  </div>
                </div>

                {/* Joined — hidden on mobile */}
                <div className="hidden md:block text-xs text-gray-400 flex-shrink-0 w-24 text-right">
                  <p className="text-gray-500 font-medium">Joined</p>
                  <p>{new Date(u.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })}</p>
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
                    {formatCurrency(u.totalProfit, currency)}
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

                {/* Calendar icon */}
                <button
                  onClick={(e) => { e.stopPropagation(); setCalendarUser(u); }}
                  className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-green-600 hover:bg-green-50 transition-colors"
                  title="View calendar"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                </button>

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
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Col 1: Activity */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Activity</p>
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Joined</span>
                          <span className="font-medium text-gray-900">
                            {new Date(u.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: '2-digit' })}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Last active</span>
                          <span className="font-medium text-gray-900">{timeAgo(u.lastActive)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tournaments</span>
                          <span className="font-medium text-gray-900">{u.tournamentCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Categories</span>
                          <span className="font-medium text-gray-900">{u.totalCategories}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Upcoming</span>
                          <span className={`font-medium ${u.upcomingCount > 0 ? 'text-green-600' : 'text-gray-400'}`}>
                            {u.upcomingCount || '—'}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Sessions</p>
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Total logged</span>
                          <span className="font-medium text-blue-600">{u.sessionCount}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Practice</span>
                          <span className="font-medium text-gray-900">{u.sessionTypes?.practice ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Casual</span>
                          <span className="font-medium text-gray-900">{u.sessionTypes?.casual ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Tournament</span>
                          <span className="font-medium text-gray-900">{u.sessionTypes?.tournament ?? 0}</span>
                        </div>
                        {u.avgSessionRating != null && (
                          <div className="flex justify-between">
                            <span>Avg rating</span>
                            <span className="font-medium text-yellow-600">{'★'.repeat(Math.round(u.avgSessionRating))} {u.avgSessionRating}/5</span>
                          </div>
                        )}
                        {u.totalCourtFees > 0 && (
                          <div className="flex justify-between">
                            <span>Court fees</span>
                            <span className="font-medium text-red-500">{formatCurrency(u.totalCourtFees, currency)}</span>
                          </div>
                        )}
                        {u.topSkills?.length > 0 && (
                          <div className="pt-1">
                            <p className="text-gray-400 mb-1">Top skills</p>
                            <div className="flex flex-wrap gap-1">
                              {u.topSkills.map((s, i) => (
                                <span key={i} className="bg-blue-50 text-blue-600 border border-blue-100 text-[10px] px-1.5 py-0.5 rounded">{s}</span>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Col 2: Financials + Expenses */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Financials</p>
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Total earnings</span>
                          <span className="font-medium text-green-600">{formatCurrency(u.totalEarnings, currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Entry fees</span>
                          <span className="font-medium text-red-500">{formatCurrency(u.totalExpenses, currency)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Net profit</span>
                          <span className={`font-bold ${u.totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                            {formatCurrency(u.totalProfit, currency)}
                          </span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Gear Expenses</p>
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Items logged</span>
                          <span className="font-medium text-purple-600">{u.gearExpenseCount ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total spent</span>
                          <span className="font-medium text-purple-600">{formatCurrency(u.totalGearSpend ?? 0, currency)}</span>
                        </div>
                      </div>

                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-3 mb-2">Travel Expenses</p>
                      <div className="space-y-1.5 text-xs text-gray-600">
                        <div className="flex justify-between">
                          <span>Trips logged</span>
                          <span className="font-medium text-orange-600">{u.travelExpenseCount ?? 0}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Total spent</span>
                          <span className="font-medium text-orange-600">{formatCurrency(u.totalTravelSpend ?? 0, currency)}</span>
                        </div>
                        {(u.internationalTripCount ?? 0) > 0 && (
                          <div className="flex justify-between">
                            <span>International</span>
                            <span className="font-medium text-gray-900">{u.internationalTripCount}</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Col 3: Medals + Performance */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Medals</p>
                      <div className="flex flex-wrap gap-1.5 mb-3">
                        <MedalBadge medal="Gold" count={u.medals.Gold} />
                        <MedalBadge medal="Silver" count={u.medals.Silver} />
                        <MedalBadge medal="Bronze" count={u.medals.Bronze} />
                        {!u.medals.Gold && !u.medals.Silver && !u.medals.Bronze && (
                          <span className="text-xs text-gray-400">No medals yet</span>
                        )}
                      </div>

                      {u.topCategory && (
                        <>
                          <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Top Category</p>
                          <span className="text-xs bg-purple-50 text-purple-700 px-2 py-1 rounded-md border border-purple-100 inline-block mb-3">
                            {u.topCategory}
                          </span>
                        </>
                      )}

                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Recent Tournaments</p>
                      {u.recentTournaments.length === 0 ? (
                        <p className="text-xs text-gray-400">No tournaments yet</p>
                      ) : (
                        <div className="space-y-2">
                          {u.recentTournaments.map((t, i) => (
                            <div key={i} className="flex items-center justify-between bg-white rounded-lg px-3 py-1.5 border border-gray-100">
                              <div className="min-w-0">
                                <p className="text-xs font-medium text-gray-900 truncate">{t.name}</p>
                                <p className="text-xs text-gray-400">{t.categoryCount} {t.categoryCount === 1 ? 'cat' : 'cats'}</p>
                              </div>
                              <span className={`text-xs font-semibold flex-shrink-0 ml-2 ${t.profit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                                {t.profit >= 0 ? '+' : ''}{formatCurrency(t.profit, currency)}
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Col 4: Activity chart */}
                    <div>
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Activity (6 months)</p>
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

                  {/* Bottom actions row */}
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-end gap-4 flex-wrap">
                    {/* Delete user */}
                    <button
                      onClick={(e) => { e.stopPropagation(); setDeleteConfirm(u); setDeleteError(''); }}
                      className="flex items-center gap-1.5 text-xs text-red-500 hover:text-red-700 font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 border border-red-100 hover:border-red-200 transition-colors flex-shrink-0"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                      Delete User
                    </button>
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

      {/* Broadcast confirm modal */}
      {broadcastConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Send broadcast email</h3>
                <p className="text-xs text-gray-400">This will send to real users immediately</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 border border-gray-100 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Template</span>
                <span className="font-semibold text-gray-900 capitalize">{broadcastTemplate.replace('_', ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Audience</span>
                <span className="font-semibold text-gray-900 capitalize">{broadcastTarget} (~{broadcastAudienceCount} users)</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-5">Users who have turned off email reminders will be skipped automatically.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setBroadcastConfirm(false)}
                disabled={broadcastLoading}
                className="flex-1 text-sm text-gray-600 font-medium py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleBroadcast}
                disabled={broadcastLoading}
                className="flex-1 text-sm bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {broadcastLoading ? 'Sending...' : 'Send now'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Admin calendar modal */}
      {calendarUser && (
        <AdminUserCalendar
          user={calendarUser}
          onClose={() => setCalendarUser(null)}
        />
      )}

      {/* Delete user confirmation modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-red-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Delete User</h3>
                <p className="text-xs text-gray-400">This action cannot be undone</p>
              </div>
            </div>

            <p className="text-sm text-gray-700 mb-1">
              You are about to permanently delete:
            </p>
            <div className="bg-gray-50 rounded-lg px-3 py-2.5 mb-3 border border-gray-100">
              <p className="text-sm font-semibold text-gray-900">{deleteConfirm.name}</p>
              <p className="text-xs text-gray-400">{deleteConfirm.email}</p>
            </div>
            <p className="text-xs text-gray-500 mb-4">
              All their tournaments, sessions, and data will be permanently deleted.
            </p>

            {deleteError && (
              <p className="text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 mb-3">{deleteError}</p>
            )}

            <div className="flex gap-3">
              <button
                onClick={() => { setDeleteConfirm(null); setDeleteError(''); }}
                disabled={deleteLoading}
                className="flex-1 text-sm text-gray-600 font-medium py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteUser}
                disabled={deleteLoading}
                className="flex-1 text-sm bg-red-600 hover:bg-red-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {deleteLoading ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
