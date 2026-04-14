import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import * as api from '../services/api';
import { useAuth } from '../context/AuthContext';

const INDIAN_STATES = [
  'Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat',
  'Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh',
  'Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab',
  'Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh',
  'Uttarakhand','West Bengal',
  'Andaman & Nicobar Islands','Chandigarh','Dadra & Nagar Haveli','Daman & Diu',
  'Delhi','Jammu & Kashmir','Ladakh','Lakshadweep','Puducherry',
];

const SORT_OPTIONS = [
  { value: 'medals',      label: 'Most Medals' },
  { value: 'tournaments', label: 'Most Tournaments' },
  { value: 'dupr',        label: 'Highest DUPR' },
  { value: 'recent',      label: 'Recently Active' },
];

const MEDAL_EMOJI = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };
const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: CURRENT_YEAR - 2018 }, (_, i) => CURRENT_YEAR - i);

const resizeImage = (file) =>
  new Promise((resolve) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const SIZE = 300;
        const canvas = document.createElement('canvas');
        canvas.width = SIZE; canvas.height = SIZE;
        const ctx = canvas.getContext('2d');
        const scale = Math.max(SIZE / img.width, SIZE / img.height);
        const w = img.width * scale; const h = img.height * scale;
        ctx.drawImage(img, (SIZE - w) / 2, (SIZE - h) / 2, w, h);
        resolve(canvas.toDataURL('image/jpeg', 0.82));
      };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });

function rarityLabel(totalMedals) {
  if (totalMedals >= 10) return { text: '🏆 Legend', color: '#ec9937', bg: 'rgba(236,153,55,0.15)' };
  if (totalMedals >= 5)  return { text: '⭐ Elite',  color: '#91BE4D', bg: 'rgba(145,190,77,0.12)' };
  return null;
}

// Calendar helpers (for friend calendar modal)
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

// ── Toast notification ───────────────────────────────────────────────────────
function Toast({ message, type = 'success', onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 3500);
    return () => clearTimeout(t);
  }, [message, onDismiss]);

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[200] flex items-center gap-3 text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-2xl animate-fade-in whitespace-nowrap"
      style={{ background: type === 'error' ? '#ef4444' : 'linear-gradient(to right, #1c3a07, #2d7005)' }}>
      {type === 'success'
        ? <svg className="w-4 h-4 text-[#91BE4D] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
        : <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      }
      {message}
      <button onClick={onDismiss} className="ml-1 text-white/50 hover:text-white transition-colors">
        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

// ── Consent modal for accepting friend requests ──────────────────────────────
function ConsentModal({ request, onConfirm, onCancel, loading }) {
  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center p-4" onClick={onCancel}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white rounded-2xl shadow-2xl p-6 max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 mb-4">
          <div className="w-12 h-12 rounded-full bg-[#f4f8e8] flex items-center justify-center text-xl flex-shrink-0">🤝</div>
          <div>
            <p className="font-bold text-gray-900 text-base">Accept friend request?</p>
            <p className="text-sm text-gray-500 mt-0.5">{request.user?.name}</p>
          </div>
        </div>
        <div className="bg-[#f4f8e8] border border-[#91BE4D]/20 rounded-xl p-3.5 mb-5">
          <p className="text-xs text-[#4a6e10] font-medium leading-relaxed">
            Accepting lets you and <strong>{request.user?.name}</strong> see each other's tournament and session schedule on the Community page.
          </p>
          <p className="text-xs text-[#4a6e10] mt-2 leading-relaxed">
            🔒 <strong>Private info stays private</strong> — expenses, entry fees, and winnings are never shared.
          </p>
        </div>
        <div className="flex gap-2">
          <button onClick={onCancel} disabled={loading}
            className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            Cancel
          </button>
          <button onClick={onConfirm} disabled={loading}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white hover:opacity-90 disabled:opacity-60 transition-opacity flex items-center justify-center gap-2"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>
            {loading
              ? <><svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Accepting…</>
              : 'Accept & Connect'
            }
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Friend calendar modal ────────────────────────────────────────────────────
const WEEKDAYS_SHORT = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

function FriendCalendarModal({ friend, onClose }) {
  const today = new Date();
  const todayStr = toDateStr(today.getFullYear(), today.getMonth(), today.getDate());
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());

  useEffect(() => {
    api.getFriendSchedule(friend.id)
      .then((res) => setEvents(res.data.data || []))
      .catch(() => setError('Could not load schedule'))
      .finally(() => setLoading(false));
  }, [friend.id]);

  const monthGrid = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth]);
  const monthName = new Date(viewYear, viewMonth).toLocaleString('en-IN', { month: 'long', year: 'numeric' });

  const eventsByDate = useMemo(() => {
    const map = {};
    events.forEach((e) => {
      const d = e.date?.split('T')[0];
      if (!d) return;
      if (!map[d]) map[d] = [];
      map[d].push(e);
    });
    return map;
  }, [events]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear((y) => y - 1); setViewMonth(11); }
    else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear((y) => y + 1); setViewMonth(0); }
    else setViewMonth((m) => m + 1);
  };

  const initials = (friend.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();

  // Upcoming events for this friend in the viewed month
  const monthStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}`;
  const monthEvents = events.filter((e) => e.date?.startsWith(monthStr));

  return (
    <div className="fixed inset-0 z-[70] flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl max-h-[92dvh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>

        {/* Handle bar */}
        <div className="sm:hidden flex justify-center pt-3 pb-0.5">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {/* Header */}
        <div className="relative px-5 pt-5 pb-4 flex items-center gap-3"
          style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 60%, #2a1a00 100%)' }}>
          <button onClick={onClose}
            className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors p-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
          <div className="w-12 h-12 rounded-full flex-shrink-0"
            style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 2.5 }}>
            <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
              {friend.profilePhoto
                ? <img src={friend.profilePhoto} alt={friend.name} className="w-full h-full object-cover" />
                : <span className="text-sm font-black text-[#91BE4D]">{initials}</span>
              }
            </div>
          </div>
          <div>
            <p className="text-[#91BE4D] text-[10px] font-bold uppercase tracking-widest">Friend's Schedule</p>
            <p className="text-white font-bold text-base leading-tight">{friend.name}</p>
            {friend.city || friend.state
              ? <p className="text-white/50 text-xs mt-0.5">{[friend.city, friend.state].filter(Boolean).join(', ')}</p>
              : null
            }
          </div>
        </div>

        <div className="p-4">
          {loading ? (
            <div className="py-16 text-center text-gray-400 text-sm">Loading schedule…</div>
          ) : error ? (
            <div className="py-10 text-center text-red-500 text-sm">{error}</div>
          ) : (
            <>
              {/* Month navigation */}
              <div className="flex items-center justify-between mb-3">
                <button onClick={prevMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                  </svg>
                </button>
                <p className="text-sm font-bold text-gray-900">{monthName}</p>
                <button onClick={nextMonth}
                  className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 transition text-gray-600">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                </button>
              </div>

              {/* Weekday headers */}
              <div className="grid grid-cols-7 mb-1">
                {WEEKDAYS_SHORT.map((d, i) => (
                  <div key={i} className="text-center text-[10px] font-semibold text-gray-400 uppercase py-1">{d}</div>
                ))}
              </div>

              {/* Calendar grid */}
              <div className="grid grid-cols-7 border border-gray-100 rounded-xl overflow-hidden">
                {monthGrid.map((day, idx) => {
                  if (!day) return (
                    <div key={`blank-${idx}`} className="min-h-[56px] bg-gray-50/50 border-b border-r border-gray-100" />
                  );
                  const dateStr = toDateStr(viewYear, viewMonth, day);
                  const dayEvents = eventsByDate[dateStr] || [];
                  const isToday = dateStr === todayStr;
                  const hasActivity = dayEvents.length > 0;

                  return (
                    <div key={dateStr}
                      className={`min-h-[56px] border-b border-r border-gray-100 p-1 ${hasActivity ? 'bg-[#f4f8e8]/60' : ''}`}>
                      <div className="flex justify-center mb-0.5">
                        <span className={`w-5 h-5 flex items-center justify-center rounded-full text-[11px] font-semibold
                          ${isToday ? 'bg-[#91BE4D] text-white' : 'text-gray-600'}`}>
                          {day}
                        </span>
                      </div>
                      <div className="space-y-0.5">
                        {dayEvents.slice(0, 2).map((e, i) => (
                          <div key={i}
                            className={`text-[9px] rounded px-1 py-0.5 truncate font-semibold leading-tight ${
                              e.kind === 'tournament'
                                ? 'bg-[#91BE4D]/20 text-[#3a5e08]'
                                : 'bg-blue-100 text-blue-700'
                            }`}>
                            {e.kind === 'tournament' ? '🏆' : '🎾'} {e.title || e.categoryName || 'Event'}
                          </div>
                        ))}
                        {dayEvents.length > 2 && (
                          <p className="text-[8px] text-gray-400 text-center">+{dayEvents.length - 2}</p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Month event list */}
              {monthEvents.length > 0 ? (
                <div className="mt-4">
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">This month</p>
                  <div className="space-y-1.5">
                    {monthEvents.sort((a, b) => a.date < b.date ? -1 : 1).map((e, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2">
                        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${e.kind === 'tournament' ? 'bg-[#91BE4D]' : 'bg-blue-400'}`} />
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-semibold text-gray-800 truncate">
                            {e.title || e.categoryName || (e.kind === 'tournament' ? 'Tournament' : 'Session')}
                          </p>
                          {e.categoryName && e.kind === 'tournament' && (
                            <p className="text-[10px] text-gray-400">{e.categoryName}</p>
                          )}
                        </div>
                        <span className="text-[10px] text-gray-400 flex-shrink-0">
                          {new Date(e.date + 'T00:00:00').toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <p className="text-xs text-gray-400 text-center mt-4">No events this month</p>
              )}

              <p className="text-[10px] text-gray-300 text-center mt-4 leading-relaxed">
                Only schedule info is shared. Expenses and financials stay private.
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Mini card shown in the grid ──────────────────────────────────────────────
function PlayerMiniCard({ player, onClick }) {
  const { name, city, state, profilePhoto, duprSingles, duprDoubles, medals, totalMedals, topCategories } = player;
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const location = [city, state].filter(Boolean).join(', ') || 'India';
  const rarity = rarityLabel(totalMedals || 0);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-white flex flex-col"
    >
      {/* Card top — fixed height dark gradient so all cards align */}
      <div
        className="relative px-3 flex flex-col items-center justify-center"
        style={{
          background: 'linear-gradient(160deg, #0f2206 0%, #1c3a07 50%, #2a1a00 100%)',
          minHeight: 168,
        }}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #91BE4D 0%, transparent 70%)' }} />

        {/* Photo */}
        <div className="w-14 h-14 rounded-full flex-shrink-0 mb-2.5"
          style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 2.5 }}>
          <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
            {profilePhoto
              ? <img src={profilePhoto} alt={name} className="w-full h-full object-cover" />
              : <span className="text-base font-black text-[#91BE4D]">{initials}</span>
            }
          </div>
        </div>

        <p className="text-white font-bold text-sm text-center leading-tight mb-0.5 line-clamp-1 w-full px-1">{name}</p>
        <p className="text-[#91BE4D] text-[10px] font-semibold text-center">📍 {location}</p>

        {(duprSingles || duprDoubles) && (
          <p className="text-[#ec9937] text-[10px] font-bold mt-1">
            {duprSingles ? `S ${duprSingles}` : ''}{duprSingles && duprDoubles ? ' · ' : ''}{duprDoubles ? `D ${duprDoubles}` : ''}
          </p>
        )}

        {rarity && (
          <span className="mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: rarity.color, background: rarity.bg, border: `1px solid ${rarity.color}40` }}>
            {rarity.text}
          </span>
        )}
      </div>

      {/* Card bottom — white */}
      <div className="px-3 py-3 flex-1">
        {/* Medal row */}
        <div className="flex justify-around mb-2">
          {['Gold', 'Silver', 'Bronze'].map((m) => (
            <div key={m} className="flex flex-col items-center">
              <span className="text-sm">{MEDAL_EMOJI[m]}</span>
              <span className="text-sm font-black text-gray-800 leading-tight">{medals?.[m] ?? 0}</span>
              <span className="text-[9px] text-gray-400 uppercase tracking-wide">{m}</span>
            </div>
          ))}
        </div>

        {/* Top category chips */}
        {topCategories?.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {topCategories.slice(0, 2).map((c) => (
              <span key={c.name} className="text-[9px] font-semibold bg-[#f4f8e8] text-[#4a6e10] px-1.5 py-0.5 rounded-full border border-[#91BE4D]/20 truncate max-w-[80px]">
                {c.name}
              </span>
            ))}
          </div>
        )}
      </div>
    </button>
  );
}

// ── Player detail modal ──────────────────────────────────────────────────────
function PlayerModal({ playerId, onClose, onSendFriendRequest, friendState, currentUserId }) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  useEffect(() => {
    api.getPlayer(playerId)
      .then((res) => setPlayer(res.data.data))
      .catch(() => setError('Could not load player profile.'))
      .finally(() => setLoading(false));
  }, [playerId]);

  const rarity = player ? rarityLabel(player.totalMedals || 0) : null;

  const handleFriendClick = async () => {
    if (friendState !== 'none' || sending) return;
    setSending(true);
    await onSendFriendRequest(player.id);
    setSending(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div
        className="relative bg-white w-full sm:max-w-md sm:rounded-2xl rounded-t-2xl max-h-[90dvh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Handle bar (mobile) */}
        <div className="sm:hidden flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 bg-gray-200 rounded-full" />
        </div>

        {loading ? (
          <div className="py-16 text-center text-gray-400 text-sm">Loading…</div>
        ) : error ? (
          <div className="py-16 text-center text-red-500 text-sm">{error}</div>
        ) : player ? (
          <>
            {/* Modal header card */}
            <div className="relative px-6 pt-6 pb-5 flex flex-col items-center"
              style={{ background: 'linear-gradient(160deg, #0f2206 0%, #1c3a07 50%, #2a1a00 100%)' }}>
              <button onClick={onClose}
                className="absolute top-4 right-4 text-white/40 hover:text-white/80 transition-colors p-1">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>

              {/* Photo */}
              <div className="w-24 h-24 rounded-full mb-3 flex-shrink-0"
                style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 3 }}>
                <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
                  {player.profilePhoto
                    ? <img src={player.profilePhoto} alt={player.name} className="w-full h-full object-cover" />
                    : <span className="text-2xl font-black text-[#91BE4D]">
                        {(player.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase()}
                      </span>
                  }
                </div>
              </div>

              <p className="text-white text-xl font-black text-center">{player.name}</p>
              <p className="text-[#91BE4D] text-xs font-semibold mt-1">
                📍 {[player.city, player.state].filter(Boolean).join(', ') || 'India'}
              </p>

              <div className="flex items-center gap-4 mt-3">
                {(player.duprSingles || player.duprDoubles) && (
                  <div className="text-center">
                    <p className="text-[#ec9937] text-sm font-black">
                      {player.duprSingles ? `Singles ${player.duprSingles}` : ''}
                      {player.duprSingles && player.duprDoubles ? ' · ' : ''}
                      {player.duprDoubles ? `Doubles ${player.duprDoubles}` : ''}
                    </p>
                  </div>
                )}
                {player.playingSince && (
                  <div className="text-center">
                    <p className="text-white/50 text-xs">Playing since <span className="text-white/80 font-semibold">{player.playingSince}</span></p>
                  </div>
                )}
              </div>

              {rarity && (
                <span className="mt-3 text-[10px] font-bold px-3 py-1 rounded-full"
                  style={{ color: rarity.color, background: rarity.bg, border: `1px solid ${rarity.color}40` }}>
                  {rarity.text}
                </span>
              )}

              {!currentUserId || String(player.id) === String(currentUserId) ? null : (
                <button
                  type="button"
                  onClick={handleFriendClick}
                  disabled={friendState !== 'none' || sending}
                  className={`mt-4 text-xs font-bold px-4 py-1.5 rounded-lg border flex items-center gap-2 transition-colors ${
                    friendState === 'friend'
                      ? 'border-[#91BE4D] bg-[#91BE4D]/15 text-[#4a6e10]'
                      : friendState === 'pending'
                      ? 'border-orange-300 bg-orange-50 text-orange-700'
                      : 'border-white/20 bg-white/10 text-white hover:bg-white/20'
                  }`}
                >
                  {sending
                    ? <><svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/></svg>Sending…</>
                    : friendState === 'friend' ? '✓ Friends'
                    : friendState === 'pending' ? '⏳ Request pending'
                    : '+ Add friend'
                  }
                </button>
              )}
            </div>

            {/* Stats */}
            <div className="px-6 py-5 space-y-5">

              {/* Tournaments + medals — aligned by adding icon row to Events */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Stats</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg">🏅</p>
                    <p className="text-base font-black text-gray-800 leading-tight">{player.totalTournaments}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Events</p>
                  </div>
                  {['Gold', 'Silver', 'Bronze'].map((m) => (
                    <div key={m} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-lg">{MEDAL_EMOJI[m]}</p>
                      <p className="text-base font-black text-gray-800 leading-tight">{player.medals?.[m] ?? 0}</p>
                      <p className="text-[10px] text-gray-400">{m}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Top categories */}
              {player.topCategories?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Plays</p>
                  <div className="flex flex-wrap gap-1.5">
                    {player.topCategories.map((c) => (
                      <span key={c.name} className="text-xs font-semibold bg-[#f4f8e8] text-[#4a6e10] px-3 py-1 rounded-full border border-[#91BE4D]/20">
                        {c.name} <span className="text-[#91BE4D]">×{c.count}</span>
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Recent medal wins */}
              {player.recentMedalTournaments?.length > 0 && (
                <div>
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Recent Highlights</p>
                  <div className="space-y-2">
                    {player.recentMedalTournaments.map((t, i) => (
                      <div key={i} className="flex items-center gap-3 bg-gray-50 rounded-xl px-3 py-2.5">
                        <span className="text-lg flex-shrink-0">{MEDAL_EMOJI[t.medal]}</span>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-gray-800 truncate">{t.tournamentName}</p>
                          <p className="text-xs text-gray-400">{t.category}{t.date ? ` · ${t.date}` : ''}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <p className="text-[10px] text-gray-300 text-center">
                Member since {new Date(player.memberSince).toLocaleDateString('en-IN', { month: 'short', year: 'numeric' })}
              </p>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}

// ── Edit community profile modal ─────────────────────────────────────────────
function EditMyCommunityProfileModal({ onClose, onSaved }) {
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [form, setForm] = useState({
    duprSingles: '', duprDoubles: '', playingSince: '', profilePhoto: null, manualAchievements: [],
  });

  useEffect(() => {
    Promise.all([api.getProfile(), api.getTournaments()])
      .then(([profileRes, tournamentsRes]) => {
        const p = profileRes.data.data || {};
        const existingManual = Array.isArray(p.manualAchievements) ? p.manualAchievements : [];
        setForm({
          duprSingles: p.duprSingles ?? p.duprRating ?? '',
          duprDoubles: p.duprDoubles ?? '',
          playingSince: p.playingSince ?? '',
          profilePhoto: p.profilePhoto ?? null,
          manualAchievements: existingManual,
        });
      })
      .catch(() => setError('Could not load your profile.'))
      .finally(() => setLoading(false));
  }, []);

  const addAchievement = () =>
    setForm((f) => ({
      ...f,
      manualAchievements: [...(f.manualAchievements || []), { tournamentName: '', categoryName: '', medal: 'Gold', date: '' }],
    }));

  const save = async () => {
    setSaving(true); setError('');
    try {
      await api.updateProfile({
        duprSingles: form.duprSingles || null,
        duprDoubles: form.duprDoubles || null,
        duprRating: form.duprSingles || null,
        playingSince: form.playingSince || null,
        profilePhoto: form.profilePhoto || null,
        manualAchievements: form.manualAchievements || [],
      });
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update profile');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/50" />
      <div className="relative bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl max-h-[90dvh] overflow-y-auto shadow-2xl"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-5 border-b border-gray-100 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Community</p>
            <h2 className="text-lg font-bold text-gray-900">Update your player card</h2>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-700">✕</button>
        </div>

        {loading ? (
          <div className="p-6 text-sm text-gray-400">Loading…</div>
        ) : (
          <div className="p-5 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">DUPR Singles</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                  value={form.duprSingles} onChange={(e) => setForm((f) => ({ ...f, duprSingles: e.target.value }))} />
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">DUPR Doubles</label>
                <input className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                  value={form.duprDoubles} onChange={(e) => setForm((f) => ({ ...f, duprDoubles: e.target.value }))} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Playing since</label>
              <select className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                value={form.playingSince} onChange={(e) => setForm((f) => ({ ...f, playingSince: e.target.value }))}>
                <option value="">Select year…</option>
                {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1">Profile photo</label>
              <div className="flex items-center gap-3">
                <div className="w-14 h-14 rounded-full overflow-hidden bg-gray-100 flex items-center justify-center border border-gray-200">
                  {form.profilePhoto ? <img src={form.profilePhoto} alt="profile" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">None</span>}
                </div>
                <button type="button" onClick={() => fileInputRef.current?.click()} className="text-sm font-semibold text-[#4a6e10]">Upload / Change</button>
                {form.profilePhoto && <button type="button" onClick={() => setForm((f) => ({ ...f, profilePhoto: null }))} className="text-xs text-gray-500 hover:text-red-500">Remove</button>}
              </div>
              <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  const dataUrl = await resizeImage(file);
                  setForm((f) => ({ ...f, profilePhoto: dataUrl }));
                }} />
            </div>

            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Past achievements (old tournaments)</label>
                <button type="button" onClick={addAchievement} className="text-xs font-semibold text-[#4a6e10]">+ Add</button>
              </div>
              <div className="space-y-2">
                {(form.manualAchievements || []).map((row, idx) => (
                  <div key={idx} className="bg-gray-50 rounded-xl p-3 space-y-2">
                    <div className="flex items-center gap-2">
                      <input className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                        placeholder="Tournament name" value={row.tournamentName || ''}
                        onChange={(e) => setForm((f) => { const copy = [...(f.manualAchievements || [])]; copy[idx] = { ...copy[idx], tournamentName: e.target.value }; return { ...f, manualAchievements: copy }; })} />
                      <button type="button" onClick={() => setForm((f) => ({ ...f, manualAchievements: (f.manualAchievements || []).filter((_, i) => i !== idx) }))}
                        className="text-gray-400 hover:text-red-500 flex-shrink-0">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <input className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                        placeholder="Category" value={row.categoryName || ''}
                        onChange={(e) => setForm((f) => { const copy = [...(f.manualAchievements || [])]; copy[idx] = { ...copy[idx], categoryName: e.target.value }; return { ...f, manualAchievements: copy }; })} />
                      <select className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                        value={row.medal || 'Gold'}
                        onChange={(e) => setForm((f) => { const copy = [...(f.manualAchievements || [])]; copy[idx] = { ...copy[idx], medal: e.target.value }; return { ...f, manualAchievements: copy }; })}>
                        <option>Gold</option><option>Silver</option><option>Bronze</option>
                      </select>
                      <input type="date" className="border border-gray-200 rounded-lg px-2 py-1.5 text-xs bg-white focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
                        value={row.date || ''}
                        onChange={(e) => setForm((f) => { const copy = [...(f.manualAchievements || [])]; copy[idx] = { ...copy[idx], date: e.target.value }; return { ...f, manualAchievements: copy }; })} />
                    </div>
                  </div>
                ))}
                {(form.manualAchievements || []).length === 0 && (
                  <button type="button" onClick={addAchievement}
                    className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-xs text-gray-400 hover:border-[#91BE4D]/40 hover:text-[#4a6e10] transition-colors">
                    + Add a past tournament
                  </button>
                )}
              </div>
            </div>

            {error ? <p className="text-xs text-red-500">{error}</p> : null}

            <div className="flex justify-end gap-2">
              <button type="button" onClick={onClose} className="px-3 py-2 text-sm border border-gray-300 rounded-lg text-gray-600">Cancel</button>
              <button type="button" onClick={save} disabled={saving}
                className="px-4 py-2 text-sm text-white rounded-lg disabled:opacity-50 font-semibold hover:opacity-90"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>
                {saving ? 'Saving…' : 'Save profile'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Friends section ──────────────────────────────────────────────────────────
function FriendsSection({ friends, onViewCalendar }) {
  if (friends.length === 0) return null;
  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest">Friends</p>
          <p className="text-[10px] text-gray-400 mt-0.5">View their schedule calendar</p>
        </div>
        <span className="text-[10px] font-bold text-[#4a6e10] bg-[#f4f8e8] border border-[#91BE4D]/20 rounded-full px-2 py-0.5">
          {friends.length} friend{friends.length !== 1 ? 's' : ''}
        </span>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {friends.map((f) => {
          const initials = (f.name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
          const location = [f.city, f.state].filter(Boolean).join(', ') || 'India';
          return (
            <div key={f.id}
              className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
              {/* Green header */}
              <div className="relative px-4 py-4 flex flex-col items-center"
                style={{ background: 'linear-gradient(160deg, #0f2206 0%, #1c3a07 50%, #2a1a00 100%)' }}>
                <div className="absolute top-0 right-0 w-16 h-16 opacity-10 rounded-full"
                  style={{ background: 'radial-gradient(circle, #91BE4D 0%, transparent 70%)' }} />
                <div className="w-12 h-12 rounded-full flex-shrink-0 mb-2"
                  style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 2.5 }}>
                  <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
                    {f.profilePhoto
                      ? <img src={f.profilePhoto} alt={f.name} className="w-full h-full object-cover" />
                      : <span className="text-sm font-black text-[#91BE4D]">{initials}</span>
                    }
                  </div>
                </div>
                <p className="text-white font-bold text-sm text-center leading-tight line-clamp-1 w-full">{f.name}</p>
                <p className="text-[#91BE4D] text-[10px] mt-0.5">📍 {location}</p>
                <span className="mt-1.5 text-[9px] font-bold bg-[#91BE4D]/20 text-[#91BE4D] border border-[#91BE4D]/30 px-2 py-0.5 rounded-full">
                  ✓ Friends
                </span>
              </div>
              {/* White footer */}
              <div className="px-3 py-3">
                <button
                  onClick={() => onViewCalendar(f)}
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2 rounded-xl transition-opacity hover:opacity-90 text-white"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}>
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  View Calendar
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Main Players page ────────────────────────────────────────────────────────
export default function Players() {
  const { user } = useAuth();
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [friends, setFriends] = useState([]);
  const [toast, setToast] = useState(null); // { message, type }
  const [showEditProfile, setShowEditProfile] = useState(false);
  const [consentRequest, setConsentRequest] = useState(null); // pending accept request
  const [acceptingId, setAcceptingId] = useState(null);
  const [friendCalendarTarget, setFriendCalendarTarget] = useState(null);

  const [filters, setFilters] = useState({
    search: '', state: '', minDupr: '', maxDupr: '', category: '', sort: 'medals',
  });

  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = (val) => {
    setFilters((f) => ({ ...f, search: val }));
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const fetchPlayers = useCallback(async (pageNum, f, search) => {
    setLoading(true); setError('');
    try {
      const params = { page: pageNum, limit: 24, sort: f.sort };
      if (search)     params.search    = search;
      if (f.state)    params.state     = f.state;
      if (f.minDupr)  params.minDupr   = f.minDupr;
      if (f.maxDupr)  params.maxDupr   = f.maxDupr;
      if (f.category) params.category  = f.category;
      const res = await api.getPlayers(params);
      setPlayers(res.data.data);
      setTotal(res.data.total);
    } catch {
      setError('Could not load players. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  const fetchFriendData = useCallback(async () => {
    try {
      const [reqRes, friendsRes] = await Promise.all([api.getFriendRequests(), api.getFriends()]);
      setFriendRequests(reqRes.data.data || { incoming: [], outgoing: [] });
      setFriends(friendsRes.data.data || []);
    } catch { /* keep page usable */ }
  }, []);

  useEffect(() => { fetchPlayers(page, filters, debouncedSearch); },
    [fetchPlayers, page, filters.state, filters.minDupr, filters.maxDupr, filters.category, filters.sort, debouncedSearch]);

  useEffect(() => { fetchFriendData(); }, [fetchFriendData]);

  useEffect(() => { setPage(1); },
    [filters.state, filters.minDupr, filters.maxDupr, filters.category, filters.sort, debouncedSearch]);

  const totalPages = Math.ceil(total / 24);
  const activeFilterCount = [filters.state, filters.minDupr, filters.maxDupr, filters.category].filter(Boolean).length;

  const friendStatusByUserId = useMemo(() => {
    const map = {};
    friends.forEach((f) => { map[String(f.id)] = 'friend'; });
    (friendRequests.incoming || []).forEach((r) => { map[String(r.user.id)] = 'incoming'; });
    (friendRequests.outgoing || []).forEach((r) => { map[String(r.user.id)] = 'pending'; });
    return map;
  }, [friendRequests, friends]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
  };

  const handleSendFriendRequest = async (playerId) => {
    try {
      await api.sendFriendRequest(playerId);
      showToast('Friend request sent!');
      await fetchFriendData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not send friend request', 'error');
    }
  };

  const handleAcceptRequest = (request) => {
    setConsentRequest(request);
  };

  const handleConfirmAccept = async () => {
    if (!consentRequest) return;
    setAcceptingId(consentRequest.id);
    try {
      await api.acceptFriendRequest(consentRequest.id);
      setConsentRequest(null);
      showToast(`You and ${consentRequest.user?.name} are now friends! View their calendar in the Friends section.`);
      await fetchFriendData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not accept request', 'error');
    } finally {
      setAcceptingId(null);
    }
  };

  const handleRejectRequest = async (requestId) => {
    try {
      await api.rejectFriendRequest(requestId);
      showToast('Friend request declined.');
      await fetchFriendData();
    } catch (err) {
      showToast(err.response?.data?.message || 'Could not decline request', 'error');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-10">

      {/* Hero */}
      <div className="rounded-2xl px-5 py-5 sm:px-7 sm:py-6 mb-6 overflow-hidden relative"
        style={{ background: 'linear-gradient(135deg, #1c350a 0%, #2d6e05 50%, #a86010 100%)' }}>
        <div className="absolute inset-0 opacity-10"
          style={{ backgroundImage: 'radial-gradient(circle at 80% 50%, #91BE4D 0%, transparent 60%)' }} />
        <div className="relative flex items-center gap-4">
          <div>
            <p className="text-[#91BE4D] text-xs font-bold uppercase tracking-widest mb-0.5">Community</p>
            <h1 className="text-xl sm:text-2xl font-extrabold text-white leading-tight">Players</h1>
            <p className="text-slate-400 text-xs mt-0.5">
              {total > 0 ? `${total} player${total !== 1 ? 's' : ''} in the community` : 'Discover the pickleball community'}
            </p>
          </div>
          <div className="ml-auto text-4xl select-none">🎾</div>
        </div>
      </div>

      {/* Update profile CTA */}
      <div className="mb-5 flex items-center justify-between gap-3">
        <button
          type="button"
          onClick={() => setShowEditProfile(true)}
          className="flex items-center gap-2 text-sm font-semibold text-white px-4 py-2 rounded-xl hover:opacity-90 transition-opacity"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
          Update my card
        </button>
      </div>

      {/* Incoming friend requests */}
      {(friendRequests.incoming || []).length > 0 && (
        <div className="mb-5 bg-white border border-gray-100 rounded-2xl p-4 shadow-sm">
          <p className="text-xs font-bold text-gray-500 uppercase tracking-widest mb-3">
            Friend Requests <span className="text-[#4a6e10] ml-1">{friendRequests.incoming.length}</span>
          </p>
          <div className="space-y-2">
            {friendRequests.incoming.map((r) => (
              <div key={r.id} className="flex items-center justify-between gap-3 p-2.5 rounded-xl bg-[#f4f8e8] border border-[#91BE4D]/20">
                <div>
                  <p className="text-sm font-semibold text-gray-800">{r.user?.name || 'Player'}</p>
                  <p className="text-xs text-gray-500">{[r.user?.city, r.user?.state].filter(Boolean).join(', ') || 'India'}</p>
                </div>
                <div className="flex gap-2">
                  <button type="button" onClick={() => handleAcceptRequest(r)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-[#4a6e10] text-white hover:bg-[#2d7005] transition-colors">
                    Accept
                  </button>
                  <button type="button" onClick={() => handleRejectRequest(r.id)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-gray-100 text-gray-600 hover:bg-red-50 hover:text-red-600 transition-colors">
                    Decline
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Friends section */}
      <FriendsSection friends={friends} onViewCalendar={setFriendCalendarTarget} />

      {/* Search + filter bar */}
      <div className="mb-5 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M16.65 10.5a6.15 6.15 0 11-12.3 0 6.15 6.15 0 0112.3 0z" />
            </svg>
            <input type="text" value={filters.search} onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search players by name…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]" />
          </div>

          <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#91BE4D] bg-white text-gray-700 hidden sm:block">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          <button onClick={() => setShowFilters((v) => !v)}
            className={`relative flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2.5 rounded-xl border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#f4f8e8] border-[#91BE4D]/40 text-[#4a6e10]'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 4h18M7 12h10M11 20h2" />
            </svg>
            <span className="hidden sm:inline">Filters</span>
            {activeFilterCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-4 h-4 text-[10px] font-bold bg-[#91BE4D] text-white rounded-full flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        <div className="sm:hidden">
          <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#91BE4D] bg-white text-gray-700">
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {showFilters && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">State</label>
              <select value={filters.state} onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#91BE4D] bg-white">
                <option value="">All states</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Min DUPR</label>
              <input type="number" step="0.5" min="1" max="8" value={filters.minDupr}
                onChange={(e) => setFilters((f) => ({ ...f, minDupr: e.target.value }))} placeholder="e.g. 3.0"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Max DUPR</label>
              <input type="number" step="0.5" min="1" max="8" value={filters.maxDupr}
                onChange={(e) => setFilters((f) => ({ ...f, maxDupr: e.target.value }))} placeholder="e.g. 5.0"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" />
            </div>
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Category</label>
              <input type="text" value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))} placeholder="e.g. Mixed Doubles"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#91BE4D]" />
            </div>
            {activeFilterCount > 0 && (
              <div className="col-span-2 sm:col-span-4 flex justify-end">
                <button onClick={() => setFilters((f) => ({ ...f, state: '', minDupr: '', maxDupr: '', category: '' }))}
                  className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors">
                  Clear all filters
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Grid */}
      {loading && players.length === 0 ? (
        <div className="text-center py-20 text-gray-400 text-sm">Loading players…</div>
      ) : error ? (
        <div className="text-center py-20">
          <p className="text-red-500 text-sm mb-3">{error}</p>
          <button onClick={() => fetchPlayers(page, filters, debouncedSearch)}
            className="text-sm font-semibold text-[#4a6e10] hover:underline">Retry</button>
        </div>
      ) : players.length === 0 ? (
        <div className="text-center py-20">
          <p className="text-4xl mb-3">🎾</p>
          <p className="text-gray-500 font-semibold">No players found</p>
          <p className="text-gray-400 text-sm mt-1">Try adjusting your filters</p>
        </div>
      ) : (
        <>
          <div className={`grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-6 gap-3 sm:gap-4 transition-opacity ${loading ? 'opacity-60' : ''}`}>
            {players.map((p) => (
              <PlayerMiniCard key={p.id} player={p} onClick={() => setSelectedId(p.id)} />
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page === 1}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                ← Prev
              </button>
              <span className="text-sm text-gray-500 px-2">Page {page} of {totalPages}</span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page === totalPages}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed">
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Player detail modal */}
      {selectedId && (
        <PlayerModal
          playerId={selectedId}
          onClose={() => setSelectedId(null)}
          onSendFriendRequest={handleSendFriendRequest}
          friendState={friendStatusByUserId[String(selectedId)] || 'none'}
          currentUserId={user?.id}
        />
      )}

      {/* Edit profile modal */}
      {showEditProfile && (
        <EditMyCommunityProfileModal
          onClose={() => setShowEditProfile(false)}
          onSaved={() => {
            fetchPlayers(page, filters, debouncedSearch);
            showToast('Your community profile has been updated!');
          }}
        />
      )}

      {/* Consent modal for accepting friend requests */}
      {consentRequest && (
        <ConsentModal
          request={consentRequest}
          onConfirm={handleConfirmAccept}
          onCancel={() => setConsentRequest(null)}
          loading={acceptingId === consentRequest.id}
        />
      )}

      {/* Friend calendar modal */}
      {friendCalendarTarget && (
        <FriendCalendarModal
          friend={friendCalendarTarget}
          onClose={() => setFriendCalendarTarget(null)}
        />
      )}

      {/* Toast notification */}
      {toast && (
        <Toast message={toast.message} type={toast.type} onDismiss={() => setToast(null)} />
      )}
    </div>
  );
}
