import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { formatCurrency } from '../utils/format';
import useCurrency from '../hooks/useCurrency';
import { deleteAdminUser, broadcastEmail as apiBroadcastEmail } from '../services/api';
import AdminUserCalendar from '../components/AdminUserCalendar';
import PaddleLoader from '../components/PaddleLoader';

const ADMIN_EMAILS = (import.meta.env.VITE_ADMIN_EMAIL || '')
  .split(',').map((e) => e.trim().toLowerCase()).filter(Boolean);

const STATUS_STYLES = {
  active:   { dot: 'bg-green-500',  badge: 'bg-green-50 text-green-700',  label: 'Active' },
  recent:   { dot: 'bg-yellow-400', badge: 'bg-yellow-50 text-yellow-700', label: 'Recent' },
  inactive: { dot: 'bg-gray-300',   badge: 'bg-gray-100 text-gray-500',    label: 'Inactive' },
};

const PRIORITY_STYLES = {
  high: 'bg-red-50 text-red-700 border-red-200',
  medium: 'bg-amber-50 text-amber-700 border-amber-200',
  low: 'bg-blue-50 text-blue-700 border-blue-200',
};

const STORY_STATUS_STYLES = {
  open: 'bg-slate-100 text-slate-700 border-slate-200',
  'in-progress': 'bg-indigo-50 text-indigo-700 border-indigo-200',
  done: 'bg-emerald-50 text-emerald-700 border-emerald-200',
};

const STORY_TYPE_STYLES = {
  development: 'bg-cyan-50 text-cyan-700 border-cyan-200',
  marketing: 'bg-pink-50 text-pink-700 border-pink-200',
  product: 'bg-violet-50 text-violet-700 border-violet-200',
  design: 'bg-fuchsia-50 text-fuchsia-700 border-fuchsia-200',
  operations: 'bg-teal-50 text-teal-700 border-teal-200',
  other: 'bg-gray-100 text-gray-700 border-gray-300',
};

const AUTOMATION_ROWS = [
  {
    type: 'Email',
    badge: 'Reminder',
    badgeColor: 'bg-blue-50 text-blue-700 border-blue-200',
    trigger: 'Daily · ~08:00 user local time',
    purpose: 'Tournament reminder — upcoming events within the next few days',
    job: 'morningEmailJobs',
    channel: 'Resend',
  },
  {
    type: 'Email',
    badge: 'Nudge',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    trigger: 'Daily · ~08:00 user local time',
    purpose: 'Result nudge — prompts user to fill in medals/results for past events',
    job: 'morningEmailJobs',
    channel: 'Resend',
  },
  {
    type: 'Email',
    badge: 'Nudge',
    badgeColor: 'bg-amber-50 text-amber-700 border-amber-200',
    trigger: 'Daily · 10:00 IST',
    purpose: 'Inactive user nudge — re-engages users with no activity in 3 or 7 days',
    job: 'inactiveUserNudge',
    channel: 'Resend',
  },
  {
    type: 'Email',
    badge: 'Digest',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    trigger: 'Every Monday · 08:00 IST',
    purpose: 'Weekly summary — activity recap and net P&L for the past 7 days',
    job: 'weeklySummary',
    channel: 'Resend',
  },
  {
    type: 'Email',
    badge: 'Digest',
    badgeColor: 'bg-violet-50 text-violet-700 border-violet-200',
    trigger: '1st of month · 08:00 IST',
    purpose: 'Monthly P&L report — full financial summary for the previous month',
    job: 'monthlyPnl',
    channel: 'Resend',
  },
  {
    type: 'Push',
    badge: 'Notification',
    badgeColor: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    trigger: 'Daily · 19:00 & 23:30 user local time',
    purpose: 'Evening engagement — reminder for subscribed PWA devices',
    job: 'pushReminder',
    channel: 'Web Push',
  },
];

const PRODUCT_CONTEXT_ITEMS = [
  {
    key: 'technical',
    title: 'Technical Context',
    tag: 'Tech',
    content:
      'PickleTracker is a full-stack web app with a React + Vite frontend and a Node.js + Express + MongoDB backend. It supports JWT auth, PWA install mode, push notifications, email reminders, and admin analytics. Core domains include tournaments, sessions, expenses, player cards, friendships, notifications, and admin stories.',
  },
  {
    key: 'libraries',
    title: 'Core Libraries Used',
    tag: 'Libraries',
    content:
      'Frontend libraries: React, React Router, Axios, Tailwind CSS, Recharts, React Calendar, @react-google-maps/api, PostHog, Firebase SDK, @sentry/react, socket.io-client, and vite-plugin-pwa. Backend libraries: Express, Mongoose, Joi, jsonwebtoken, bcrypt, node-cron, web-push, Resend, Twilio, OpenAI SDK, multer, pdf-parse, xlsx, firebase-admin, @sentry/node, and socket.io.',
  },
  {
    key: 'devtooling',
    title: 'Development Tooling & Quality',
    tag: 'Dev',
    content:
      'Build and dev workflow uses Vite (frontend) and Nodemon (backend). Styling pipeline uses PostCSS + Autoprefixer + Tailwind. Testing uses Jest, Supertest, and mongodb-memory-server for isolated backend tests. Deployment targets Vercel (frontend) with API backend, and PWA/service worker generation is handled via vite-plugin-pwa.',
  },
  {
    key: 'purpose',
    title: 'Purpose of the Application',
    tag: 'Purpose',
    content:
      'The app helps pickleball players track performance and finances in one place: tournaments, sessions, medal history, travel/gear costs, and reminders. It removes scattered notes/spreadsheets and gives players a single source of truth for progress and spending.',
  },
  {
    key: 'customer',
    title: 'Ideal Customer Profile',
    tag: 'ICP',
    content:
      'Primary users are active pickleball players (casual to competitive) who play multiple events/sessions per month and want better visibility on results and expenses. Secondary users include growth-focused players who want reminders, consistency, and accountability.',
  },
  {
    key: 'outcome',
    title: 'Core Outcomes We Optimize For',
    tag: 'Outcome',
    content:
      '1) Make logging fast on mobile. 2) Keep reminders useful without spam. 3) Help users understand true P&L. 4) Improve retention through streak-like habit loops (calendar, nudges, summary views). 5) Reduce confusion with clear UI actions.',
  },
];

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

  // Per-user selection for targeted email
  const [selectedUserIds, setSelectedUserIds] = useState(new Set());
  const [selectionTemplate, setSelectionTemplate] = useState('retention');
  const [selectionConfirm, setSelectionConfirm] = useState(false);
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [selectionResult, setSelectionResult] = useState(null);
  const [ideasOpen, setIdeasOpen] = useState(false);
  const [ideasTab, setIdeasTab] = useState('stories');
  const [stories, setStories] = useState([]);
  const [storiesLoading, setStoriesLoading] = useState(false);
  const [storyError, setStoryError] = useState('');
  const [storyTitle, setStoryTitle] = useState('');
  const [storyDescription, setStoryDescription] = useState('');
  const [storyPriority, setStoryPriority] = useState('medium');
  const [storyPriorityFilter, setStoryPriorityFilter] = useState('all');
  const [storyTypeTab, setStoryTypeTab] = useState('development');
  const [storySaving, setStorySaving] = useState(false);
  const [storyDeletingId, setStoryDeletingId] = useState('');
  const [contextOpenKey, setContextOpenKey] = useState('technical');

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

  const toggleUserSelect = (id, e) => {
    e.stopPropagation();
    setSelectedUserIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    setSelectionResult(null);
  };

  const handleSelectionSend = async () => {
    setSelectionLoading(true);
    setSelectionResult(null);
    try {
      const res = await apiBroadcastEmail(selectionTemplate, null, [...selectedUserIds]);
      setSelectionResult(res.data);
      setSelectionConfirm(false);
    } catch {
      setSelectionResult({ error: true });
    } finally {
      setSelectionLoading(false);
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

  const loadStories = async () => {
    setStoriesLoading(true);
    setStoryError('');
    try {
      const res = await api.getAdminStories();
      setStories(res?.data?.data || []);
    } catch {
      setStoryError('Could not load admin stories right now.');
    } finally {
      setStoriesLoading(false);
    }
  };

  const openIdeasHub = async () => {
    setIdeasOpen(true);
    setIdeasTab('stories');
    setContextOpenKey('technical');
    setStoryTypeTab('development');
    await loadStories();
  };

  const handleCreateStory = async (e) => {
    e.preventDefault();
    const cleanTitle = storyTitle.trim();
    if (!cleanTitle) {
      setStoryError('Story title is required.');
      return;
    }
    setStorySaving(true);
    setStoryError('');
    try {
      const res = await api.createAdminStory({
        title: cleanTitle,
        description: storyDescription.trim(),
        priority: storyPriority,
        storyType: storyTypeTab,
      });
      if (res?.data?.data) {
        setStories((prev) => [res.data.data, ...prev]);
      }
      setStoryTitle('');
      setStoryDescription('');
      setStoryPriority('medium');
    } catch (err) {
      setStoryError(err?.response?.data?.message || 'Could not create story. Please try again.');
    } finally {
      setStorySaving(false);
    }
  };

  const handleUpdateStoryStatus = async (storyId, status) => {
    try {
      const res = await api.updateAdminStory(storyId, { status });
      const updated = res?.data?.data;
      if (!updated) return;
      setStories((prev) => prev.map((s) => (s._id === storyId ? updated : s)));
    } catch {
      setStoryError('Could not update story status.');
    }
  };

  const handleDeleteStory = async (story) => {
    if (!story?._id) return;
    const confirmed = window.confirm(`Delete story "${story.title}"? This cannot be undone.`);
    if (!confirmed) return;
    setStoryDeletingId(story._id);
    setStoryError('');
    try {
      await api.deleteAdminStory(story._id);
      setStories((prev) => prev.filter((s) => s._id !== story._id));
    } catch (err) {
      setStoryError(err?.response?.data?.message || 'Could not delete story.');
    } finally {
      setStoryDeletingId('');
    }
  };

  const filteredStories = useMemo(() => {
    const byType = stories.filter((s) => (s.storyType || 'development') === storyTypeTab);
    if (storyPriorityFilter === 'all') return byType;
    return byType.filter((s) => s.priority === storyPriorityFilter);
  }, [stories, storyPriorityFilter, storyTypeTab]);

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
      <div className="py-24"><PaddleLoader label="Loading admin panel..." /></div>
    );
  }

  if (error) {
    return <div className="text-center py-24 text-red-500 text-sm">{error}</div>;
  }

  const { stats } = data;

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      {/* Header */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900">Admin Panel</h1>
          <p className="text-sm text-gray-400 mt-1">User analytics and activity overview</p>
        </div>
        <button
          onClick={openIdeasHub}
          className="inline-flex items-center justify-center gap-2 bg-gray-900 hover:bg-gray-800 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors w-full sm:w-auto"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Ideas Hub
        </button>
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
      <div className="grid grid-cols-3 gap-2 sm:gap-3 mb-3">
        <StatCard label="Sessions" value={stats.totalSessions} color="text-blue-600" sub="all users" />
        <StatCard label="Gear Spend" value={formatCurrency(stats.totalGearSpend, currency)} color="text-purple-600" sub="all gear" />
        <StatCard label="Travel" value={formatCurrency(stats.totalTravelSpend, currency)} color="text-orange-600" sub="all travel" />
      </div>

      {/* Platform breakdown */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 mb-6">
        <StatCard label="PWA / App" value={stats.pwaUsers ?? 0} color="text-green-600" sub="installed" />
        <StatCard label="Mobile Web" value={stats.mobileWebUsers ?? 0} color="text-sky-600" sub="browser" />
        <StatCard label="Desktop" value={stats.desktopUsers ?? 0} color="text-indigo-600" sub="web" />
        <StatCard label="Push Notifs" value={stats.pushSubscribers ?? 0} color="text-amber-600" sub="subscribed" />
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
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-5">
              {[
                {
                  id: 'retention',
                  icon: '💸',
                  title: 'Retention — financial hook',
                  desc: '"Do you actually make money playing pickleball?" Best for inactive signups.',
                },
                {
                  id: 'first_entry',
                  icon: '🚀',
                  title: 'First entry nudge',
                  desc: '"Your dashboard is empty — start in 2 minutes." Best for inactive users.',
                },
                {
                  id: 'tournament_reminder',
                  icon: '🏆',
                  title: 'Tournament reminder',
                  desc: '"Got a tournament coming up? Log it now." Good for all users.',
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
        {selectedUserIds.size > 0 && (
          <button
            onClick={() => { setSelectedUserIds(new Set()); setSelectionResult(null); }}
            className="ml-3 text-green-600 underline font-medium"
          >
            Clear {selectedUserIds.size} selected
          </button>
        )}
      </p>

      {/* Selection action bar */}
      {selectedUserIds.size > 0 && (
        <div className="mb-4 bg-green-900 rounded-2xl px-4 py-3 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <span className="w-6 h-6 rounded-full bg-green-600 text-white text-xs font-bold flex items-center justify-center flex-shrink-0">
              {selectedUserIds.size}
            </span>
            <span className="text-sm font-semibold text-white">
              {selectedUserIds.size === 1 ? '1 user selected' : `${selectedUserIds.size} users selected`}
            </span>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={selectionTemplate}
              onChange={(e) => setSelectionTemplate(e.target.value)}
              className="text-sm border border-green-700 bg-green-800 text-white rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-green-400"
            >
              <option value="retention">Retention — financial hook</option>
              <option value="first_entry">First entry nudge</option>
              <option value="tournament_reminder">Tournament reminder</option>
              <option value="monthly_checkin">Monthly check-in</option>
            </select>
            <button
              onClick={() => setSelectionConfirm(true)}
              disabled={selectionLoading}
              className="inline-flex items-center gap-1.5 bg-white text-green-900 text-sm font-bold px-4 py-1.5 rounded-lg hover:bg-green-50 transition-colors disabled:opacity-50"
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              Send email
            </button>
          </div>
          {selectionResult && !selectionResult.error && (
            <p className="text-xs text-green-300 font-medium">
              Sent to {selectionResult.sent}/{selectionResult.total}
              {selectionResult.failed > 0 && ` · ${selectionResult.failed} failed`}
            </p>
          )}
          {selectionResult?.error && (
            <p className="text-xs text-red-300">Something went wrong. Try again.</p>
          )}
        </div>
      )}

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
                className={`flex items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 cursor-pointer transition-colors ${selectedUserIds.has(u._id) ? 'bg-green-50' : 'hover:bg-gray-50'}`}
                onClick={() => setExpandedId(isExpanded ? null : u._id)}
              >
                {/* Selection checkbox */}
                <input
                  type="checkbox"
                  checked={selectedUserIds.has(u._id)}
                  onChange={(e) => toggleUserSelect(u._id, e)}
                  onClick={(e) => e.stopPropagation()}
                  className="w-4 h-4 rounded border-gray-300 text-green-600 focus:ring-green-500 flex-shrink-0 cursor-pointer"
                />

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
                    {u.lastSeenPlatform === 'pwa' && (
                      <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full border border-green-200 flex-shrink-0">App</span>
                    )}
                    {u.lastSeenPlatform === 'mobile-web' && (
                      <span className="text-[10px] bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded-full border border-sky-200 flex-shrink-0">Mobile</span>
                    )}
                    {u.lastSeenPlatform === 'desktop-web' && (
                      <span className="text-[10px] bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded-full border border-indigo-200 flex-shrink-0">Desktop</span>
                    )}
                    {u.hasPushSubscription && (
                      <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200 flex-shrink-0">🔔 Push</span>
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
                        <div className="flex justify-between items-start">
                          <span>Platform</span>
                          <div className="flex flex-wrap gap-1 justify-end">
                            {u.platformsUsed?.length > 0 ? u.platformsUsed.map((p) => (
                              <span key={p} className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full border ${
                                p === 'pwa' ? 'bg-green-50 text-green-700 border-green-200' :
                                p === 'mobile-web' ? 'bg-sky-50 text-sky-700 border-sky-200' :
                                'bg-indigo-50 text-indigo-700 border-indigo-200'
                              }`}>
                                {p === 'pwa' ? 'App' : p === 'mobile-web' ? 'Mobile' : 'Desktop'}
                              </span>
                            )) : <span className="text-gray-400">—</span>}
                          </div>
                        </div>
                        <div className="flex justify-between items-center">
                          <span>Push notifications</span>
                          {u.hasPushSubscription
                            ? <span className="text-[10px] font-semibold px-1.5 py-0.5 rounded-full border bg-amber-50 text-amber-700 border-amber-200">🔔 Subscribed</span>
                            : <span className="text-gray-400">—</span>
                          }
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

      {/* Ideas hub modal */}
      {ideasOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white w-full max-w-4xl rounded-2xl shadow-2xl border border-gray-200 max-h-[90vh] flex flex-col overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-gray-900">Admin Ideas Hub</h3>
                <p className="text-xs text-gray-500 mt-0.5">Capture stories and keep reminder timings handy in one place.</p>
              </div>
              <button
                onClick={() => setIdeasOpen(false)}
                className="text-sm text-gray-500 hover:text-gray-700 px-2 py-1 rounded-md hover:bg-gray-100"
              >
                Close
              </button>
            </div>

            <div className="px-5 pt-4">
              <div className="inline-flex bg-gray-100 p-1 rounded-xl gap-1">
                <button
                  onClick={() => setIdeasTab('stories')}
                  className={`text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    ideasTab === 'stories' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Stories
                </button>
                <button
                  onClick={() => setIdeasTab('automations')}
                  className={`text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    ideasTab === 'automations' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Reminder & Notification Table
                </button>
                <button
                  onClick={() => setIdeasTab('context')}
                  className={`text-xs sm:text-sm font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                    ideasTab === 'context' ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                  }`}
                >
                  Product Context
                </button>
              </div>
            </div>

            <div className="p-5 overflow-y-auto">
              {ideasTab === 'stories' && (
                <div className="space-y-4">
                  <form onSubmit={handleCreateStory} className="bg-gray-50 border border-gray-100 rounded-xl p-4">
                    <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Create Story</p>
                    <div className="mb-3 inline-flex bg-white border border-gray-200 p-1 rounded-xl gap-1">
                      <button
                        type="button"
                        onClick={() => setStoryTypeTab('development')}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          storyTypeTab === 'development' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Development stories
                      </button>
                      <button
                        type="button"
                        onClick={() => setStoryTypeTab('marketing')}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg transition-colors ${
                          storyTypeTab === 'marketing' ? 'bg-gray-900 text-white' : 'text-gray-600 hover:text-gray-900'
                        }`}
                      >
                        Marketing stories
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <input
                        type="text"
                        placeholder="Story title (required)"
                        value={storyTitle}
                        onChange={(e) => setStoryTitle(e.target.value)}
                        className="sm:col-span-2 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                        maxLength={160}
                      />
                      <select
                        value={storyPriority}
                        onChange={(e) => setStoryPriority(e.target.value)}
                        className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                      >
                        <option value="low">Low priority</option>
                        <option value="medium">Medium priority</option>
                        <option value="high">High priority</option>
                      </select>
                    </div>
                    <p className="mt-2 text-xs text-gray-500">
                      New story will be added to <span className="font-semibold text-gray-700">{storyTypeTab === 'development' ? 'Development stories' : 'Marketing stories'}</span>.
                    </p>
                    <textarea
                      value={storyDescription}
                      onChange={(e) => setStoryDescription(e.target.value)}
                      rows={3}
                      maxLength={1500}
                      placeholder="Optional context from WhatsApp discussion..."
                      className="mt-3 w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                    {storyError && (
                      <p className="mt-2 text-xs text-red-600">{storyError}</p>
                    )}
                    <div className="mt-3 flex justify-end">
                      <button
                        type="submit"
                        disabled={storySaving}
                        className="bg-green-600 hover:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg disabled:opacity-60 transition-colors"
                      >
                        {storySaving ? 'Saving...' : 'Add Story'}
                      </button>
                    </div>
                  </form>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">All Stories</p>
                      <div className="flex items-center gap-2">
                        <select
                          value={storyPriorityFilter}
                          onChange={(e) => setStoryPriorityFilter(e.target.value)}
                          className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                        >
                          <option value="all">All priorities</option>
                          <option value="high">High</option>
                          <option value="medium">Medium</option>
                          <option value="low">Low</option>
                        </select>
                        <button
                          onClick={loadStories}
                          className="text-xs text-green-700 hover:text-green-800 font-medium"
                        >
                          Refresh
                        </button>
                      </div>
                    </div>
                    {storiesLoading ? (
                      <p className="text-sm text-gray-400 py-6 text-center">Loading stories...</p>
                    ) : filteredStories.length === 0 ? (
                      <p className="text-sm text-gray-400 py-6 text-center border border-dashed border-gray-200 rounded-xl">No stories match this priority filter.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredStories.map((story) => (
                          <div key={story._id} className="border border-gray-100 rounded-xl p-3 bg-white">
                            <div className="flex flex-wrap items-start justify-between gap-2">
                              <div className="min-w-0">
                                <p className="text-sm font-semibold text-gray-900 break-words">{story.title}</p>
                                {story.description && (
                                  <p className="text-xs text-gray-600 mt-1 break-words">{story.description}</p>
                                )}
                              </div>
                              <div className="flex items-center gap-1.5">
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STORY_TYPE_STYLES[story.storyType] || STORY_TYPE_STYLES.other}`}>
                                  {story.storyType || 'other'}
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${PRIORITY_STYLES[story.priority] || PRIORITY_STYLES.medium}`}>
                                  {story.priority}
                                </span>
                                <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STORY_STATUS_STYLES[story.status] || STORY_STATUS_STYLES.open}`}>
                                  {story.status}
                                </span>
                              </div>
                            </div>
                            <div className="mt-2 flex items-center justify-between gap-2">
                              <p className="text-[11px] text-gray-400">
                                By {story.createdBy?.name || story.createdBy?.email || 'Admin'} · {timeAgo(story.createdAt)}
                              </p>
                              <div className="flex items-center gap-2">
                                <select
                                  value={story.status}
                                  onChange={(e) => handleUpdateStoryStatus(story._id, e.target.value)}
                                  className="text-xs border border-gray-200 rounded-lg px-2 py-1 bg-white focus:outline-none focus:ring-2 focus:ring-green-500"
                                >
                                  <option value="open">Open</option>
                                  <option value="in-progress">In Progress</option>
                                  <option value="done">Done</option>
                                </select>
                                <button
                                  onClick={() => handleDeleteStory(story)}
                                  disabled={storyDeletingId === story._id}
                                  className="text-xs border border-red-200 bg-red-50 text-red-600 hover:bg-red-100 rounded-lg px-2 py-1 font-medium disabled:opacity-60"
                                >
                                  {storyDeletingId === story._id ? 'Deleting...' : 'Delete'}
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {ideasTab === 'automations' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    All active automated jobs — {AUTOMATION_ROWS.length} configured. Times marked "user local" fire per-user timezone; others are fixed IST.
                  </p>
                  <div className="overflow-x-auto border border-gray-200 rounded-xl">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Channel</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Kind</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Trigger</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Purpose</th>
                          <th className="text-left px-4 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Job file</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 bg-white">
                        {AUTOMATION_ROWS.map((row) => (
                          <tr key={`${row.job}-${row.badge}`} className="hover:bg-gray-50/60">
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`inline-flex items-center gap-1 text-xs font-semibold px-2 py-0.5 rounded-full border ${row.type === 'Push' ? 'bg-teal-50 text-teal-700 border-teal-200' : 'bg-sky-50 text-sky-700 border-sky-200'}`}>
                                {row.type === 'Push' ? '📲' : '✉️'} {row.channel}
                              </span>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${row.badgeColor}`}>
                                {row.badge}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{row.trigger}</td>
                            <td className="px-4 py-3 text-xs text-gray-700">{row.purpose}</td>
                            <td className="px-4 py-3 whitespace-nowrap">
                              <code className="text-[11px] bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded font-mono">{row.job}</code>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {ideasTab === 'context' && (
                <div className="space-y-3">
                  <p className="text-sm text-gray-600">
                    Expand any section below while creating stories to keep technical direction and business intent aligned.
                  </p>
                  <div className="space-y-2">
                    {PRODUCT_CONTEXT_ITEMS.map((item) => {
                      const isOpen = contextOpenKey === item.key;
                      return (
                        <div key={item.key} className="border border-gray-200 rounded-xl overflow-hidden bg-white">
                          <button
                            onClick={() => setContextOpenKey(isOpen ? '' : item.key)}
                            className="w-full px-4 py-3 flex items-center justify-between text-left hover:bg-gray-50 transition-colors"
                          >
                            <div className="flex items-center gap-2">
                              <span className="text-sm font-semibold text-gray-900">{item.title}</span>
                              <span className="text-[10px] font-semibold uppercase tracking-wide bg-gray-100 text-gray-600 border border-gray-200 rounded-full px-2 py-0.5">
                                {item.tag}
                              </span>
                            </div>
                            <svg
                              className={`w-4 h-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
                              fill="none"
                              viewBox="0 0 24 24"
                              stroke="currentColor"
                              strokeWidth={2}
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                          {isOpen && (
                            <div className="px-4 pb-4">
                              <p className="text-sm text-gray-700 leading-relaxed">{item.content}</p>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

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

      {/* Selection send confirm modal */}
      {selectionConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-4" style={{ backgroundColor: 'rgba(0,0,0,0.45)' }}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-full bg-green-50 flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
              </div>
              <div>
                <h3 className="text-sm font-bold text-gray-900">Send email to selected users</h3>
                <p className="text-xs text-gray-400">This will send to real users immediately</p>
              </div>
            </div>
            <div className="bg-gray-50 rounded-xl px-4 py-3 mb-4 border border-gray-100 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">Template</span>
                <span className="font-semibold text-gray-900 capitalize">{selectionTemplate.replace(/_/g, ' ')}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Recipients</span>
                <span className="font-semibold text-gray-900">{selectedUserIds.size} selected users</span>
              </div>
            </div>
            <p className="text-xs text-gray-500 mb-5">Users who have turned off email reminders will be skipped automatically.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setSelectionConfirm(false)}
                disabled={selectionLoading}
                className="flex-1 text-sm text-gray-600 font-medium py-2.5 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                onClick={handleSelectionSend}
                disabled={selectionLoading}
                className="flex-1 text-sm bg-green-600 hover:bg-green-700 text-white font-bold py-2.5 rounded-xl transition-colors disabled:opacity-60"
              >
                {selectionLoading ? 'Sending...' : 'Send now'}
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
