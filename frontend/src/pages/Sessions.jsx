import { useEffect, useState, useMemo } from 'react';
import * as api from '../services/api';
import SessionForm from '../components/SessionForm';
import Modal from '../components/Modal';

const TYPE_LABELS = { tournament: 'Tournament', casual: 'Casual Play', practice: 'Drill' };
const TYPE_COLORS = {
  tournament: 'bg-purple-100 text-purple-700',
  casual:     'bg-blue-50 text-blue-700',
  practice:   'bg-[#91BE4D]/15 text-[#4a6e10]',
};
const TYPE_ICONS = { tournament: '🏆', casual: '🎾', practice: '🎯' };
const RATING_EMOJI = { 1: '😫', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' };
const RATING_LABEL = { 1: 'Rough', 2: 'Poor', 3: 'Okay', 4: 'Good', 5: 'On fire!' };

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });
}

function tagFrequency(sessions, field) {
  const counts = {};
  sessions.forEach((s) => {
    (s[field] || []).forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; });
  });
  return Object.entries(counts).sort((a, b) => b[1] - a[1]);
}

export default function Sessions() {
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [modalOpen, setModalOpen] = useState(false);
  const [editSession, setEditSession] = useState(null);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');
  const [deleteId, setDeleteId] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [filterType, setFilterType] = useState('all');

  const fetchSessions = async () => {
    try {
      const res = await api.getSessions();
      setSessions(res.data.data);
    } catch {
      setError('Failed to load sessions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchSessions(); }, []);

  // ── Insights (client-side) ──────────────────────────────────────────────────
  const insights = useMemo(() => {
    if (sessions.length < 2) return null;

    const weaknesses = tagFrequency(sessions, 'wentWrong').slice(0, 3);
    const strengths  = tagFrequency(sessions, 'wentWell').slice(0, 3);

    const recent7 = sessions.filter((s) => {
      const d = new Date(s.date + 'T00:00:00');
      const diff = (Date.now() - d.getTime()) / 86400000;
      return diff <= 7;
    });
    const avgRating =
      recent7.length > 0
        ? (recent7.reduce((s, x) => s + x.rating, 0) / recent7.length).toFixed(1)
        : null;

    // Improvement detection: was in top weakness early, absent in last 3
    const last3Wrong = new Set(sessions.slice(0, 3).flatMap((s) => s.wentWrong));
    const improving = weaknesses
      .filter(([tag]) => !last3Wrong.has(tag))
      .map(([tag]) => tag)
      .slice(0, 2);

    return { weaknesses, strengths, avgRating, sessionsThisWeek: recent7.length, improving };
  }, [sessions]);

  // ── Filtered list ──────────────────────────────────────────────────────────
  const filtered = useMemo(() => {
    if (filterType === 'all') return sessions;
    return sessions.filter((s) => s.type === filterType);
  }, [sessions, filterType]);

  // ── Handlers ──────────────────────────────────────────────────────────────
  const openAdd = () => { setEditSession(null); setFormError(''); setModalOpen(true); };
  const openEdit = (s) => { setEditSession(s); setFormError(''); setModalOpen(true); };
  const closeModal = () => { setModalOpen(false); setEditSession(null); setFormError(''); };

  const handleSave = async (data) => {
    setFormLoading(true);
    setFormError('');
    try {
      if (editSession) {
        await api.updateSession(editSession._id, data);
      } else {
        await api.createSession(data);
      }
      closeModal();
      fetchSessions();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to save session');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    setDeleteLoading(true);
    try {
      await api.deleteSession(id);
      setDeleteId(null);
      fetchSessions();
    } catch {
      setError('Failed to delete session');
    } finally {
      setDeleteLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-24 px-4">
        <div className="inline-flex flex-col items-center gap-3">
          <svg className="animate-spin w-8 h-8 text-[#91BE4D]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-gray-400 text-sm">Loading journal…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">

      {/* Hero Banner */}
      <div
        className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-6 flex items-center justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        <div className="relative">
          <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-1">PickleTracker</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">Performance Journal</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Track every session. Spot every pattern.</p>
        </div>
        <button
          onClick={openAdd}
          className="relative flex-shrink-0 hover:opacity-90 text-white font-bold px-4 py-2.5 rounded-xl text-sm tracking-wide transition-opacity shadow-lg"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          + Log Session
        </button>
      </div>

      {error && (
        <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{error}</div>
      )}

      {/* ── Insights panel ─────────────────────────────────────────────────── */}
      {insights && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">

          {/* Recurring weaknesses */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">⚠️</span>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Recurring Weaknesses</p>
            </div>
            {insights.weaknesses.length > 0 ? (
              <ul className="space-y-1.5">
                {insights.weaknesses.map(([tag, count]) => (
                  <li key={tag} className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 font-medium">{tag}</span>
                    <span className="text-xs text-orange-500 font-bold">{count}×</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">No patterns yet</p>
            )}
          </div>

          {/* Strengths */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">💪</span>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Top Strengths</p>
            </div>
            {insights.strengths.length > 0 ? (
              <ul className="space-y-1.5">
                {insights.strengths.map(([tag, count]) => (
                  <li key={tag} className="flex items-center justify-between">
                    <span className="text-xs text-gray-700 font-medium">{tag}</span>
                    <span className="text-xs text-[#4a6e10] font-bold">{count}×</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-gray-400">Log more sessions</p>
            )}
          </div>

          {/* This week */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base">📅</span>
              <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">This Week</p>
            </div>
            <div className="space-y-2">
              <div className="flex items-baseline gap-1">
                <span className="text-2xl font-black" style={{ background: 'linear-gradient(to right, #2d7005, #ec9937)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', backgroundClip: 'text' }}>
                  {insights.sessionsThisWeek}
                </span>
                <span className="text-xs text-gray-500">sessions</span>
              </div>
              {insights.avgRating && (
                <div className="flex items-center gap-1.5">
                  <span className="text-lg">{RATING_EMOJI[Math.round(insights.avgRating)]}</span>
                  <span className="text-xs text-gray-600 font-medium">avg {insights.avgRating}/5</span>
                </div>
              )}
              {insights.improving.length > 0 && (
                <div className="mt-2">
                  <p className="text-[10px] text-gray-400 uppercase tracking-wide font-semibold mb-1">Improving</p>
                  {insights.improving.map((tag) => (
                    <span key={tag} className="inline-block text-[10px] bg-[#91BE4D]/15 text-[#4a6e10] rounded-full px-2 py-0.5 mr-1 font-semibold">
                      ↑ {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

        </div>
      )}

      {/* Focus suggestion */}
      {insights?.weaknesses?.[0] && (
        <div className="mb-6 rounded-xl px-4 py-3 border flex items-start gap-3"
          style={{ background: 'linear-gradient(to right, #f0f8e8, #fff8ec)', borderColor: '#d4e8b0' }}>
          <span className="text-lg flex-shrink-0">🎯</span>
          <div>
            <p className="text-sm font-bold text-[#2d5a05]">Focus this week</p>
            <p className="text-xs text-[#4a7010] mt-0.5">
              <span className="font-semibold">{insights.weaknesses[0][0]}</span> has come up as a weakness{' '}
              {insights.weaknesses[0][1]}× across your sessions. Drill it this week.
            </p>
          </div>
        </div>
      )}

      {/* ── Filter tabs ─────────────────────────────────────────────────────── */}
      {sessions.length > 0 && (
        <div className="flex gap-2 mb-4 flex-wrap">
          {['all', 'casual', 'practice', 'tournament'].map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`text-xs px-3 py-1.5 rounded-full font-semibold border transition-colors ${
                filterType === t
                  ? 'text-white border-transparent'
                  : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
              }`}
              style={filterType === t ? { background: 'linear-gradient(to right, #2d7005, #ec9937)' } : {}}
            >
              {t === 'all' ? 'All sessions' : `${TYPE_ICONS[t]} ${TYPE_LABELS[t]}`}
            </button>
          ))}
        </div>
      )}

      {/* ── Session list ────────────────────────────────────────────────────── */}
      {sessions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
          <div className="w-20 h-20 rounded-full bg-[#f4f8e8] border-2 border-[#d6e89a] flex items-center justify-center mb-5 text-3xl">
            📓
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">Start your performance journal</h3>
          <p className="text-sm text-gray-400 max-w-xs mb-6">
            Log sessions after you play. The more you log, the clearer your patterns become.
          </p>
          <button
            onClick={openAdd}
            className="hover:opacity-90 text-white font-bold px-6 py-3 rounded-xl text-sm tracking-wide transition-opacity shadow-md"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            Log your first session
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-gray-400 text-sm py-12">No {TYPE_LABELS[filterType].toLowerCase()} sessions logged yet.</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((s) => (
            <div key={s._id} className="bg-white rounded-xl border border-gray-100 shadow-sm p-4 border-l-4 border-l-[#91BE4D]">

              {/* Top row */}
              <div className="flex items-start justify-between gap-2 mb-3">
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full flex-shrink-0 ${TYPE_COLORS[s.type]}`}>
                    {TYPE_ICONS[s.type]} {TYPE_LABELS[s.type]}
                  </span>
                  <span className="text-xs text-gray-400 truncate">{formatDate(s.date)}</span>
                </div>
                <div className="flex items-center gap-1.5 flex-shrink-0">
                  <span className="text-xl">{RATING_EMOJI[s.rating]}</span>
                  <span className="text-xs text-gray-500 font-medium">{RATING_LABEL[s.rating]}</span>
                </div>
              </div>

              {/* Location */}
              {s.location?.name && (
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {s.location.name}
                </p>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1 mb-2">
                {s.wentWell.map((tag) => (
                  <span key={`w-${tag}`} className="text-[10px] bg-[#91BE4D]/15 text-[#4a6e10] px-2 py-0.5 rounded-full font-semibold">
                    ✓ {tag}
                  </span>
                ))}
                {s.wentWrong.map((tag) => (
                  <span key={`b-${tag}`} className="text-[10px] bg-orange-50 text-orange-600 px-2 py-0.5 rounded-full font-semibold border border-orange-100">
                    ✗ {tag}
                  </span>
                ))}
              </div>

              {/* Court fee */}
              {s.courtFee > 0 && (
                <p className="text-xs text-gray-500 flex items-center gap-1 mb-1">
                  <span className="text-gray-400">🏟️ Court fee:</span>
                  <span className="font-semibold text-gray-700">₹{s.courtFee.toLocaleString('en-IN')}</span>
                </p>
              )}

              {/* Notes */}
              {s.notes && (
                <p className="text-xs text-gray-500 italic border-t border-gray-100 pt-2 mt-2 line-clamp-2">{s.notes}</p>
              )}

              {/* Actions */}
              <div className="flex gap-2 pt-2 mt-1 border-t border-gray-50">
                <button
                  onClick={() => openEdit(s)}
                  className="text-xs text-blue-600 hover:text-blue-800 font-medium px-2 py-1 rounded hover:bg-blue-50 transition min-h-[32px]"
                >
                  Edit
                </button>
                {deleteId === s._id ? (
                  <span className="flex items-center gap-2">
                    <button
                      onClick={() => handleDelete(s._id)}
                      disabled={deleteLoading}
                      className="text-xs text-red-600 hover:text-red-800 font-medium px-2 py-1 rounded hover:bg-red-50 transition disabled:opacity-60 min-h-[32px]"
                    >
                      {deleteLoading ? 'Deleting…' : 'Confirm'}
                    </button>
                    <button
                      onClick={() => setDeleteId(null)}
                      className="text-xs text-gray-400 hover:text-gray-600 px-2 py-1 rounded transition min-h-[32px]"
                    >
                      Cancel
                    </button>
                  </span>
                ) : (
                  <button
                    onClick={() => setDeleteId(s._id)}
                    className="text-xs text-red-500 hover:text-red-700 font-medium px-2 py-1 rounded hover:bg-red-50 transition min-h-[32px]"
                  >
                    Delete
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Log / Edit modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={closeModal}
        title={editSession ? 'Edit Session' : 'Log a Session'}
      >
        {formError && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{formError}</div>
        )}
        <SessionForm
          initial={editSession || undefined}
          onSubmit={handleSave}
          onCancel={closeModal}
          loading={formLoading}
        />
      </Modal>
    </div>
  );
}
