import React, { useEffect, useState, useMemo } from 'react';
import posthog from 'posthog-js';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';
import TournamentForm from '../components/TournamentForm';
import SessionForm from '../components/SessionForm';
import TournamentShareModal from '../components/TournamentShareModal';
import BannerMedalStrip from '../components/BannerMedalStrip';
import { formatCurrency, getCurrencySymbol } from '../utils/format';
import useCurrency from '../hooks/useCurrency';
import { getMapUrl } from '../utils/mapUrl';
import { computeMedalTally } from '../utils/medals';
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

// Chip colors per session type
const SESSION_DOT = {
  casual: 'bg-blue-400',
  practice: 'bg-purple-400',
  tournament: 'bg-orange-400',
};
const SESSION_CHIP = {
  casual: 'bg-blue-100 text-blue-700',
  practice: 'bg-purple-100 text-purple-700',
  tournament: 'bg-orange-100 text-orange-700',
};
const SESSION_ICON = { casual: '🎾', practice: '🎯', tournament: '🏆' };
const SESSION_LABEL = { casual: 'Casual', practice: 'Drill', tournament: 'Tournament' };

export default function Calendar() {
  const { user } = useAuth();
  const currency = useCurrency();
  const symbol = getCurrencySymbol(currency);
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [tournaments, setTournaments] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Day popup
  const [dayPopup, setDayPopup] = useState({ open: false, date: null });

  // Tournament detail / edit
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Add tournament modal
  const [addModal, setAddModal] = useState({ open: false, date: null });
  const [addError, setAddError] = useState('');

  // Add session modal
  const [addSessionModal, setAddSessionModal] = useState({ open: false, date: null });
  const [sessionFormLoading, setSessionFormLoading] = useState(false);
  const [sessionFormError, setSessionFormError] = useState('');

  // Floating action button (speed-dial) state
  const [fabOpen, setFabOpen] = useState(false);

  // Share modal
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // Pending tournament notification toast + highlight
  const [pendingToast, setPendingToast] = useState('');
  const [highlightDate, setHighlightDate] = useState('');

  // On mount: if there's a pending tournament from the landing page form,
  // create it first then fetch all data once — avoids a race condition where
  // fetchData() could overwrite the newly created tournament with stale results.
  useEffect(() => {
    const raw = localStorage.getItem('pt_pending_tournament');

    if (!raw) {
      fetchData();
      return;
    }

    localStorage.removeItem('pt_pending_tournament');
    let data;
    try { data = JSON.parse(raw); } catch { fetchData(); return; }

    api.createTournament(data)
      .then(() => fetchData())
      .then(() => {
        // After data is fresh, navigate to the tournament's month and highlight it
        const dateStr = data.categories?.[0]?.date;
        if (dateStr) {
          const [y, m] = dateStr.split('-').map(Number);
          setViewYear(y);
          setViewMonth(m - 1); // 0-indexed
          setHighlightDate(dateStr);
          setTimeout(() => setHighlightDate(''), 4000);
        }
        setPendingToast(`"${data.name}" saved! You'll get a reminder the day before. 🏆`);
        setTimeout(() => setPendingToast(''), 6000);
      })
      .catch(() => {
        // Tournament save failed — still load the calendar normally
        fetchData();
      });
  }, []);

  const fetchTournaments = async () => {
    const res = await api.getTournaments();
    setTournaments(res.data.data);
  };

  const fetchData = async () => {
    try {
      const [tRes, sRes] = await Promise.all([api.getTournaments(), api.getSessions()]);
      setTournaments(tRes.data.data);
      setSessions(sRes.data.data);
    } catch {
      setError('Failed to load calendar data');
    } finally {
      setLoading(false);
    }
  };

  // { 'YYYY-MM-DD': [{ tournament, category }, ...] }
  const eventsByDate = useMemo(() => {
    const map = {};
    tournaments.forEach((t) => {
      t.categories.forEach((cat) => {
        const d = cat.date ? cat.date.split('T')[0] : null;
        if (!d) return;
        if (!map[d]) map[d] = [];
        // Deduplicate by tournament id so multi-category tournaments appear once per day cell
        if (!map[d].find((ev) => String(ev.tournament._id) === String(t._id))) {
          map[d].push({ tournament: t, category: cat });
        }
      });
    });
    return map;
  }, [tournaments]);

  // { 'YYYY-MM-DD': [session, ...] }
  const sessionsByDate = useMemo(() => {
    const map = {};
    sessions.forEach((s) => {
      if (!s.date) return;
      if (!map[s.date]) map[s.date] = [];
      map[s.date].push(s);
    });
    return map;
  }, [sessions]);

  // Popup tournaments grouped
  const popupByTournament = useMemo(() => {
    if (!dayPopup.date) return [];
    const events = eventsByDate[dayPopup.date] || [];
    const grouped = {};
    events.forEach(({ tournament, category }) => {
      if (!grouped[tournament._id]) grouped[tournament._id] = { tournament, categories: [] };
      grouped[tournament._id].categories.push(category);
    });
    return Object.values(grouped);
  }, [dayPopup.date, eventsByDate]);

  // Month summary stats for the viewed month
  const monthStats = useMemo(() => {
    const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
    const monthSessions = sessions.filter((s) => s.date?.startsWith(monthStr));
    const monthTournaments = tournaments.filter((t) =>
      t.categories.some((cat) => cat.date?.startsWith(monthStr))
    );
    const courtFees = monthSessions.reduce((s, x) => s + (x.courtFee || 0), 0);

    return {
      sessions: monthSessions.length,
      tournaments: monthTournaments.length,
      courtFees,
    };
  }, [sessions, tournaments, viewYear, viewMonth]);

  // Upcoming tournaments grouped by tournament (not flattened per category)
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

  // Upcoming events — next 5 sessions + tournament dates from today
  const upcomingEvents = useMemo(() => {
    const events = [];
    sessions
      .filter((s) => s.date >= todayStr)
      .forEach((s) => events.push({ kind: 'session', date: s.date, data: s }));
    tournaments.forEach((t) => {
      t.categories.forEach((cat) => {
        const d = cat.date ? cat.date.split('T')[0] : null;
        if (d && d >= todayStr) events.push({ kind: 'tournament', date: d, data: { tournament: t, category: cat } });
      });
    });
    return events.sort((a, b) => (a.date < b.date ? -1 : 1)).slice(0, 5);
  }, [sessions, tournaments, todayStr]);

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const medalTally = useMemo(
    () => computeMedalTally(tournaments, user?.manualAchievements),
    [tournaments, user?.manualAchievements]
  );

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };
  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
  };

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };
  const formatShortDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  };
  const formatUpcomingDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const d = new Date(year, month - 1, day);
    const now = new Date(); now.setHours(0, 0, 0, 0);
    const diff = Math.round((d - now) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    if (diff <= 6) return d.toLocaleDateString(undefined, { weekday: 'short' });
    return d.toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
  };

  // ── Tournament CRUD ──
  const handleAddTournament = async (data) => {
    setFormLoading(true);
    setAddError('');
    try {
      await api.createTournament(data);
      posthog.capture('tournament_created', {
        category_count: data.categories?.length ?? 1,
        has_feedback: !!(data.rating || data.wentWell?.length || data.wentWrong?.length || data.notes),
        has_rating: !!data.rating,
        went_well_count: data.wentWell?.length ?? 0,
        went_wrong_count: data.wentWrong?.length ?? 0,
        has_notes: !!(data.notes?.trim()),
      });
      setAddModal({ open: false, date: null });
      await fetchTournaments();
    } catch (err) {
      const msg = err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to add tournament';
      setAddError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditTournament = async (data) => {
    setFormLoading(true);
    setFormError('');
    try {
      await api.updateTournament(selectedTournament._id, data);
      posthog.capture('tournament_edited', {
        has_feedback: !!(data.rating || data.wentWell?.length || data.wentWrong?.length || data.notes),
        has_rating: !!data.rating,
        went_well_count: data.wentWell?.length ?? 0,
        went_wrong_count: data.wentWrong?.length ?? 0,
        has_notes: !!(data.notes?.trim()),
      });
      setIsEditing(false);
      setSelectedTournament(null);
      await fetchTournaments();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update tournament');
    } finally {
      setFormLoading(false);
    }
  };

  // ── Session CRUD ──
  const handleAddSession = async (data) => {
    setSessionFormLoading(true);
    setSessionFormError('');
    try {
      await api.createSession(data);
      posthog.capture('session_logged', {
        type: data.type,
        has_rating: !!data.rating,
        rating: data.rating ?? null,
        went_well_count: data.wentWell?.length ?? 0,
        went_wrong_count: data.wentWrong?.length ?? 0,
        has_notes: !!(data.notes?.trim()),
      });
      setAddSessionModal({ open: false, date: null });
      await fetchData();
    } catch (err) {
      setSessionFormError(err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to add session');
    } finally {
      setSessionFormLoading(false);
    }
  };

  const addInitial = useMemo(() => {
    if (!addModal.date) return undefined;
    return { name: '', location: null, categories: [{ categoryName: '', date: addModal.date, medal: 'None', prizeAmount: '', entryFee: '' }] };
  }, [addModal.date]);

  const sessionAddInitial = useMemo(() => {
    if (!addSessionModal.date) return undefined;
    return { date: addSessionModal.date };
  }, [addSessionModal.date]);

  const openDayPopup = (dateStr) => setDayPopup({ open: true, date: dateStr });
  const closeDayPopup = () => setDayPopup({ open: false, date: null });

  if (loading) return <div className="text-center py-24 text-gray-400">Loading calendar...</div>;
  if (error) return <div className="text-center py-24 text-red-500">{error}</div>;

  const monthName = new Date(viewYear, viewMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">

      {/* Pending tournament saved toast */}
      {pendingToast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-[#1c350a] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl animate-fade-in max-w-sm w-full mx-4">
          <span className="text-base">🏆</span>
          <span>{pendingToast}</span>
          <button onClick={() => setPendingToast('')} className="ml-auto text-white/60 hover:text-white text-lg leading-none">&times;</button>
        </div>
      )}

      {/* Hero Banner */}
      <div
        className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-4 flex items-center justify-between overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}
      >
        <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        <div className="relative min-w-0">
          <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-1">PickleTracker</p>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-white leading-tight">Calendar</h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">Sessions &amp; tournaments by date</p>
          <BannerMedalStrip medals={medalTally} className="mt-3" />
        </div>
        {/* Calendar icon decoration */}
        <div className="relative select-none flex-shrink-0 hidden sm:block">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <rect x="4" y="10" width="56" height="50" rx="8" fill="white" fillOpacity="0.08"/>
            <rect x="4" y="10" width="56" height="50" rx="8" stroke="white" strokeOpacity="0.2" strokeWidth="1.5"/>
            <path d="M4 24h56" stroke="white" strokeOpacity="0.25" strokeWidth="1.5"/>
            <path d="M22 4v12M42 4v12" stroke="white" strokeOpacity="0.4" strokeWidth="2" strokeLinecap="round"/>
            <rect x="12" y="32" width="8" height="8" rx="2" fill="#91BE4D" fillOpacity="0.6"/>
            <rect x="28" y="32" width="8" height="8" rx="2" fill="#ec9937" fillOpacity="0.6"/>
            <rect x="44" y="32" width="8" height="8" rx="2" fill="#3b82f6" fillOpacity="0.5"/>
            <rect x="12" y="46" width="8" height="8" rx="2" fill="#a855f7" fillOpacity="0.5"/>
            <rect x="28" y="46" width="8" height="8" rx="2" fill="#91BE4D" fillOpacity="0.35"/>
          </svg>
        </div>
      </div>

      {/* Stats strip */}
      <div className="grid grid-cols-3 gap-2 mb-4">
        {[
          { icon: '🎯', label: 'Sessions',    month: monthStats.sessions,    color: 'text-blue-600' },
          { icon: '🏆', label: 'Tournaments', month: monthStats.tournaments, color: 'text-[#4a6e10]' },
          { icon: '🏟️', label: 'Court Fees',  month: monthStats.courtFees > 0 ? formatCurrency(monthStats.courtFees, currency) : '—', color: 'text-orange-600' },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-xl border border-gray-100 shadow-sm px-2 py-3 flex flex-col items-center text-center">
            <p className="text-base leading-none mb-1.5">{s.icon}</p>
            <p className={`text-xl font-black leading-none ${s.color}`}>{s.month}</p>
            <p className="text-[10px] font-bold text-gray-500 mt-1 leading-tight">{s.label}</p>
            <p className="text-[9px] font-semibold text-gray-400 mt-0.5 leading-tight">in {monthName}</p>
          </div>
        ))}
      </div>

      {/* ── Calendar Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden mb-4">

        {/* Month navigation */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
          <button
            onClick={prevMonth}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <p className="text-sm sm:text-base font-bold text-gray-900">{monthName}</p>
          <div className="flex items-center gap-1">
            <button
              onClick={goToToday}
              className="text-xs font-medium text-[#4a6e10] hover:bg-green-50 px-2 py-1 rounded-md transition mr-1"
            >
              Today
            </button>
            <button
              onClick={nextMonth}
              className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </div>
        </div>

        {/* Helper hint — bold, eye-catching bar that guides users to tap a date */}
        <div className="relative overflow-hidden px-4 py-3 border-b border-[#91BE4D]/30 bg-gradient-to-r from-[#f4f8e8] via-[#eef5e6] to-[#fdf2e4]">
          {/* Soft decorative blob */}
          <div className="absolute -right-8 -top-8 w-28 h-28 rounded-full bg-[#91BE4D]/15 blur-2xl pointer-events-none" />
          <div className="absolute -left-6 -bottom-10 w-24 h-24 rounded-full bg-[#ec9937]/15 blur-2xl pointer-events-none" />

          <div className="relative flex items-center gap-3">
            {/* Pointing-down hand: the icon itself is the directional cue toward the grid below */}
            <div className="flex-shrink-0 w-10 h-10 rounded-full bg-white shadow-[0_2px_6px_rgba(28,53,10,0.12)] border border-[#91BE4D]/40 flex items-center justify-center">
              <span className="text-xl animate-bounce" style={{ animationDuration: '1.8s' }}>👇</span>
            </div>

            {/* Two-line copy: bold primary + muted helper */}
            <div className="flex-1 min-w-0">
              <p className="text-sm sm:text-[15px] font-extrabold text-[#2d5507] leading-tight tracking-tight">
                Tap any date below
              </p>
              <p className="text-[11px] sm:text-xs text-[#4a6e10]/90 font-semibold mt-0.5 leading-snug">
                to quickly log a session or tournament
              </p>
            </div>
          </div>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3 sm:gap-4 px-4 py-2 border-b border-gray-50 overflow-x-auto">
          {[
            { dot: 'bg-blue-400', label: 'Casual' },
            { dot: 'bg-purple-400', label: 'Drill' },
            { dot: 'bg-orange-400', label: 'Session (Tourney)' },
            { dot: 'bg-[#91BE4D]', label: 'Tournament' },
          ].map((l) => (
            <span key={l.label} className="flex items-center gap-1.5 flex-shrink-0">
              <span className={`w-2 h-2 rounded-full flex-shrink-0 ${l.dot}`} />
              <span className="text-[10px] text-gray-400 font-medium whitespace-nowrap">{l.label}</span>
            </span>
          ))}
        </div>

        {/* Weekday headers */}
        <div className="grid grid-cols-7 border-b border-gray-100">
          {WEEKDAYS_SHORT.map((d, i) => (
            <div key={i} className="text-center py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
              <span className="sm:hidden">{d}</span>
              <span className="hidden sm:inline">{WEEKDAYS[i]}</span>
            </div>
          ))}
        </div>

        {/* Day grid */}
        <div className="grid grid-cols-7">
          {monthGrid.map((day, idx) => {
            if (!day) {
              return <div key={`blank-${idx}`} className="border-b border-r border-gray-50 min-h-[72px] sm:min-h-[90px] bg-gray-50/40" />;
            }

            const dateStr = toDateStr(viewYear, viewMonth, day);
            const events = eventsByDate[dateStr] || [];
            const daySessions = sessionsByDate[dateStr] || [];
            const isToday = dateStr === todayStr;
            const isFuture = dateStr > todayStr;
            const hasActivity = events.length > 0 || daySessions.length > 0;
            const isHighlighted = dateStr === highlightDate;

            return (
              <div
                key={dateStr}
                onClick={() => openDayPopup(dateStr)}
                className={`relative flex flex-col border-b border-r border-gray-100 min-h-[72px] sm:min-h-[90px] p-1 sm:p-1.5 transition-colors select-none cursor-pointer
                  ${hasActivity ? 'hover:bg-green-50/50' : isFuture ? 'hover:bg-gray-50' : 'hover:bg-gray-50/60'}
                  ${idx % 7 === 0 ? 'border-l-0' : ''}
                  ${isHighlighted ? 'ring-2 ring-inset ring-[#91BE4D] bg-[#f4f8e8]' : ''}
                `}
              >
                {/* Date number */}
                <div className="flex justify-center mb-1 relative">
                  {isHighlighted && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-[#91BE4D]/30 animate-ping" />
                    </span>
                  )}
                  <span className={`relative w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold
                    ${isHighlighted ? 'bg-[#91BE4D] text-white' : isToday ? 'bg-[#91BE4D] text-white' : isFuture ? 'text-gray-500' : 'text-gray-700'}
                  `}>
                    {day}
                  </span>
                </div>

                {hasActivity && (
                  <div className="space-y-0.5">
                    {daySessions.slice(0, 1).map((s, i) => (
                      <div
                        key={i}
                        className={`text-[8px] sm:text-[11px] rounded px-1 py-0.5 truncate font-semibold leading-tight ${SESSION_CHIP[s.type] || 'bg-blue-100 text-blue-700'}`}
                      >
                        <span className="hidden sm:inline">{SESSION_ICON[s.type]} </span>
                        {SESSION_LABEL[s.type]}
                        {daySessions.length > 1 && ` ×${daySessions.length}`}
                      </div>
                    ))}
                    {events.slice(0, 2).map((ev, i) => (
                      <div
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setSelectedTournament(ev.tournament); }}
                        className="text-[8px] sm:text-[11px] bg-[#91BE4D]/15 text-[#4a6e10] rounded px-1 py-0.5 truncate font-semibold sm:hover:bg-green-200 transition cursor-pointer leading-tight"
                        title={`${ev.tournament.name} – ${ev.category.categoryName}`}
                      >
                        <span className="hidden sm:inline">🏆 </span>
                        {ev.tournament.name}
                      </div>
                    ))}
                    {(() => {
                      const shownSessions = Math.min(daySessions.length, 1);
                      const shownEvents = Math.min(events.length, 2);
                      const remaining = (daySessions.length - shownSessions) + (events.length - shownEvents);
                      return remaining > 0 ? (
                        <div className="text-[8px] sm:text-[10px] text-gray-400 px-1 font-medium">
                          +{remaining} more
                        </div>
                      ) : null;
                    })()}
                  </div>
                )}
              </div>
            );
          })}
        </div>

      </div>

      {/* ── Upcoming Events ── */}
      {upcomingEvents.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 mb-4">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Upcoming</p>
            {upcomingTournaments.length > 0 && (
              <button
                onClick={() => setShareModalOpen(true)}
                className="flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border border-[#91BE4D]/40 text-[#4a6e10] bg-[#91BE4D]/5 hover:bg-[#91BE4D]/10 transition-colors"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Share
              </button>
            )}
          </div>
          <div className="space-y-2">
            {upcomingEvents.map((ev, i) => {
              if (ev.kind === 'session') {
                const s = ev.data;
                const RATING_EMOJI = { 1: '😫', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' };
                return (
                  <div key={`s-${i}`} className="flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className={`w-2 h-2 rounded-full flex-shrink-0 mt-0.5 ${SESSION_DOT[s.type] || 'bg-blue-400'}`} />
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-gray-800">{SESSION_LABEL[s.type]} Session</p>
                        {s.location?.name && <p className="text-xs text-gray-400 truncate">📍 {s.location.name}</p>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      {s.rating && <span className="text-base">{RATING_EMOJI[s.rating]}</span>}
                      <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">{formatUpcomingDate(ev.date)}</span>
                    </div>
                  </div>
                );
              }
              const { tournament, category } = ev.data;
              return (
                <button
                  key={`t-${i}`}
                  onClick={() => setSelectedTournament(tournament)}
                  className="w-full flex items-center justify-between gap-3 py-1.5 border-b border-gray-50 last:border-0 text-left hover:bg-gray-50 rounded-lg px-1 -mx-1 transition"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <span className="w-2 h-2 rounded-full flex-shrink-0 bg-[#91BE4D] mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">{tournament.name}</p>
                      <p className="text-xs text-gray-400">{category.categoryName}</p>
                    </div>
                  </div>
                  <span className="text-xs font-semibold text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full flex-shrink-0">{formatUpcomingDate(ev.date)}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* ── Day Popup ── */}
      {dayPopup.open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={closeDayPopup}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl z-10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <p className="text-base font-bold text-gray-900">{formatShortDate(dayPopup.date)}</p>
              <button
                onClick={closeDayPopup}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Content — sessions then tournaments */}
            <div className="px-3 py-3 space-y-2 max-h-64 overflow-y-auto">
              {(sessionsByDate[dayPopup.date] || []).length === 0 && popupByTournament.length === 0 && (
                <p className="text-sm text-gray-400 text-center py-3">Nothing logged on this day yet.</p>
              )}
              {(sessionsByDate[dayPopup.date] || []).map((s) => {
                const RATING_EMOJI = { 1: '😫', 2: '😕', 3: '😐', 4: '😊', 5: '🔥' };
                const TYPE_BG = { casual: 'bg-blue-50 border-blue-100', practice: 'bg-purple-50 border-purple-100', tournament: 'bg-orange-50 border-orange-100' };
                return (
                  <div key={s._id} className={`rounded-xl px-3 py-2.5 border ${TYPE_BG[s.type] || 'bg-gray-50 border-gray-100'}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="text-base">{SESSION_ICON[s.type]}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-900">{SESSION_LABEL[s.type]} Session</p>
                          {s.location?.name && <p className="text-xs text-gray-400 truncate">📍 {s.location.name}</p>}
                          {s.wentWell?.length > 0 && (
                            <p className="text-xs text-green-700 mt-0.5 truncate">✓ {s.wentWell.slice(0, 2).join(', ')}</p>
                          )}
                          {s.wentWrong?.length > 0 && (
                            <p className="text-xs text-orange-600 truncate">✗ {s.wentWrong.slice(0, 2).join(', ')}</p>
                          )}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <span className="text-xl">{RATING_EMOJI[s.rating] || '—'}</span>
                        {s.courtFee > 0 && <p className="text-xs text-gray-400 mt-0.5">{symbol}{s.courtFee}</p>}
                      </div>
                    </div>
                  </div>
                );
              })}
              {popupByTournament.map(({ tournament, categories }) => (
                <button
                  key={tournament._id}
                  onClick={() => { setSelectedTournament(tournament); closeDayPopup(); }}
                  className="w-full text-left bg-gray-50 hover:bg-green-50 rounded-xl px-3 py-3 transition border border-transparent hover:border-green-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{tournament.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {categories.map((cat, i) => (
                          <span key={i} className="text-xs bg-[#91BE4D]/15 text-[#4a6e10] px-1.5 py-0.5 rounded-full font-medium">
                            {cat.categoryName}
                          </span>
                        ))}
                      </div>
                      {tournament.location?.name && (
                        <p className="text-xs text-gray-400 mt-1 truncate">📍 {tournament.location.name}</p>
                      )}
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <p className={`text-sm font-bold ${(tournament.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {formatCurrency(tournament.totalProfit || 0, currency)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">profit</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Add actions — two buttons */}
            <div className="px-3 pb-4 pt-2 border-t border-gray-100 grid grid-cols-2 gap-2">
              <button
                onClick={() => { closeDayPopup(); setAddSessionModal({ open: true, date: dayPopup.date }); setSessionFormError(''); }}
                className="flex items-center justify-center gap-1.5 border-2 border-[#91BE4D]/40 bg-[#91BE4D]/5 hover:bg-[#91BE4D]/10 text-[#4a6e10] font-semibold text-sm py-2.5 rounded-xl transition-colors"
              >
                🎯 Log Session
              </button>
              <button
                onClick={() => { closeDayPopup(); setAddModal({ open: true, date: dayPopup.date }); setAddError(''); }}
                className="flex items-center justify-center gap-1.5 hover:opacity-90 text-white font-semibold text-sm py-2.5 rounded-xl transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
              >
                🏆 Tournament
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Log Session Modal ── */}
      {addSessionModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-xl max-h-[92vh] flex flex-col overflow-hidden" style={{ maxHeight: '92svh' }}>
            {/* Pinned header — never scrolls behind the URL bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex-shrink-0 gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">Log Session</h2>
                {addSessionModal.date && (
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(addSessionModal.date)}</p>
                )}
              </div>
              <button
                onClick={() => { setAddSessionModal({ open: false, date: null }); setSessionFormError(''); }}
                className="text-gray-400 hover:text-gray-600 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4 sm:pb-6">
              {sessionFormError && (
                <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{sessionFormError}</div>
              )}
              <SessionForm
                initial={sessionAddInitial}
                onSubmit={handleAddSession}
                onCancel={() => { setAddSessionModal({ open: false, date: null }); setSessionFormError(''); }}
                loading={sessionFormLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Add Tournament Modal ── */}
      {addModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" style={{ maxHeight: '92svh' }}>
            {/* Pinned header — never scrolls behind the URL bar */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex-shrink-0 gap-3">
              <div>
                <h2 className="text-lg font-bold text-gray-900">New Tournament</h2>
                {addModal.date && <p className="text-xs text-gray-500 mt-0.5">{formatDate(addModal.date)}</p>}
              </div>
              <button
                onClick={() => { setAddModal({ open: false, date: null }); setAddError(''); }}
                className="text-gray-400 hover:text-gray-600 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4 sm:pb-6">
              {addError && (
                <div className="mb-4 mt-1 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{addError}</div>
              )}
              <TournamentForm
                initial={addInitial}
                onSubmit={handleAddTournament}
                onCancel={() => { setAddModal({ open: false, date: null }); setAddError(''); }}
                loading={formLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Tournament Detail Modal ── */}
      {selectedTournament && !isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" style={{ maxHeight: '92svh' }}>
            {/* Pinned header */}
            <div className="flex items-start justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-3 flex-shrink-0 gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-gray-900 break-words">{selectedTournament.name}</h2>
                {selectedTournament.location?.name && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 font-medium">{selectedTournament.location.name}</p>
                      {getMapUrl(selectedTournament.location) && (
                        <a href={getMapUrl(selectedTournament.location)} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 hover:underline">
                          View on Map →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedTournament(null)}
                className="text-gray-400 hover:text-gray-600 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition flex-shrink-0"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4 sm:pb-6">

            <div className="space-y-2 mb-4">
              {selectedTournament.categories.map((cat, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-900">{cat.categoryName}</p>
                  <p className="text-xs text-gray-500 mb-2">{cat.date ? formatDate(cat.date.split('T')[0]) : ''}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div><p className="text-gray-400">Medal</p><p className="font-medium text-gray-800">{cat.medal}</p></div>
                    <div><p className="text-gray-400">Entry Fee</p><p className="font-medium text-red-600">{formatCurrency(cat.entryFee, currency)}</p></div>
                    <div><p className="text-gray-400">Won</p><p className="font-medium text-green-600">{formatCurrency(cat.prizeAmount, currency)}</p></div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm">
              <div className="flex justify-between text-gray-600 mb-1">
                <span>Total Earnings</span>
                <span className="font-semibold text-gray-900">{formatCurrency(selectedTournament.totalEarnings || 0, currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>Total Entry Fees</span>
                <span className="font-semibold text-gray-900">{formatCurrency(selectedTournament.totalExpenses || 0, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-blue-100 pt-2 mt-2">
                <span className="font-semibold text-gray-900">Net Profit</span>
                <span className={`text-base font-bold ${(selectedTournament.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(selectedTournament.totalProfit || 0, currency)}
                </span>
              </div>
            </div>

            {/* Performance Feedback */}
            {(selectedTournament.rating || selectedTournament.wentWell?.length > 0 || selectedTournament.wentWrong?.length > 0 || selectedTournament.notes) && (
              <div className="bg-gray-50 rounded-xl p-3 mb-4 space-y-2.5">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Performance Feedback</p>

                {selectedTournament.rating && (
                  <div className="flex items-center gap-2">
                    <span className="text-xl">
                      {['😞','😐','🙂','😊','🤩'][selectedTournament.rating - 1]}
                    </span>
                    <span className="text-sm text-gray-700">
                      {['Tough day','Average','Decent','Good','Outstanding!'][selectedTournament.rating - 1]}
                    </span>
                  </div>
                )}

                {selectedTournament.wentWell?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">What went well</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTournament.wentWell.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTournament.wentWrong?.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1.5">Needs work</p>
                    <div className="flex flex-wrap gap-1.5">
                      {selectedTournament.wentWrong.map((tag) => (
                        <span key={tag} className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {selectedTournament.notes && (
                  <div>
                    <p className="text-xs text-gray-500 mb-1">Notes</p>
                    <p className="text-sm text-gray-700 whitespace-pre-wrap">{selectedTournament.notes}</p>
                  </div>
                )}
              </div>
            )}

            {formError && <p className="text-red-500 text-sm mb-3">{formError}</p>}

            <div className="flex gap-2">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-2.5 min-h-[44px] rounded-xl transition"
              >
                Edit
              </button>
              <button
                onClick={() => setSelectedTournament(null)}
                className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm font-semibold py-2.5 min-h-[44px] rounded-xl transition"
              >
                Close
              </button>
            </div>
            </div> {/* end scrollable body */}
          </div>
        </div>
      )}

      {/* ── Edit Tournament Modal ── */}
      {selectedTournament && isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-2xl max-h-[92vh] flex flex-col overflow-hidden" style={{ maxHeight: '92svh' }}>
            {/* Pinned header */}
            <div className="flex items-center justify-between px-4 sm:px-6 pt-4 sm:pt-6 pb-2 flex-shrink-0 gap-3">
              <h2 className="text-lg font-bold text-gray-900">Edit Tournament</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            {/* Scrollable body */}
            <div className="overflow-y-auto flex-1 px-4 sm:px-6 pb-4 sm:pb-6">
              <TournamentForm
                initial={selectedTournament}
                onSubmit={handleEditTournament}
                onCancel={() => setIsEditing(false)}
                loading={formLoading}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Floating Action Button (speed-dial) ──
          Hidden whenever a modal/popup is open so it doesn't overlap forms. */}
      {!dayPopup.open && !addModal.open && !addSessionModal.open && !selectedTournament && (
      <>
      {/* Scrim */}
      {fabOpen && (
        <div
          className="fixed inset-0 bg-black/30 z-40 transition-opacity"
          onClick={() => setFabOpen(false)}
        />
      )}

      <div className="fixed bottom-5 right-5 sm:bottom-6 sm:right-6 z-50 flex flex-col items-end gap-2.5">
        {/* Speed-dial options */}
        <div
          className={`flex flex-col items-end gap-2.5 transition-all duration-200 ${
            fabOpen ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-2 pointer-events-none'
          }`}
        >
          <button
            onClick={() => {
              setFabOpen(false);
              setAddSessionModal({ open: true, date: todayStr });
              setSessionFormError('');
            }}
            className="flex items-center gap-2.5 bg-white shadow-lg border border-gray-100 rounded-full pl-4 pr-5 py-2.5 hover:shadow-xl active:scale-95 transition-all"
          >
            <span className="w-7 h-7 rounded-full bg-blue-100 flex items-center justify-center text-base">🎯</span>
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">Log Session</span>
          </button>
          <button
            onClick={() => {
              setFabOpen(false);
              setAddModal({ open: true, date: todayStr });
              setAddError('');
            }}
            className="flex items-center gap-2.5 bg-white shadow-lg border border-gray-100 rounded-full pl-4 pr-5 py-2.5 hover:shadow-xl active:scale-95 transition-all"
          >
            <span className="w-7 h-7 rounded-full bg-[#91BE4D]/20 flex items-center justify-center text-base">🏆</span>
            <span className="text-sm font-semibold text-gray-800 whitespace-nowrap">Add Tournament</span>
          </button>
        </div>

        {/* Main FAB */}
        <button
          onClick={() => setFabOpen((v) => !v)}
          aria-label={fabOpen ? 'Close add menu' : 'Open add menu'}
          className="w-14 h-14 rounded-full text-white shadow-lg hover:shadow-xl active:scale-95 flex items-center justify-center transition-all"
          style={{ background: 'linear-gradient(135deg, #2d7005 0%, #91BE4D 55%, #ec9937 100%)' }}
        >
          <svg
            className={`w-7 h-7 transition-transform duration-200 ${fabOpen ? 'rotate-45' : ''}`}
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2.5}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
          </svg>
        </button>
      </div>
      </>
      )}

      {/* ── Share Modal ── */}
      {shareModalOpen && (
        <TournamentShareModal
          items={upcomingTournaments}
          onClose={() => setShareModalOpen(false)}
        />
      )}

    </div>
  );
}
