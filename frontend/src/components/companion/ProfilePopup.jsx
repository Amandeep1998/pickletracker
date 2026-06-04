import React from 'react';
import { T } from './theme';
import { MedalDot } from './Cards';

/**
 * Premium player-profile popup (modal overlay) shown when a feed row's
 * "View profile" is tapped. Photo + medal tally + top categories + recent
 * wins. No DUPR — medal-first, consistent with the companion player card.
 *
 * player: GET /api/players/:id data, or null while loading.
 * onClose() — dismiss.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const fmtDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return '';
  const [, m, d] = iso.split('-');
  return `${MONTHS[+m - 1]} ${+d}`;
};
const medalKey = (m) => ({ Gold: 'gold', Silver: 'silver', Bronze: 'bronze' }[m] || null);

function MedalTile({ medal, n, label }) {
  return (
    <div style={{ flex: 1, background: T.navy3, borderRadius: 12, padding: '12px 6px', textAlign: 'center' }}>
      <div style={{ display: 'flex', justifyContent: 'center', lineHeight: 1 }}>
        <MedalDot medal={medal} size={24} />
      </div>
      <div style={{ fontSize: 20, fontWeight: 800, color: T.lime, marginTop: 4 }}>{n}</div>
      <div style={{ fontSize: 11, color: T.muted, marginTop: 2 }}>{label}</div>
    </div>
  );
}

export default function ProfilePopup({ player, loading, onClose }) {
  const p = player || {};
  const m = p.medals || {};
  const top = p.topCategories || [];
  const wins = p.recentMedalTournaments || [];

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 16,
        fontFamily: T.font,
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: '100%',
          maxWidth: 420,
          maxHeight: '88vh',
          background: `linear-gradient(160deg, ${T.navy2} 0%, ${T.navy} 100%)`,
          color: T.white,
          borderRadius: T.radius,
          border: `1px solid ${T.navy3}`,
          overflowX: 'hidden',
          overflowY: 'auto',
        }}
      >
        <div style={{ height: 5, background: T.lime, position: 'sticky', top: 0 }} />
        <div style={{ padding: 18 }}>
          {/* close */}
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: -6 }}>
            <button
              type="button"
              onClick={onClose}
              style={{
                background: 'transparent',
                border: 'none',
                color: T.muted,
                fontSize: 20,
                cursor: 'pointer',
                lineHeight: 1,
                padding: 0,
              }}
            >
              ✕
            </button>
          </div>

          {loading || !player ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: T.muted, fontSize: 14 }}>Loading…</div>
          ) : (
            <>
              {/* header */}
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
                <div
                  style={{
                    width: 92,
                    height: 92,
                    borderRadius: '50%',
                    border: `3px solid ${T.lime}`,
                    overflow: 'hidden',
                    background: T.navy3,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {p.profilePhoto ? (
                    <img src={p.profilePhoto} alt={p.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <span style={{ fontSize: 38, fontWeight: 800, color: T.lime }}>
                      {(p.name?.[0] || '?').toUpperCase()}
                    </span>
                  )}
                </div>
                <div style={{ fontSize: 19, fontWeight: 800, marginTop: 10 }}>{p.name || 'Player'}</div>
                <div style={{ fontSize: 12.5, color: T.muted, marginTop: 2 }}>
                  {[p.city, `${p.totalMedals || 0} medals`, `${p.totalTournaments || 0} tournaments`]
                    .filter(Boolean)
                    .join(' · ')}
                </div>
              </div>

              {/* medals */}
              <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
                <MedalTile medal="gold" n={m.Gold || 0} label="Gold" />
                <MedalTile medal="silver" n={m.Silver || 0} label="Silver" />
                <MedalTile medal="bronze" n={m.Bronze || 0} label="Bronze" />
              </div>

              {/* top categories */}
              {top.length > 0 && (
                <div style={{ marginTop: 16 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.muted }}>PLAYS MOST</div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                    {top.map((c, i) => (
                      <span
                        key={i}
                        style={{
                          fontSize: 12,
                          fontWeight: 700,
                          padding: '4px 10px',
                          borderRadius: 999,
                          background: T.navy3,
                        }}
                      >
                        {c.name} · {c.count}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* recent wins */}
              <div style={{ marginTop: 16 }}>
                <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: 0.6, color: T.muted }}>RECENT WINS</div>
                {wins.length === 0 ? (
                  <div style={{ fontSize: 13, color: T.muted, marginTop: 8 }}>No medals logged yet.</div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 8 }}>
                    {wins.map((w, i) => (
                      <div
                        key={i}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: 10,
                          background: T.navy3,
                          borderRadius: 10,
                          padding: '9px 11px',
                        }}
                      >
                        <MedalDot medal={medalKey(w.medal)} size={20} />
                        <div style={{ minWidth: 0, flex: 1 }}>
                          <div
                            style={{
                              fontSize: 13.5,
                              fontWeight: 700,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {w.tournamentName}
                          </div>
                          <div style={{ fontSize: 11.5, color: T.muted }}>
                            {[w.category, fmtDate(w.date)].filter(Boolean).join(' · ')}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
