import React, { useCallback, useEffect, useRef, useState } from 'react';
import * as api from '../services/api';

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

function rarityLabel(totalMedals) {
  if (totalMedals >= 10) return { text: '🏆 Legend', color: '#ec9937', bg: 'rgba(236,153,55,0.15)' };
  if (totalMedals >= 5)  return { text: '⭐ Elite',  color: '#91BE4D', bg: 'rgba(145,190,77,0.12)' };
  return null;
}

// ── Mini card shown in the grid ──────────────────────────────────────────────
function PlayerMiniCard({ player, onClick }) {
  const { name, city, state, profilePhoto, duprRating, medals, totalMedals, topCategories } = player;
  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const location = [city, state].filter(Boolean).join(', ') || 'India';
  const rarity = rarityLabel(totalMedals || 0);

  return (
    <button
      onClick={onClick}
      className="w-full text-left rounded-2xl overflow-hidden shadow-sm border border-gray-100 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 bg-white"
    >
      {/* Card top — dark gradient */}
      <div
        className="relative px-4 pt-5 pb-4 flex flex-col items-center"
        style={{ background: 'linear-gradient(160deg, #0f2206 0%, #1c3a07 50%, #2a1a00 100%)' }}
      >
        {/* Glow */}
        <div className="absolute top-0 right-0 w-24 h-24 rounded-full opacity-10"
          style={{ background: 'radial-gradient(circle, #91BE4D 0%, transparent 70%)' }} />

        {/* Photo */}
        <div className="w-16 h-16 rounded-full flex-shrink-0 mb-3"
          style={{ background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)', padding: 2.5 }}>
          <div className="w-full h-full rounded-full overflow-hidden bg-[#1c3a07] flex items-center justify-center">
            {profilePhoto
              ? <img src={profilePhoto} alt={name} className="w-full h-full object-cover" />
              : <span className="text-lg font-black text-[#91BE4D]">{initials}</span>
            }
          </div>
        </div>

        <p className="text-white font-bold text-sm text-center leading-tight mb-0.5 line-clamp-1">{name}</p>
        <p className="text-[#91BE4D] text-[10px] font-semibold text-center">📍 {location}</p>

        {duprRating && (
          <p className="text-[#ec9937] text-[10px] font-bold mt-1">DUPR {duprRating}</p>
        )}

        {rarity && (
          <span className="mt-2 text-[9px] font-bold px-2 py-0.5 rounded-full"
            style={{ color: rarity.color, background: rarity.bg, border: `1px solid ${rarity.color}40` }}>
            {rarity.text}
          </span>
        )}
      </div>

      {/* Card bottom — white */}
      <div className="px-4 py-3">
        {/* Medal row */}
        <div className="flex justify-around mb-2.5">
          {['Gold', 'Silver', 'Bronze'].map((m) => (
            <div key={m} className="flex flex-col items-center">
              <span className="text-base">{MEDAL_EMOJI[m]}</span>
              <span className="text-sm font-black text-gray-800">{medals?.[m] ?? 0}</span>
              <span className="text-[9px] text-gray-400 uppercase tracking-wide">{m}</span>
            </div>
          ))}
        </div>

        {/* Top category chips */}
        {topCategories?.length > 0 && (
          <div className="flex flex-wrap gap-1 justify-center">
            {topCategories.slice(0, 2).map((c) => (
              <span key={c.name} className="text-[10px] font-semibold bg-[#f4f8e8] text-[#4a6e10] px-2 py-0.5 rounded-full border border-[#91BE4D]/20">
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
function PlayerModal({ playerId, onClose }) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api.getPlayer(playerId)
      .then((res) => setPlayer(res.data.data))
      .catch(() => setError('Could not load player profile.'))
      .finally(() => setLoading(false));
  }, [playerId]);

  const rarity = player ? rarityLabel(player.totalMedals || 0) : null;

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
                {player.duprRating && (
                  <div className="text-center">
                    <p className="text-[#ec9937] text-sm font-black">DUPR {player.duprRating}</p>
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
            </div>

            {/* Stats */}
            <div className="px-6 py-5 space-y-5">

              {/* Tournaments + medals */}
              <div>
                <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-3">Stats</p>
                <div className="grid grid-cols-4 gap-2 text-center">
                  <div className="bg-gray-50 rounded-xl p-3">
                    <p className="text-lg font-black text-gray-800">{player.totalTournaments}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Events</p>
                  </div>
                  {['Gold', 'Silver', 'Bronze'].map((m) => (
                    <div key={m} className="bg-gray-50 rounded-xl p-3">
                      <p className="text-lg">{MEDAL_EMOJI[m]}</p>
                      <p className="text-base font-black text-gray-800">{player.medals?.[m] ?? 0}</p>
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

// ── Main Players page ────────────────────────────────────────────────────────
export default function Players() {
  const [players, setPlayers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedId, setSelectedId] = useState(null);
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState({
    search: '',
    state: '',
    minDupr: '',
    maxDupr: '',
    category: '',
    sort: 'medals',
  });

  // Debounced search
  const searchTimer = useRef(null);
  const [debouncedSearch, setDebouncedSearch] = useState('');

  const handleSearchChange = (val) => {
    setFilters((f) => ({ ...f, search: val }));
    clearTimeout(searchTimer.current);
    searchTimer.current = setTimeout(() => setDebouncedSearch(val), 400);
  };

  const fetchPlayers = useCallback(async (pageNum, f, search) => {
    setLoading(true);
    setError('');
    try {
      const params = {
        page: pageNum,
        limit: 24,
        sort: f.sort,
      };
      if (search)    params.search   = search;
      if (f.state)   params.state    = f.state;
      if (f.minDupr) params.minDupr  = f.minDupr;
      if (f.maxDupr) params.maxDupr  = f.maxDupr;
      if (f.category) params.category = f.category;

      const res = await api.getPlayers(params);
      setPlayers(res.data.data);
      setTotal(res.data.total);
    } catch {
      setError('Could not load players. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  // Fetch on filter or page change
  useEffect(() => {
    fetchPlayers(page, filters, debouncedSearch);
  }, [fetchPlayers, page, filters.state, filters.minDupr, filters.maxDupr, filters.category, filters.sort, debouncedSearch]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [filters.state, filters.minDupr, filters.maxDupr, filters.category, filters.sort, debouncedSearch]);

  const totalPages = Math.ceil(total / 24);
  const activeFilterCount = [filters.state, filters.minDupr, filters.maxDupr, filters.category]
    .filter(Boolean).length;

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
              {total > 0 ? `${total} player${total !== 1 ? 's' : ''} found` : 'Discover the pickleball community'}
            </p>
          </div>
          <div className="ml-auto text-4xl select-none">🏓</div>
        </div>
      </div>

      {/* Search + filter bar */}
      <div className="mb-5 space-y-3">
        <div className="flex gap-2">
          {/* Search box */}
          <div className="flex-1 relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-4.35-4.35M16.65 10.5a6.15 6.15 0 11-12.3 0 6.15 6.15 0 0112.3 0z" />
            </svg>
            <input
              type="text"
              value={filters.search}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search players by name…"
              className="w-full pl-9 pr-4 py-2.5 text-sm border border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D]"
            />
          </div>

          {/* Sort */}
          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
            className="text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#91BE4D] bg-white text-gray-700 hidden sm:block"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>

          {/* Filter toggle */}
          <button
            onClick={() => setShowFilters((v) => !v)}
            className={`relative flex items-center gap-1.5 text-sm font-semibold px-3.5 py-2.5 rounded-xl border transition-colors ${
              showFilters || activeFilterCount > 0
                ? 'bg-[#f4f8e8] border-[#91BE4D]/40 text-[#4a6e10]'
                : 'bg-white border-gray-200 text-gray-600 hover:border-gray-300'
            }`}
          >
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

        {/* Sort (mobile) */}
        <div className="sm:hidden">
          <select
            value={filters.sort}
            onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}
            className="w-full text-sm border border-gray-200 rounded-xl px-3 py-2.5 focus:outline-none focus:ring-2 focus:ring-[#91BE4D] bg-white text-gray-700"
          >
            {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
          </select>
        </div>

        {/* Filter panel */}
        {showFilters && (
          <div className="bg-white border border-gray-100 rounded-2xl p-4 shadow-sm grid grid-cols-2 sm:grid-cols-4 gap-3">
            {/* State */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">State</label>
              <select
                value={filters.state}
                onChange={(e) => setFilters((f) => ({ ...f, state: e.target.value }))}
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#91BE4D] bg-white"
              >
                <option value="">All states</option>
                {INDIAN_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            {/* Min DUPR */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Min DUPR</label>
              <input
                type="number" step="0.5" min="1" max="8"
                value={filters.minDupr}
                onChange={(e) => setFilters((f) => ({ ...f, minDupr: e.target.value }))}
                placeholder="e.g. 3.0"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
              />
            </div>

            {/* Max DUPR */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Max DUPR</label>
              <input
                type="number" step="0.5" min="1" max="8"
                value={filters.maxDupr}
                onChange={(e) => setFilters((f) => ({ ...f, maxDupr: e.target.value }))}
                placeholder="e.g. 5.0"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
              />
            </div>

            {/* Category */}
            <div>
              <label className="block text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-1">Category</label>
              <input
                type="text"
                value={filters.category}
                onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value }))}
                placeholder="e.g. Mixed Doubles"
                className="w-full text-sm border border-gray-200 rounded-lg px-2 py-2 focus:outline-none focus:ring-2 focus:ring-[#91BE4D]"
              />
            </div>

            {/* Clear filters */}
            {activeFilterCount > 0 && (
              <div className="col-span-2 sm:col-span-4 flex justify-end">
                <button
                  onClick={() => setFilters((f) => ({ ...f, state: '', minDupr: '', maxDupr: '', category: '' }))}
                  className="text-xs font-semibold text-gray-400 hover:text-red-500 transition-colors"
                >
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
          <p className="text-4xl mb-3">🏓</p>
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 mt-8">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page === 1}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                ← Prev
              </button>
              <span className="text-sm text-gray-500 px-2">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                className="px-4 py-2 text-sm font-semibold rounded-xl border border-gray-200 text-gray-600 hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next →
              </button>
            </div>
          )}
        </>
      )}

      {/* Player detail modal */}
      {selectedId && (
        <PlayerModal playerId={selectedId} onClose={() => setSelectedId(null)} />
      )}
    </div>
  );
}
