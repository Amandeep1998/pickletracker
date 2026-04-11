import React, { useEffect, useState, useMemo } from 'react';
import ReactCalendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import * as api from '../services/api';
import TournamentForm from '../components/TournamentForm';
import AddTournamentButton from '../components/AddTournamentButton';
import { formatINR } from '../utils/format';
import { getMapUrl } from '../utils/mapUrl';
import { connectGoogleCalendar, silentlyRefreshCalendarToken } from '../services/firebase';
import {
  isCalendarConnected,
  wasCalendarConnected,
  disconnectCalendar,
  syncTournamentToCalendar,
} from '../services/googleCalendar';

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

export default function Calendar() {
  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedTournament, setSelectedTournament] = useState(null);
  const [selectedDate, setSelectedDate] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [formLoading, setFormLoading] = useState(false);
  const [calendarConnected, setCalendarConnected] = useState(isCalendarConnected);
  const [calendarLoading, setCalendarLoading] = useState(false);

  // Add-from-calendar modal state
  const [addModal, setAddModal] = useState({ open: false, date: null });
  const [addError, setAddError] = useState('');

  // Bulk sync progress (shown while syncing existing tournaments on connect)
  const [syncProgress, setSyncProgress] = useState(null); // null | { done, total }

  // Silently refresh the Calendar token on mount if it was previously connected
  // but the 1-hour access token has expired — avoids making users reconnect manually
  useEffect(() => {
    if (!isCalendarConnected() && wasCalendarConnected()) {
      silentlyRefreshCalendarToken()
        .then(() => setCalendarConnected(true))
        .catch(() => {
          // Silent refresh failed (user signed out of Google, revoked access, etc.)
          // Leave the UI showing "Connect" — user must reconnect manually
        });
    }
  }, []);

  const handleConnectCalendar = async () => {
    setCalendarLoading(true);
    try {
      await connectGoogleCalendar();
      setCalendarConnected(true);

      // Sync all tournaments that have at least one category on today or in the future
      const todayStr = new Date().toISOString().split('T')[0];
      const toSync = tournaments.filter((t) =>
        t.categories.some((cat) => cat.date && cat.date >= todayStr)
      );

      if (toSync.length > 0) {
        setSyncProgress({ done: 0, total: toSync.length });

        for (let i = 0; i < toSync.length; i++) {
          const tournament = toSync[i];
          try {
            const eventResults = await syncTournamentToCalendar(tournament);
            if (eventResults?.length) {
              const updatedCategories = tournament.categories.map((cat, idx) => {
                const match = eventResults.find((r) => r.idx === idx);
                return match ? { ...cat, calendarEventId: match.calendarEventId } : cat;
              });
              await api.updateTournament(tournament._id, {
                ...tournament,
                categories: updatedCategories,
              });
            }
          } catch {
            // If one tournament fails, continue with the rest
          }
          setSyncProgress({ done: i + 1, total: toSync.length });
        }

        // Refresh local tournament list so calendarEventIds are up to date
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

  useEffect(() => {
    fetchTournaments();
  }, []);

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

  // Convert Date object → YYYY-MM-DD without timezone shift
  const dateToString = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // { 'YYYY-MM-DD': [{ tournament, category }, ...] }
  const eventsByDate = useMemo(() => {
    const map = {};
    tournaments.forEach((t) => {
      t.categories.forEach((cat) => {
        const dateStr = cat.date ? cat.date.split('T')[0] : null;
        if (!dateStr) return;
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push({ tournament: t, category: cat });
      });
    });
    return map;
  }, [tournaments]);

  // Pre-fill the first category date when opening from a calendar cell
  const addInitial = useMemo(() => {
    if (!addModal.date) return undefined;
    return {
      name: '',
      location: null,
      categories: [{ categoryName: '', date: addModal.date, medal: 'None', prizeAmount: '', entryFee: '' }],
    };
  }, [addModal.date]);

  const openAddModal = (dateStr, e) => {
    e.stopPropagation();
    setAddError('');
    setAddModal({ open: true, date: dateStr });
  };

  const closeAddModal = () => {
    setAddModal({ open: false, date: null });
    setAddError('');
  };

  // Tile content: event chips + always-visible add button (bottom-right)
  const tileContent = ({ date }) => {
    const dateStr = dateToString(date);
    const eventsOnDate = eventsByDate[dateStr] || [];

    return (
      // pb-8 reserves space so event chips never slide under the add button
      <div className="relative w-full h-full flex flex-col justify-start pt-1 pb-8 text-left">
        {eventsOnDate.slice(0, 2).map((event, idx) => (
          <div
            key={`${event.tournament._id}-${idx}`}
            className="text-xs font-medium text-gray-900 truncate px-1 hover:underline cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedTournament(event.tournament);
            }}
            title={`${event.tournament.name} – ${event.category.categoryName}`}
          >
            {event.tournament.name} – {event.category.categoryName}
          </div>
        ))}
        {eventsOnDate.length > 2 && (
          <div
            className="text-xs text-gray-600 px-1 cursor-pointer hover:text-gray-900"
            onClick={(e) => {
              e.stopPropagation();
              setSelectedDate(dateStr);
            }}
          >
            +{eventsOnDate.length - 2} more
          </div>
        )}

        <AddTournamentButton onClick={(e) => openAddModal(dateStr, e)} />
      </div>
    );
  };

  const tileClassName = ({ date }) => {
    const dateStr = dateToString(date);
    return eventsByDate[dateStr]?.length > 0 ? 'has-tournaments' : '';
  };

  // Add tournament from calendar cell
  const handleAddTournament = async (data) => {
    setFormLoading(true);
    setAddError('');
    try {
      const res = await api.createTournament(data);
      const created = res.data.data;

      if (isCalendarConnected()) {
        try {
          const eventResults = await syncTournamentToCalendar(created);
          if (eventResults?.length) {
            const updatedCategories = created.categories.map((cat, i) => {
              const match = eventResults.find((r) => r.idx === i);
              return match ? { ...cat, calendarEventId: match.calendarEventId } : cat;
            });
            await api.updateTournament(created._id, { ...created, categories: updatedCategories });
          }
        } catch {
          // Calendar sync failure is silent
        }
      }

      closeAddModal();
      await fetchTournaments();
    } catch (err) {
      const msg =
        err.response?.data?.errors?.[0] || err.response?.data?.message || 'Failed to add tournament';
      setAddError(msg);
    } finally {
      setFormLoading(false);
    }
  };

  const handleEditTournament = async (data) => {
    setFormLoading(true);
    try {
      // Preserve existing calendarEventIds so sync can update (not duplicate) events
      const dataWithCalendarIds = {
        ...data,
        categories: data.categories.map((cat, i) => ({
          ...cat,
          calendarEventId: selectedTournament.categories[i]?.calendarEventId || null,
        })),
      };

      const res = await api.updateTournament(selectedTournament._id, dataWithCalendarIds);
      const updated = res.data.data;

      if (isCalendarConnected()) {
        try {
          const eventResults = await syncTournamentToCalendar(updated);
          if (eventResults?.length) {
            const updatedCategories = updated.categories.map((cat, i) => {
              const match = eventResults.find((r) => r.idx === i);
              return match ? { ...cat, calendarEventId: match.calendarEventId } : cat;
            });
            await api.updateTournament(updated._id, { ...updated, categories: updatedCategories });
          }
        } catch {
          // Calendar sync failure is silent — tournament was saved successfully
        }
      }

      setIsEditing(false);
      setSelectedTournament(null);
      await fetchTournaments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update tournament');
    } finally {
      setFormLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    const [year, month, day] = dateStr.split('-');
    const date = new Date(year, month - 1, day);
    return date.toLocaleDateString('en-IN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getEventsByTournament = (dateStr) => {
    const events = eventsByDate[dateStr] || [];
    const grouped = {};
    events.forEach((event) => {
      if (!grouped[event.tournament._id]) {
        grouped[event.tournament._id] = { tournament: event.tournament, categories: [] };
      }
      grouped[event.tournament._id].categories.push(event.category);
    });
    return Object.values(grouped);
  };

  if (loading) return <div className="text-center py-24 text-gray-400">Loading calendar...</div>;
  if (error) return <div className="text-center py-24 text-red-500">{error}</div>;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
      <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-900 mb-6">Tournament Calendar</h1>

      {/* Google Calendar Connect */}
      <div className="bg-white rounded-xl border border-gray-100 shadow-sm px-4 py-3 mb-6">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <CalendarIcon />
            <div>
              <p className="text-sm font-medium text-gray-900">Google Calendar</p>
              <p className="text-xs text-gray-500">
                {calendarConnected
                  ? 'New & edited tournaments sync automatically'
                  : 'Connect to sync future tournaments to your calendar'}
              </p>
            </div>
          </div>
          {calendarConnected ? (
            <div className="flex items-center gap-3 flex-shrink-0">
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
              className="flex-shrink-0 bg-white border border-gray-300 hover:bg-gray-50 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-md transition-colors flex items-center gap-2 shadow-sm disabled:opacity-60"
            >
              {calendarLoading ? 'Connecting...' : 'Connect'}
            </button>
          )}
        </div>

        {/* Bulk sync progress */}
        {syncProgress && (
          <div className="mt-3">
            <div className="flex items-center justify-between mb-1">
              <p className="text-xs text-blue-700 font-medium">
                Syncing tournaments to Google Calendar… {syncProgress.done}/{syncProgress.total}
              </p>
              <p className="text-xs text-blue-500">
                {Math.round((syncProgress.done / syncProgress.total) * 100)}%
              </p>
            </div>
            <div className="w-full bg-blue-100 rounded-full h-1.5">
              <div
                className="bg-blue-500 h-1.5 rounded-full transition-all duration-300"
                style={{ width: `${(syncProgress.done / syncProgress.total) * 100}%` }}
              />
            </div>
          </div>
        )}

        {calendarConnected && !syncProgress && (
          <p className="text-xs text-green-700 bg-green-50 border border-green-100 rounded-lg px-3 py-2 mt-3">
            All tournaments from today onwards are synced. New or edited tournaments will sync automatically.
          </p>
        )}
      </div>

      {/* Calendar */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-4 sm:p-6">
        <style>{`
          .react-calendar {
            width: 100%;
            border: none;
            font-family: inherit;
          }
          .react-calendar__navigation {
            margin-bottom: 1.5rem;
          }
          .react-calendar__navigation button {
            color: #374151;
            font-weight: 600;
            font-size: 0.875rem;
            padding: 0.5rem 1rem;
            border-radius: 0.5rem;
            border: 1px solid #e5e7eb;
            background-color: #f9fafb;
          }
          .react-calendar__navigation button:hover {
            background-color: #f3f4f6;
          }
          .react-calendar__month-view__weekdays {
            text-align: center;
            font-weight: 600;
            font-size: 0.75rem;
            color: #6b7280;
            padding: 0.5rem 0;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          .react-calendar__month-view__days__day {
            position: relative;
            padding: 0.5rem 0.25rem;
            font-size: 0.875rem;
            border-radius: 0.5rem;
            margin: 0.125rem;
            height: auto;
            min-height: 80px;
            display: flex;
            flex-direction: column;
            align-items: stretch;
            justify-content: flex-start;
            background-color: #f9fafb;
            color: #374151;
            cursor: pointer;
            transition: all 0.2s;
            overflow: hidden;
          }
          @media (min-width: 768px) {
            .react-calendar__month-view__days__day {
              min-height: 100px;
              margin: 0.25rem;
            }
          }
          .react-calendar__month-view__days__day:hover {
            background-color: #f0fdf4;
            color: #16a34a;
          }
          .react-calendar__month-view__days__day.has-tournaments {
            background-color: #dcfce7;
            color: #166534;
            font-weight: 600;
            border: 2px solid #16a34a;
          }
          .react-calendar__month-view__days__day.has-tournaments:hover {
            background-color: #bbf7d0;
          }
          .react-calendar__tile--now {
            background-color: #e0f2fe !important;
          }
          .react-calendar__tile--active {
            background-color: #0ea5e9 !important;
            color: white !important;
          }
        `}</style>

        <ReactCalendar
          onChange={() => {}}
          tileClassName={tileClassName}
          tileContent={tileContent}
        />

        <p className="text-sm text-gray-500 mt-4 text-center">
          Hover a date and click <span className="font-semibold text-green-600">+</span> to add a tournament, or click an event to view details
        </p>
      </div>

      {/* ── Add Tournament Modal ── */}
      {addModal.open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-full sm:max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-1 gap-3">
              <div>
                <h2 className="text-lg sm:text-xl font-bold text-gray-900">New Tournament</h2>
                {addModal.date && (
                  <p className="text-xs text-gray-500 mt-0.5">{formatDate(addModal.date)}</p>
                )}
              </div>
              <button
                onClick={closeAddModal}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            {addError && (
              <div className="mb-4 mt-3 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg px-4 py-3">
                {addError}
              </div>
            )}

            <TournamentForm
              initial={addInitial}
              onSubmit={handleAddTournament}
              onCancel={closeAddModal}
              loading={formLoading}
            />
          </div>
        </div>
      )}

      {/* ── Date listing popup ("+N more") ── */}
      {selectedDate && !selectedTournament && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-full sm:max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-start justify-between mb-6 gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Events on {formatDate(selectedDate)}</h2>
              <button
                onClick={() => setSelectedDate(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              {getEventsByTournament(selectedDate).map((item) => (
                <div key={item.tournament._id} className="border rounded-lg p-4">
                  <h3 className="font-semibold text-gray-900 mb-3">{item.tournament.name}</h3>
                  <div className="space-y-2">
                    {item.categories.map((cat, idx) => (
                      <button
                        key={`${item.tournament._id}-${idx}`}
                        onClick={() => {
                          setSelectedTournament(item.tournament);
                          setSelectedDate(null);
                        }}
                        className="w-full text-left px-3 py-2 bg-gray-50 hover:bg-blue-50 text-gray-700 hover:text-blue-900 rounded text-sm transition min-h-[40px] flex items-center"
                      >
                        • {cat.categoryName}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── Tournament details modal ── */}
      {selectedTournament && !isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-full sm:max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-start justify-between mb-4 gap-3">
              <div className="flex-1 min-w-0">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 break-words">{selectedTournament.name}</h2>
                {selectedTournament.location?.name && (
                  <div className="mt-1.5 flex items-start gap-1.5">
                    <svg className="w-3.5 h-3.5 text-gray-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-700 font-medium">{selectedTournament.location.name}</p>
                      {selectedTournament.location.address && (
                        <p className="text-xs text-gray-500 truncate">{selectedTournament.location.address}</p>
                      )}
                      {getMapUrl(selectedTournament.location) && (
                        <a
                          href={getMapUrl(selectedTournament.location)}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:text-blue-700 hover:underline"
                        >
                          View on Map →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedTournament(null)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 mb-6">
              <h3 className="text-sm sm:text-base font-semibold text-gray-900">Categories</h3>
              {selectedTournament.categories.map((cat, idx) => (
                <div key={idx} className="bg-gray-50 rounded-lg p-3 sm:p-4">
                  <div className="text-sm sm:text-base font-semibold text-gray-900 mb-2">{cat.categoryName}</div>
                  <div className="text-xs sm:text-sm text-gray-600 mb-2">
                    <p>{formatDate(cat.date || '2000-01-01')}</p>
                  </div>
                  <div className="text-xs sm:text-sm text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-2 sm:gap-3">
                    <div>
                      <p className="text-xs text-gray-500">Medal</p>
                      <p className="font-medium">{cat.medal}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Entry Fees Paid</p>
                      <p className="font-medium">{formatINR(cat.entryFee)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Amount Won</p>
                      <p className="font-medium">{formatINR(cat.prizeAmount)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500">Profit</p>
                      <p className={`font-medium ${(cat.prizeAmount - cat.entryFee) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                        {formatINR(cat.prizeAmount - cat.entryFee)}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 rounded-lg p-3 sm:p-4 mb-6">
              <div className="text-xs sm:text-sm text-gray-600 space-y-2">
                <div className="flex justify-between">
                  <span>Total Earnings:</span>
                  <span className="font-semibold text-gray-900">{formatINR(selectedTournament.totalEarnings || 0)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Total Expenses:</span>
                  <span className="font-semibold text-gray-900">{formatINR(selectedTournament.totalExpenses || 0)}</span>
                </div>
                <div className="border-t pt-2 flex justify-between">
                  <span>Total Profit:</span>
                  <span className={`text-base sm:text-lg font-bold ${(selectedTournament.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {formatINR(selectedTournament.totalProfit || 0)}
                  </span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <button
                onClick={() => setIsEditing(true)}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white text-sm sm:text-base font-semibold py-2 sm:py-2.5 min-h-[40px] rounded-lg transition"
              >
                Edit Tournament
              </button>
              <button
                onClick={() => setSelectedTournament(null)}
                className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-900 text-sm sm:text-base font-semibold py-2 sm:py-2.5 min-h-[40px] rounded-lg transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Edit tournament modal ── */}
      {selectedTournament && isEditing && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-3 sm:p-4 z-50">
          <div className="bg-white rounded-2xl shadow-lg max-w-full sm:max-w-2xl w-full max-h-[90vh] sm:max-h-[85vh] overflow-y-auto p-4 sm:p-6">
            <div className="flex items-center justify-between mb-4 gap-3">
              <h2 className="text-lg sm:text-xl font-bold text-gray-900">Edit Tournament</h2>
              <button
                onClick={() => setIsEditing(false)}
                className="text-gray-400 hover:text-gray-600 text-xl font-bold flex-shrink-0 min-h-[40px] min-w-[40px] flex items-center justify-center rounded hover:bg-gray-100 transition"
              >
                ✕
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
