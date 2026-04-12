import React, { useEffect, useState, useMemo } from 'react';
import * as api from '../services/api';
import TournamentForm from '../components/TournamentForm';
import { formatINR } from '../utils/format';
import { getMapUrl } from '../utils/mapUrl';
import { connectGoogleCalendar, silentlyRefreshCalendarToken } from '../services/firebase';
import {
  isCalendarConnected,
  wasCalendarConnected,
  disconnectCalendar,
  syncTournamentToCalendar,
} from '../services/googleCalendar';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

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

// Build all day cells for a given month (including leading/trailing blanks)
function buildMonthGrid(year, month) {
  const firstDay = new Date(year, month, 1).getDay(); // 0=Sun
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  // Pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function toDateStr(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

export default function Calendar() {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Calendar navigation
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  // Day popup — opens when tapping a date that has tournaments
  const [dayPopup, setDayPopup] = useState({ open: false, date: null });

  // Tournament detail / edit modals
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [formError, setFormError] = useState('');

  // Add tournament modal
  const [addModal, setAddModal] = useState({ open: false, date: null });
  const [addError, setAddError] = useState('');

  // Google Calendar
  const [calendarConnected, setCalendarConnected] = useState(isCalendarConnected);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [syncProgress, setSyncProgress] = useState(null);

  useEffect(() => {
    if (!isCalendarConnected() && wasCalendarConnected()) {
      silentlyRefreshCalendarToken()
        .then(() => setCalendarConnected(true))
        .catch(() => {});
    }
  }, []);

  useEffect(() => { fetchTournaments(); }, []);

  const fetchTournaments = async () => {
    try {
      const res = await api.getTournaments();
      setTournaments(res.data.data);
    } catch {
      setError('Failed to load tournaments');
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
        map[d].push({ tournament: t, category: cat });
      });
    });
    return map;
  }, [tournaments]);

  // Group events for the popup date by tournament
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

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };
  const goToToday = () => {
    setViewYear(today.getFullYear());
    setViewMonth(today.getMonth());
    setSelectedDate(todayStr);
  };

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
    });
  };

  const formatShortDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    return new Date(year, month - 1, day).toLocaleDateString('en-IN', {
      weekday: 'short', month: 'short', day: 'numeric',
    });
  };

  // ── Google Calendar handlers ──
  const handleConnectCalendar = async () => {
    setCalendarLoading(true);
    try {
      await connectGoogleCalendar();
      setCalendarConnected(true);
      const toSync = tournaments.filter((t) =>
        t.categories.some((cat) => cat.date && cat.date >= todayStr)
      );
      if (toSync.length > 0) {
        setSyncProgress({ done: 0, total: toSync.length });
        for (let i = 0; i < toSync.length; i++) {
          const t = toSync[i];
          try {
            const results = await syncTournamentToCalendar(t);
            if (results?.length) {
              const updatedCats = t.categories.map((cat, idx) => {
                const match = results.find((r) => r.idx === idx);
                return match ? { ...cat, calendarEventId: match.calendarEventId } : cat;
              });
              await api.updateTournament(t._id, { ...t, categories: updatedCats });
            }
          } catch {}
          setSyncProgress({ done: i + 1, total: toSync.length });
        }
        await fetchTournaments();
        setSyncProgress(null);
      }
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

  // ── Tournament handlers ──
  const handleAddTournament = async (data) => {
    setFormLoading(true);
    setAddError('');
    try {
      const res = await api.createTournament(data);
      const created = res.data.data;
      if (isCalendarConnected()) {
        try {
          const results = await syncTournamentToCalendar(created);
          if (results?.length) {
            const updatedCats = created.categories.map((cat, i) => {
              const match = results.find((r) => r.idx === i);
              return match ? { ...cat, calendarEventId: match.calendarEventId } : cat;
            });
            await api.updateTournament(created._id, { ...created, categories: updatedCats });
          }
        } catch {}
      }
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
      const dataWithIds = {
        ...data,
        categories: data.categories.map((cat, i) => ({
          ...cat,
          calendarEventId: selectedTournament.categories[i]?.calendarEventId || null,
        })),
      };
      const res = await api.updateTournament(selectedTournament._id, dataWithIds);
      const updated = res.data.data;
      if (isCalendarConnected()) {
        try {
          const results = await syncTournamentToCalendar(updated);
          if (results?.length) {
            const updatedCats = updated.categories.map((cat, i) => {
              const match = results.find((r) => r.idx === i);
              return match ? { ...cat, calendarEventId: match.calendarEventId } : cat;
            });
            await api.updateTournament(updated._id, { ...updated, categories: updatedCats });
          }
        } catch {}
      }
      setIsEditing(false);
      setSelectedTournament(null);
      await fetchTournaments();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Failed to update tournament');
    } finally {
      setFormLoading(false);
    }
  };

  const addInitial = useMemo(() => {
    if (!addModal.date) return undefined;
    return {
      name: '',
      location: null,
      categories: [{ categoryName: '', date: addModal.date, medal: 'None', prizeAmount: '', entryFee: '' }],
    };
  }, [addModal.date]);

  if (loading) return <div className="text-center py-24 text-gray-400">Loading calendar...</div>;
  if (error) return <div className="text-center py-24 text-red-500">{error}</div>;

  const monthName = new Date(viewYear, viewMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  return (
    <div className="max-w-4xl mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8">

      {/* Google Calendar Connect */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-4">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarIcon />
            <div>
              <p className="text-sm font-medium text-gray-900">Google Calendar</p>
              <p className="text-xs text-gray-500">
                {calendarConnected ? 'Syncing automatically' : 'Connect to sync tournaments'}
              </p>
            </div>
          </div>
          {calendarConnected ? (
            <div className="flex items-center gap-3 flex-shrink-0">
              <span className="flex items-center gap-1.5 text-xs text-green-600 font-medium">
                <span className="w-2 h-2 rounded-full bg-green-500 inline-block" />
                Connected
              </span>
              <button onClick={handleDisconnectCalendar} className="text-xs text-gray-400 hover:text-red-500 transition-colors">
                Disconnect
              </button>
            </div>
          ) : (
            <button
              onClick={handleConnectCalendar}
              disabled={calendarLoading}
              className="flex-shrink-0 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-md transition-colors shadow-sm disabled:opacity-60"
            >
              {calendarLoading ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>
        {syncProgress && (
          <div className="mt-3">
            <div className="flex justify-between mb-1">
              <p className="text-xs text-blue-700 font-medium">Syncing… {syncProgress.done}/{syncProgress.total}</p>
              <p className="text-xs text-blue-500">{Math.round((syncProgress.done / syncProgress.total) * 100)}%</p>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-1.5">
              <div className="bg-blue-500 h-1.5 rounded-full transition-all" style={{ width: `${(syncProgress.done / syncProgress.total) * 100}%` }} />
            </div>
          </div>
        )}
      </div>

      {/* ── Calendar Card ── */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 overflow-hidden">

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

          <div className="text-center">
            <p className="text-sm sm:text-base font-bold text-gray-900">{monthName}</p>
          </div>

          <div className="flex items-center gap-1">
            <button
              onClick={goToToday}
              className="text-xs font-medium text-green-600 hover:bg-green-50 px-2 py-1 rounded-md transition mr-1"
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
            const isToday = dateStr === todayStr;
            const hasEvents = events.length > 0;

            return (
              <div
                key={dateStr}
                onClick={() => { if (hasEvents) setDayPopup({ open: true, date: dateStr }); }}
                className={`relative border-b border-r border-gray-100 min-h-[72px] sm:min-h-[90px] p-1 sm:p-1.5 transition-colors select-none
                  ${hasEvents ? 'cursor-pointer hover:bg-green-50/60' : 'cursor-default'}
                  ${idx % 7 === 0 ? 'border-l-0' : ''}
                `}
              >
                {/* Date number */}
                <div className="flex justify-center mb-1">
                  <span className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold transition-colors
                    ${isToday ? 'bg-green-600 text-white' : 'text-gray-700'}
                  `}>
                    {day}
                  </span>
                </div>

                {/* Event chips — desktop: show name; mobile: show colored dot */}
                <div className="space-y-0.5">
                  {/* Mobile: dots */}
                  <div className="sm:hidden flex flex-wrap gap-0.5 justify-center">
                    {events.slice(0, 3).map((ev, i) => (
                      <span key={i} className="w-1.5 h-1.5 rounded-full bg-green-500 inline-block" />
                    ))}
                    {events.length > 3 && <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />}
                  </div>

                  {/* Desktop: event name chips */}
                  <div className="hidden sm:block space-y-0.5">
                    {events.slice(0, 2).map((ev, i) => (
                      <div
                        key={i}
                        onClick={(e) => { e.stopPropagation(); setSelectedTournament(ev.tournament); }}
                        className="text-xs bg-green-100 text-green-800 rounded px-1 py-0.5 truncate font-medium hover:bg-green-200 transition cursor-pointer leading-tight"
                        title={`${ev.tournament.name} – ${ev.category.categoryName}`}
                      >
                        {ev.tournament.name}
                      </div>
                    ))}
                    {events.length > 2 && (
                      <div className="text-xs text-gray-500 px-1 font-medium">
                        +{events.length - 2} more
                      </div>
                    )}
                  </div>
                </div>

                {/* Add button — desktop only, per cell */}
                <button
                  onClick={(e) => { e.stopPropagation(); setAddModal({ open: true, date: dateStr }); setAddError(''); }}
                  className="absolute bottom-1 right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold transition-colors bg-white border border-gray-200 text-gray-400 hover:bg-green-600 hover:text-white hover:border-green-600"
                  title={`Add tournament on ${dateStr}`}
                >
                  +
                </button>
              </div>
            );
          })}
        </div>

      </div>

      {/* ── Day Popup (bottom sheet) ── */}
      {dayPopup.open && (
        <div
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center"
          onClick={() => setDayPopup({ open: false, date: null })}
        >
          {/* Scrim */}
          <div className="absolute inset-0 bg-black/40" />

          {/* Sheet */}
          <div
            className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl z-10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
              <div>
                <p className="text-xs text-gray-400 font-medium uppercase tracking-wide">Tournaments</p>
                <p className="text-base font-bold text-gray-900 mt-0.5">{formatShortDate(dayPopup.date)}</p>
              </div>
              <button
                onClick={() => setDayPopup({ open: false, date: null })}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tournament cards */}
            <div className="px-3 py-3 space-y-2 max-h-72 overflow-y-auto">
              {popupByTournament.map(({ tournament, categories }) => (
                <button
                  key={tournament._id}
                  onClick={() => { setSelectedTournament(tournament); setDayPopup({ open: false, date: null }); }}
                  className="w-full text-left bg-gray-50 hover:bg-green-50 rounded-xl px-3 py-3 transition border border-transparent hover:border-green-100"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-semibold text-gray-900 truncate">{tournament.name}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {categories.map((cat, i) => (
                          <span key={i} className="text-xs bg-green-100 text-green-800 px-1.5 py-0.5 rounded-full font-medium truncate max-w-[140px]">
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
                        {formatINR(tournament.totalProfit || 0)}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">profit</p>
                    </div>
                  </div>
                </button>
              ))}
            </div>

            {/* Add button */}
            <div className="px-3 pb-4 pt-2 border-t border-gray-100">
              <button
                onClick={() => { setDayPopup({ open: false, date: null }); setAddModal({ open: true, date: dayPopup.date }); setAddError(''); }}
                className="w-full flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold text-sm py-3 rounded-xl transition"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                </svg>
                Add Tournament on this date
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Add Tournament Modal ── */}
      {addModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-1 gap-3">
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
            {addError && (
              <div className="mb-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">{addError}</div>
            )}
            <TournamentForm
              initial={addInitial}
              onSubmit={handleAddTournament}
              onCancel={() => { setAddModal({ open: false, date: null }); setAddError(''); }}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* ── Tournament Detail Modal ── */}
      {selectedTournament && !isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4 gap-3">
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

            <div className="space-y-2 mb-4">
              {selectedTournament.categories.map((cat, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-900">{cat.categoryName}</p>
                  <p className="text-xs text-gray-500 mb-2">{cat.date ? formatDate(cat.date.split('T')[0]) : ''}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">Medal</p>
                      <p className="font-medium text-gray-800">{cat.medal}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Entry Fee</p>
                      <p className="font-medium text-red-600">{formatINR(cat.entryFee)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Won</p>
                      <p className="font-medium text-green-600">{formatINR(cat.prizeAmount)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-xl p-3 mb-4 text-sm">
              <div className="flex justify-between text-gray-600 mb-1">
                <span>Total Earnings</span>
                <span className="font-semibold text-gray-900">{formatINR(selectedTournament.totalEarnings || 0)}</span>
              </div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>Total Entry Fees</span>
                <span className="font-semibold text-gray-900">{formatINR(selectedTournament.totalExpenses || 0)}</span>
              </div>
              <div className="flex justify-between border-t border-blue-100 pt-2 mt-2">
                <span className="font-semibold text-gray-900">Net Profit</span>
                <span className={`text-base font-bold ${(selectedTournament.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatINR(selectedTournament.totalProfit || 0)}
                </span>
              </div>
            </div>

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
          </div>
        </div>
      )}

      {/* ── Edit Tournament Modal ── */}
      {selectedTournament && isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-end sm:items-center justify-center z-50">
          <div className="bg-white rounded-t-2xl sm:rounded-2xl shadow-lg w-full sm:max-w-2xl max-h-[92vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
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
            <TournamentForm
              initial={selectedTournament}
              onSubmit={handleEditTournament}
              onCancel={() => setIsEditing(false)}
              loading={formLoading}
            />
          </div>
        </div>
      )}

    </div>
  );
}
