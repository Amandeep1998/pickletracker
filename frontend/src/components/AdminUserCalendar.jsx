import React, { useEffect, useState, useMemo } from 'react';
import { getAdminUserTournaments } from '../services/api';
import { formatCurrency } from '../utils/format';
import { getMapUrl } from '../utils/mapUrl';

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

function formatShortDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'short', month: 'short', day: 'numeric',
  });
}

function formatLongDate(dateStr) {
  const [year, month, day] = dateStr.split('-');
  return new Date(year, month - 1, day).toLocaleDateString(undefined, {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });
}

export default function AdminUserCalendar({ user, onClose }) {
  const currency = user?.currency || 'INR';
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());

  const [tournaments, setTournaments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [dayPopup, setDayPopup] = useState({ open: false, date: null });
  const [selectedTournament, setSelectedTournament] = useState(null);

  useEffect(() => {
    getAdminUserTournaments(user._id)
      .then((res) => setTournaments(res.data.data))
      .catch(() => setError('Failed to load tournaments'))
      .finally(() => setLoading(false));
  }, [user._id]);

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
  const monthName = new Date(viewYear, viewMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' });

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Total profit across all tournaments
  const totalProfit = useMemo(() =>
    tournaments.reduce((sum, t) =>
      sum + t.categories.reduce((s, c) => s + (c.prizeAmount - c.entryFee), 0), 0),
    [tournaments]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-2 sm:p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-3xl max-h-[95vh] flex flex-col overflow-hidden">

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 flex-shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-full bg-[#91BE4D]/20 text-[#4a6e10] font-bold text-sm flex items-center justify-center flex-shrink-0 uppercase">
              {user.name.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-gray-900 truncate">{user.name}'s Calendar</p>
              <p className="text-xs text-gray-400 truncate">{user.email}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 flex-shrink-0">
            {!loading && !error && (
              <div className="hidden sm:flex items-center gap-3 text-xs text-gray-500">
                <span><span className="font-semibold text-gray-800">{tournaments.length}</span> tournaments</span>
                <span className={`font-semibold ${totalProfit >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                  {totalProfit >= 0 ? '+' : ''}{formatCurrency(totalProfit, currency)} net
                </span>
              </div>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto">
          {loading && (
            <div className="flex items-center justify-center py-20 text-gray-400 text-sm">
              Loading calendar...
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center py-20 text-red-400 text-sm">{error}</div>
          )}
          {!loading && !error && (
            <div className="p-3 sm:p-4">

              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button
                  onClick={prevMonth}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <p className="text-sm font-bold text-gray-900">{monthName}</p>
                <button
                  onClick={nextMonth}
                  className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Calendar grid */}
              <div className="rounded-xl border border-gray-100 overflow-hidden">
                {/* Weekday headers */}
                <div className="grid grid-cols-7 border-b border-gray-100 bg-gray-50">
                  {WEEKDAYS_SHORT.map((d, i) => (
                    <div key={i} className="text-center py-2 text-xs font-semibold text-gray-400 uppercase tracking-wide">
                      <span className="sm:hidden">{d}</span>
                      <span className="hidden sm:inline">{WEEKDAYS[i]}</span>
                    </div>
                  ))}
                </div>

                {/* Day cells */}
                <div className="grid grid-cols-7">
                  {monthGrid.map((day, idx) => {
                    if (!day) {
                      return <div key={`blank-${idx}`} className="border-b border-r border-gray-50 min-h-[64px] sm:min-h-[80px] bg-gray-50/40" />;
                    }

                    const dateStr = toDateStr(viewYear, viewMonth, day);
                    const events = eventsByDate[dateStr] || [];
                    const isToday = dateStr === todayStr;
                    const hasEvents = events.length > 0;

                    return (
                      <div
                        key={dateStr}
                        onClick={() => { if (hasEvents) setDayPopup({ open: true, date: dateStr }); }}
                        className={`border-b border-r border-gray-100 min-h-[64px] sm:min-h-[80px] p-1 sm:p-1.5 transition-colors select-none
                          ${hasEvents ? 'cursor-pointer hover:bg-[#91BE4D]/5' : 'cursor-default'}
                        `}
                      >
                        <div className="flex justify-center mb-1">
                          <span className={`w-6 h-6 sm:w-7 sm:h-7 flex items-center justify-center rounded-full text-xs sm:text-sm font-semibold
                            ${isToday ? 'bg-[#91BE4D] text-white' : 'text-gray-700'}
                          `}>
                            {day}
                          </span>
                        </div>

                        {/* Mobile: dots */}
                        <div className="sm:hidden flex flex-wrap gap-0.5 justify-center">
                          {events.slice(0, 3).map((_, i) => (
                            <span key={i} className="w-1.5 h-1.5 rounded-full bg-[#91BE4D] inline-block" />
                          ))}
                          {events.length > 3 && <span className="w-1.5 h-1.5 rounded-full bg-green-300 inline-block" />}
                        </div>

                        {/* Desktop: name chips */}
                        <div className="hidden sm:block space-y-0.5">
                          {events.slice(0, 2).map((ev, i) => (
                            <div
                              key={i}
                              onClick={(e) => { e.stopPropagation(); setSelectedTournament(ev.tournament); }}
                              className="text-xs bg-[#91BE4D]/15 text-[#4a6e10] rounded px-1 py-0.5 truncate font-medium hover:bg-[#91BE4D]/30 transition cursor-pointer leading-tight"
                              title={`${ev.tournament.name} – ${ev.category.categoryName}`}
                            >
                              {ev.tournament.name}
                            </div>
                          ))}
                          {events.length > 2 && (
                            <div className="text-xs text-gray-500 px-1 font-medium">+{events.length - 2} more</div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Empty state */}
              {tournaments.length === 0 && (
                <p className="text-center text-gray-400 text-sm mt-6">No tournaments recorded yet.</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ── Day popup ── */}
      {dayPopup.open && (
        <div
          className="fixed inset-0 z-60 flex items-end sm:items-center justify-center"
          onClick={() => setDayPopup({ open: false, date: null })}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-xl z-10 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
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

            <div className="px-3 py-3 space-y-2 max-h-72 overflow-y-auto">
              {popupByTournament.map(({ tournament, categories }) => (
                <button
                  key={tournament._id}
                  onClick={() => { setSelectedTournament(tournament); setDayPopup({ open: false, date: null }); }}
                  className="w-full text-left bg-gray-50 hover:bg-[#91BE4D]/5 rounded-xl px-3 py-3 transition border border-transparent hover:border-[#91BE4D]/20"
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
          </div>
        </div>
      )}

      {/* ── Tournament detail ── */}
      {selectedTournament && (
        <div
          className="fixed inset-0 z-60 flex items-end sm:items-center justify-center"
          onClick={() => setSelectedTournament(null)}
        >
          <div className="absolute inset-0 bg-black/40" />
          <div
            className="relative bg-white w-full sm:max-w-lg rounded-t-2xl sm:rounded-2xl shadow-xl z-10 max-h-[85vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div className="flex-1 min-w-0">
                <h3 className="text-base font-bold text-gray-900 break-words">{selectedTournament.name}</h3>
                {selectedTournament.location?.name && (
                  <div className="flex items-center gap-1.5 mt-1">
                    <svg className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    <div className="min-w-0">
                      <p className="text-xs text-gray-600 font-medium truncate">{selectedTournament.location.name}</p>
                      {getMapUrl(selectedTournament.location) && (
                        <a href={getMapUrl(selectedTournament.location)} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-blue-500 hover:underline" onClick={(e) => e.stopPropagation()}>
                          View on Map →
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
              <button
                onClick={() => setSelectedTournament(null)}
                className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition flex-shrink-0 ml-3"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="px-5 py-4 space-y-2">
              {selectedTournament.categories.map((cat, idx) => (
                <div key={idx} className="bg-gray-50 rounded-xl p-3">
                  <p className="text-sm font-semibold text-gray-900">{cat.categoryName}</p>
                  <p className="text-xs text-gray-400 mb-2">{cat.date ? formatLongDate(cat.date.split('T')[0]) : ''}</p>
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div>
                      <p className="text-gray-400">Medal</p>
                      <p className="font-semibold text-gray-800">{cat.medal}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Entry Fee</p>
                      <p className="font-semibold text-red-500">{formatCurrency(cat.entryFee, currency)}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Won</p>
                      <p className="font-semibold text-green-600">{formatCurrency(cat.prizeAmount, currency)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="mx-5 mb-5 bg-gray-50 rounded-xl p-3 text-sm">
              <div className="flex justify-between text-gray-600 mb-1">
                <span>Total Earnings</span>
                <span className="font-semibold text-gray-900">{formatCurrency(selectedTournament.totalEarnings || 0, currency)}</span>
              </div>
              <div className="flex justify-between text-gray-600 mb-1">
                <span>Total Entry Fees</span>
                <span className="font-semibold text-gray-900">{formatCurrency(selectedTournament.totalExpenses || 0, currency)}</span>
              </div>
              <div className="flex justify-between border-t border-gray-200 pt-2 mt-2">
                <span className="font-semibold text-gray-900">Net Profit</span>
                <span className={`text-base font-bold ${(selectedTournament.totalProfit || 0) >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                  {formatCurrency(selectedTournament.totalProfit || 0, currency)}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
