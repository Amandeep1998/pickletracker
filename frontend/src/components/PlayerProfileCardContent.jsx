import React, { useMemo } from 'react';

const MEDAL_EMOJI = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };

export const ADD_FRIEND_BENEFIT =
  'Friends see each other\'s tournament & session calendar so plans stay in sync. Entry fees, expenses, and earnings stay private.';

const MEDAL_RESULT_CLASS = {
  Gold: 'bg-[#FFD700] text-yellow-950 font-bold',
  Silver: 'bg-[#d4d4d4] text-gray-800 font-bold',
  Bronze: 'bg-[#CD7F32] text-white font-bold',
};

export function profileBannerTitle(totalMedals) {
  const n = totalMedals || 0;
  if (n >= 12) return 'Veteran Podium Finisher';
  if (n >= 8) return 'Elite Podium Finisher';
  if (n >= 5) return 'Elite Competitor';
  if (n >= 1) return 'Podium Contender';
  return 'PickleTracker Player';
}

function formatHistoryDate(d) {
  if (!d) return '—';
  try {
    const raw = String(d).trim();
    const x = new Date(raw.includes('T') ? raw : `${raw}T12:00:00`);
    if (Number.isNaN(x.getTime())) return raw;
    return x.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return d;
  }
}

function draftPitch(player) {
  const first = (player.name || 'This player').split(' ')[0];
  const pods = player.totalMedals || 0;
  const top = player.topCategories?.[0]?.name;
  const dupr = player.duprDoubles ?? player.duprSingles ?? player.duprRating ?? null;
  if (pods >= 1 && top && dupr != null) {
    return `${first} brings a ${top} focus and a ${dupr} DUPR — with ${pods} career podium${pods !== 1 ? 's' : ''} tracked on PickleTracker.`;
  }
  if (pods >= 1 && top) {
    return `${first} is a ${top}-focused competitor with ${pods} career podium${pods !== 1 ? 's' : ''} on record.`;
  }
  if (dupr != null) {
    return `${first} lists a DUPR of ${dupr} and is building their tournament history on PickleTracker.`;
  }
  return `${first} is on PickleTracker — follow their results as they log tournaments and medals.`;
}

/**
 * Public player card body — same layout as the feed / Nearby profile modal (no email or phone).
 */
export default function PlayerProfileCardContent({
  player,
  currentUserId,
  friendState = 'none',
  sending = false,
  onFriendClick,
  onOpenFriendCalendar,
  showCloseButton = false,
  onClose,
  isOwnProfile = false,
}) {
  const historyRows = useMemo(() => {
    if (!player?.achievements?.length) return [];
    return [...player.achievements]
      .filter((a) => a.medal && a.medal !== 'None')
      .sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')))
      .slice(0, 18);
  }, [player]);

  const bannerTitle = profileBannerTitle(player?.totalMedals || 0);
  const firstName = (player?.name || 'Player').split(' ')[0];

  if (!player) return null;

  return (
    <div className="flex flex-col min-h-0 h-full min-w-0 overflow-x-hidden">
      <div className="relative shrink-0 bg-[#1e3a5f] text-white text-center py-2.5 sm:py-3.5 px-10 sm:px-12 shadow-md">
        {showCloseButton && onClose && (
          <button
            type="button"
            onClick={onClose}
            className="absolute top-1/2 -translate-y-1/2 right-3 text-white/70 hover:text-white p-2 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
        <p className="text-[11px] sm:text-xs font-black tracking-[0.22em] uppercase leading-snug">{bannerTitle}</p>
      </div>

      <div className="overflow-y-auto flex-1 min-h-0">
        <div className="bg-white border-b border-gray-200 px-3 py-2.5 sm:px-4 sm:py-4 min-w-0">
          <div className="flex gap-2.5 sm:gap-4 min-w-0">
            {/* Narrower / shorter on mobile so tournament history sits higher in the modal */}
            <div className="w-[72px] h-[96px] sm:w-[34%] sm:max-w-[130px] sm:h-auto shrink-0">
              <div className="h-full w-full sm:aspect-[3/4] rounded-lg overflow-hidden bg-slate-100 border border-slate-200 shadow-inner">
                {player.profilePhoto ? (
                  <img src={player.profilePhoto} alt="" className="w-full h-full object-cover object-top" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#1e3a5f] to-[#2d5a87] text-white text-lg sm:text-2xl font-black">
                    {(player.name || '?')
                      .split(' ')
                      .map((w) => w[0])
                      .join('')
                      .slice(0, 2)
                      .toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            <div className="flex-1 min-w-0 pt-0">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 leading-tight tracking-tight break-words">{player.name}</h2>
                    <p className="text-xs sm:text-sm text-gray-600 mt-0.5 sm:mt-1">
                      {player.city?.trim()
                        ? player.city.trim()
                        : player.playingSince
                          ? `Playing since ${player.playingSince}`
                          : 'PickleTracker member'}
                    </p>

              <hr className="my-2 sm:my-3 border-gray-200" />

              <div className="space-y-1 text-xs sm:text-sm text-gray-800">
                {(() => {
                  const s = player.duprSingles ?? null;
                  const d = player.duprDoubles ?? null;
                  const legacy = player.duprRating ?? null;
                  if (s != null && d != null) {
                    return (
                      <p className="leading-snug text-[11px] sm:text-xs md:text-sm">
                        <span className="font-bold text-[#1e3a5f]">DUPR</span>
                        <span className="text-gray-500 font-medium"> — Singles </span>
                        <span className="tabular-nums font-semibold text-gray-900">{s}</span>
                        <span className="text-gray-300 mx-1 sm:mx-1.5" aria-hidden>
                          ·
                        </span>
                        <span className="text-gray-500 font-medium">Doubles </span>
                        <span className="tabular-nums font-semibold text-gray-900">{d}</span>
                      </p>
                    );
                  }
                  if (s != null) {
                    return (
                      <p>
                        <span className="font-bold text-[#1e3a5f]">DUPR — Singles:</span>{' '}
                        <span className="tabular-nums">{s}</span>
                      </p>
                    );
                  }
                  if (d != null) {
                    return (
                      <p>
                        <span className="font-bold text-[#1e3a5f]">DUPR — Doubles:</span>{' '}
                        <span className="tabular-nums">{d}</span>
                      </p>
                    );
                  }
                  if (legacy != null) {
                    return (
                      <p>
                        <span className="font-bold text-[#1e3a5f]">DUPR rating:</span>{' '}
                        <span className="tabular-nums">{legacy}</span>
                      </p>
                    );
                  }
                  return null;
                })()}
              </div>

              <p className="text-[9px] sm:text-[10px] font-bold text-gray-500 uppercase tracking-wider mt-1.5 mb-0.5 sm:mt-2 sm:mb-1">Career medal tally</p>
              {/* Single compact row — much shorter than 2×2 grid on mobile */}
              <div className="grid grid-cols-4 gap-px rounded-lg border border-gray-200 bg-gray-200 overflow-hidden shadow-sm text-center">
                {['Gold', 'Silver', 'Bronze'].map((m) => (
                  <div
                    key={m}
                    className="bg-slate-50 py-1 sm:py-1.5 px-0.5 sm:px-1 flex flex-col items-center justify-center min-w-0 leading-none"
                  >
                    <div className="flex items-center justify-center gap-0.5">
                      <span className="text-[11px] sm:text-sm leading-none">{MEDAL_EMOJI[m]}</span>
                      <span className="text-xs sm:text-sm font-black text-gray-900 tabular-nums">{player.medals?.[m] ?? 0}</span>
                    </div>
                    <span className="text-[7px] sm:text-[8px] text-gray-500 font-medium mt-0.5 leading-none">{m}</span>
                  </div>
                ))}
                <div className="bg-[#1e3a5f]/[0.07] py-1 sm:py-1.5 px-0.5 sm:px-1 flex flex-col items-center justify-center min-w-0 border-l border-[#1e3a5f]/10">
                  <span className="text-[7px] sm:text-[8px] font-bold text-[#1e3a5f] uppercase tracking-wide leading-none">
                    Total
                  </span>
                  <span className="text-xs sm:text-sm font-black text-[#1e3a5f] tabular-nums leading-none mt-0.5">
                    {player.totalMedals ?? 0}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {currentUserId && String(player.id) !== String(currentUserId) && (
          <div className="px-4 py-2 sm:py-2.5 bg-[#f8fafc] border-b border-gray-200 space-y-1.5 sm:space-y-2">
            {friendState === 'friend' ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200/80">
                  <svg className="w-4 h-4 text-emerald-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                  <span className="text-sm font-bold text-emerald-800">Friends</span>
                </div>
                <button
                  type="button"
                  onClick={() =>
                    onOpenFriendCalendar?.({
                      id: player.id,
                      name: player.name,
                      city: player.city,
                      profilePhoto: player.profilePhoto,
                    })
                  }
                  className="w-full flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 rounded-xl text-white hover:opacity-95 transition-opacity shadow"
                  style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  View calendar
                </button>
              </div>
            ) : (
              <>
                {friendState === 'none' && (
                  <p className="text-[11px] text-gray-600 text-center leading-snug px-0.5">{ADD_FRIEND_BENEFIT}</p>
                )}
                {friendState === 'pending' && (
                  <p className="text-[11px] text-gray-500 text-center leading-snug px-0.5">
                    When they accept, open <span className="font-semibold text-gray-700">View calendar</span> here to see their schedule.
                  </p>
                )}
                <button
                  type="button"
                  onClick={onFriendClick}
                  disabled={friendState === 'pending' || sending}
                  className={`w-full py-2.5 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all shadow ${
                    friendState === 'pending'
                      ? 'bg-orange-50 text-orange-700 border border-orange-200 cursor-default'
                      : 'text-white hover:opacity-95 disabled:opacity-60 border border-transparent'
                  }`}
                  style={friendState !== 'pending' ? { background: 'linear-gradient(to right, #1e3a5f, #2563ab)' } : {}}
                >
                  {sending ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                      </svg>
                      Sending…
                    </>
                  ) : friendState === 'pending' ? (
                    'Request sent'
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                      </svg>
                      Add Friend
                    </>
                  )}
                </button>
              </>
            )}
          </div>
        )}

        <div className="px-3 py-3 sm:px-4 sm:py-4">
          <div className="rounded-lg border border-gray-200 overflow-hidden bg-white shadow-sm">
            <div className="bg-gray-100 px-3 py-1.5 sm:py-2.5 text-center border-b border-gray-200">
              <span className="text-xs font-bold text-[#1e3a5f] uppercase tracking-[0.12em]">Tournament history</span>
            </div>
            {historyRows.length === 0 ? (
              <p className="text-sm text-gray-500 text-center py-8 px-4">No podium results logged yet.</p>
            ) : (
              <>
                {/* Mobile / narrow: stacked rows — no horizontal scroll */}
                <ul className="md:hidden divide-y divide-gray-100">
                  {historyRows.map((row, i) => (
                    <li
                      key={`m-${row.tournamentName}-${row.date}-${i}`}
                      className={`px-3 py-2 sm:py-2.5 ${i % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}`}
                    >
                      <p className="text-sm font-semibold text-gray-900 leading-snug break-words">{row.tournamentName || '—'}</p>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-gray-600">
                        <span className="font-medium text-gray-700">{row.categoryName || '—'}</span>
                        <span className="text-gray-300 select-none" aria-hidden>
                          ·
                        </span>
                        <span className="text-gray-500 tabular-nums">{formatHistoryDate(row.date)}</span>
                      </div>
                      <div className="mt-2">
                        <span
                          className={`inline-block px-2 py-1 rounded-md text-[11px] font-bold uppercase tracking-wide ${
                            MEDAL_RESULT_CLASS[row.medal] || 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {row.medal}
                        </span>
                      </div>
                    </li>
                  ))}
                </ul>
                {/* md+: compact table */}
                <div className="hidden md:block overflow-x-hidden">
                  <table className="w-full table-fixed text-left text-xs min-w-0">
                    <thead>
                      <tr className="bg-gray-50 text-[10px] text-gray-500 uppercase tracking-wide border-b border-gray-200">
                        <th className="px-2 py-2 font-semibold w-[38%]">Tournament</th>
                        <th className="px-2 py-2 font-semibold w-[22%]">Category</th>
                        <th className="px-2 py-2 font-semibold w-[22%]">Date</th>
                        <th className="px-2 py-2 font-semibold text-center w-[18%]">Result</th>
                      </tr>
                    </thead>
                    <tbody>
                      {historyRows.map((row, i) => (
                        <tr
                          key={`${row.tournamentName}-${row.date}-${i}`}
                          className={`border-b border-gray-100 last:border-0 ${i % 2 === 1 ? 'bg-slate-50/80' : 'bg-white'}`}
                        >
                          <td className="px-2 py-2 font-medium text-gray-900 align-top min-w-0">
                            <span className="line-clamp-3 break-words">{row.tournamentName || '—'}</span>
                          </td>
                          <td className="px-2 py-2 text-gray-600 align-top min-w-0 break-words">{row.categoryName || '—'}</td>
                          <td className="px-2 py-2 text-gray-500 tabular-nums align-top whitespace-nowrap">{formatHistoryDate(row.date)}</td>
                          <td className="px-1 py-2 text-center align-top">
                            <span
                              className={`inline-block max-w-full px-1.5 py-1 rounded text-[10px] uppercase tracking-wide ${
                                MEDAL_RESULT_CLASS[row.medal] || 'bg-gray-100 text-gray-700'
                              }`}
                            >
                              {row.medal}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="px-4 pb-2">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight mb-2">
            {isOwnProfile ? 'Your spotlight' : `Why follow ${firstName}?`}
          </h3>
          <p className="text-sm text-gray-600 leading-relaxed">{draftPitch(player)}</p>
        </div>

        {player.topCategories?.length > 0 && (
          <div className="px-4 pb-4">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest mb-2">Favorite categories</p>
            <div className="flex flex-wrap gap-1.5">
              {player.topCategories.map((c) => (
                <span
                  key={c.name}
                  className="text-xs font-semibold bg-white text-[#1e3a5f] px-2.5 py-1 rounded-md border border-slate-200 shadow-sm"
                >
                  {c.name} <span className="text-slate-400">×{c.count}</span>
                </span>
              ))}
            </div>
          </div>
        )}

        <p className="text-[10px] text-gray-400 text-center px-4 pb-5">
          Member since{' '}
          {player.memberSince
            ? new Date(player.memberSince).toLocaleDateString(undefined, { month: 'short', year: 'numeric' })
            : '—'}
        </p>
      </div>
    </div>
  );
}
