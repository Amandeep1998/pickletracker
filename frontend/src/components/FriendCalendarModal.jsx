import React, { useEffect, useMemo, useState } from 'react';
import * as api from '../services/api';
import PaddleLoader from './PaddleLoader';

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

/**
 * Friend's shared schedule (same as Nearby Players → View Calendar).
 * `friend` needs at least: id, name, optional city, profilePhoto.
 */
export default function FriendCalendarModal({ friend, onClose }) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    api
      .getFriendSchedule(friend.id)
      .then((res) => setEvents(res.data.data || []))
      .catch(() => setError('Could not load schedule'))
      .finally(() => setLoading(false));
  }, [friend.id]);

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthName = new Date(viewYear, viewMonth).toLocaleString(undefined, { month: 'long', year: 'numeric' });
  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const d = e.date?.split('T')[0];
      if (d) {
        if (!map[d]) map[d] = [];
        map[d].push(e);
      }
    });
    return map;
  }, [events]);

  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthEvents = events.filter((e) => e.date?.startsWith(monthStr));
  const initials = (friend.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-0 sm:p-4"
      onClick={onClose}
      role="presentation"
    >
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92dvh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sm:hidden flex justify-center pt-3 pb-0.5">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>
        <div
          className="relative px-5 pt-5 pb-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 60%, #2a1a00 100%)' }}
        >
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors p-1"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div
            className="w-12 h-12 rounded-full flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 2.5 }}
          >
            <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
              {friend.profilePhoto ? (
                <img src={friend.profilePhoto} alt={friend.name} className="w-full h-full object-cover" />
              ) : (
                <span className="text-sm font-black text-[#91BE4D]">{initials}</span>
              )}
            </div>
          </div>
          <div>
            <p className="text-[#91BE4D] text-[10px] font-bold uppercase tracking-widest">Friend&apos;s Schedule</p>
            <p className="text-white font-bold text-base leading-tight">{friend.name}</p>
            {friend.city && <p className="text-white/50 text-xs mt-0.5">📍 {friend.city}</p>}
          </div>
        </div>
        <div className="p-4">
          {loading ? (
            <div className="py-16">
              <PaddleLoader label="Loading schedule..." />
            </div>
          ) : error ? (
            <div className="py-10 text-center text-red-500 text-sm">{error}</div>
          ) : (
            <>
              <div className="flex items-center justify-between mb-3">
                <button
                  type="button"
                  onClick={() => {
                    if (viewMonth === 0) {
                      setViewYear((y) => y - 1);
                      setViewMonth(11);
                    } else setViewMonth((m) => m - 1);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <p className="text-sm font-bold text-gray-900">{monthName}</p>
                <button
                  type="button"
                  onClick={() => {
                    if (viewMonth === 11) {
                      setViewYear((y) => y + 1);
                      setViewMonth(0);
                    } else setViewMonth((m) => m + 1);
                  }}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS_SHORT.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 border border-gray-100 rounded-xl overflow-hidden">
                {monthGrid.map((day, idx) => {
                  if (!day) return <div key={`blank-${idx}`} className="min-h-[52px] bg-gray-50/50 border-b border-r border-gray-100" />;
                  const dateStr = toDateStr(viewYear, viewMonth, day);
                  const dayEvents = eventsByDate[dateStr] || [];
                  const isToday = dateStr === todayStr;
                  return (
                    <div
                      key={dateStr}
                      className={`min-h-[52px] border-b border-r border-gray-100 p-0.5 ${dayEvents.length > 0 ? 'bg-[#f4f8e8]/60' : ''}`}
                    >
                      <div className="flex justify-center mb-0.5">
                        <span
                          className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-semibold ${
                            isToday ? 'bg-[#91BE4D] text-white' : 'text-gray-600'
                          }`}
                        >
                          {day}
                        </span>
                      </div>
                      {dayEvents.slice(0, 2).map((e, ei) => (
                        <div
                          key={ei}
                          className={`text-[8px] rounded px-0.5 py-0.5 truncate font-semibold leading-tight ${
                            e.kind === 'tournament' ? 'bg-[#91BE4D]/20 text-[#3a5e08]' : 'bg-blue-100 text-blue-700'
                          }`}
                        >
                          {e.kind === 'tournament' ? '🏆' : '🎾'} {e.title || e.categoryName || 'Event'}
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <p className="text-[7px] text-gray-400 text-center">+{dayEvents.length - 2}</p>
                      )}
                    </div>
                  );
                })}
              </div>
              {monthEvents.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">This month</p>
                  <div className="space-y-1.5">
                    {monthEvents
                      .sort((a, b) => (a.date < b.date ? -1 : 1))
                      .map((e, i) => (
                        <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                          <span
                            className={`w-2 h-2 rounded-full flex-shrink-0 ${
                              e.kind === 'tournament' ? 'bg-[#91BE4D]' : 'bg-blue-400'
                            }`}
                          />
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-gray-800 truncate">
                              {e.title || e.categoryName || (e.kind === 'tournament' ? 'Tournament' : 'Session')}
                            </p>
                            {e.categoryName && e.kind === 'tournament' && (
                              <p className="text-[10px] text-gray-400">{e.categoryName}</p>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-400 flex-shrink-0">
                            {new Date(e.date + 'T00:00:00').toLocaleDateString(undefined, {
                              day: 'numeric',
                              month: 'short',
                            })}
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center mt-4">No events this month</p>
              )}
              <p className="text-[10px] text-gray-300 text-center mt-4">
                Only schedule info is shared. Expenses and financials stay private.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
