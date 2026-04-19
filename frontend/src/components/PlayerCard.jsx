import React, { useRef, useState } from 'react';
import { toPng } from 'html-to-image';

const MEDAL_EMOJI = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };

export default function PlayerCard({ profile, tournaments }) {
  const cardRef = useRef(null);
  const [downloading, setDownloading] = useState(false);

  const { name, city, state, duprRating, playingSince, profilePhoto, manualAchievements } = profile;

  // Medal tally — from logged tournaments + manual past achievements
  const medals = { Gold: 0, Silver: 0, Bronze: 0 };
  (tournaments || []).forEach((t) =>
    t.categories.forEach((c) => { if (medals[c.medal] !== undefined) medals[c.medal]++; })
  );
  (manualAchievements || []).forEach((a) => {
    if (medals[a.medal] !== undefined) medals[a.medal]++;
  });
  const totalMedals = medals.Gold + medals.Silver + medals.Bronze;

  // Highlights — up to 3 recent medal entries from both sources, sorted by date desc
  const allHighlights = [];
  // From logged tournaments
  const seen = new Set();
  for (const t of [...(tournaments || [])].reverse()) {
    if (seen.has(t._id)) continue;
    const bestCat = t.categories.find((c) => c.medal && c.medal !== 'None');
    if (bestCat) {
      allHighlights.push({ name: t.name, medal: bestCat.medal, category: bestCat.categoryName, date: bestCat.date || '' });
      seen.add(t._id);
    }
  }
  // From manual achievements
  (manualAchievements || [])
    .filter((a) => a.tournamentName && a.medal && a.medal !== 'None')
    .forEach((a) => allHighlights.push({ name: a.tournamentName, medal: a.medal, category: a.categoryName || '', date: a.date || '' }));
  // Sort by date descending, take top 3
  const medalTournaments = allHighlights
    .sort((a, b) => (b.date > a.date ? 1 : -1))
    .slice(0, 3);

  const initials = (name || '?').split(' ').map((w) => w[0]).join('').slice(0, 2).toUpperCase();
  const location = [city, state].filter(Boolean).join(', ') || 'India';
  const since = playingSince ? `Since ${playingSince}` : null;

  const handleDownload = async () => {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 3, cacheBust: true });
      const a = document.createElement('a');
      a.href = dataUrl;
      a.download = `${(name || 'player').replace(/\s+/g, '-').toLowerCase()}-pickletracker-card.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (err) {
      console.error('Card download failed:', err);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col items-center gap-4">

      {/* ── The Card ── */}
      <div
        ref={cardRef}
        style={{
          width: 320,
          maxWidth: '100%',
          boxSizing: 'border-box',
          background: 'linear-gradient(160deg, #0f2206 0%, #1c3a07 40%, #2a1a00 100%)',
          borderRadius: 20,
          padding: '28px 24px 24px',
          fontFamily: "'Inter', system-ui, sans-serif",
          position: 'relative',
          overflow: 'hidden',
          boxShadow: '0 0 0 1.5px rgba(145,190,77,0.35), 0 20px 60px rgba(0,0,0,0.5)',
        }}
      >
        {/* Background glow blobs */}
        <div style={{ position: 'absolute', top: -60, right: -60, width: 200, height: 200, borderRadius: '50%', background: 'radial-gradient(circle, rgba(145,190,77,0.12) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'radial-gradient(circle, rgba(236,153,55,0.1) 0%, transparent 70%)' }} />

        {/* Header label */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.18em', color: '#91BE4D', textTransform: 'uppercase' }}>
            PickleTracker
          </span>
          {duprRating && (
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: '0.12em', color: '#ec9937', textTransform: 'uppercase' }}>
              DUPR {duprRating}
            </span>
          )}
        </div>

        {/* Photo + Name */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 20 }}>
          {/* Photo circle */}
          <div style={{
            width: 90, height: 90, borderRadius: '50%',
            background: 'linear-gradient(135deg, #2d7005, #91BE4D 45%, #ec9937)',
            padding: 3, marginBottom: 14,
            boxShadow: '0 4px 20px rgba(145,190,77,0.3)',
          }}>
            <div style={{
              width: '100%', height: '100%', borderRadius: '50%',
              overflow: 'hidden', background: '#1c3a07',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>
              {profilePhoto ? (
                <img src={profilePhoto} alt={name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <span style={{ fontSize: 28, fontWeight: 900, color: '#91BE4D' }}>{initials}</span>
              )}
            </div>
          </div>

          <div style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, fontWeight: 900, color: '#ffffff', margin: 0, lineHeight: 1.1, letterSpacing: '-0.01em' }}>
              {name || 'Player'}
            </p>
            <p style={{ fontSize: 11, color: '#91BE4D', margin: '5px 0 0', fontWeight: 600, letterSpacing: '0.04em' }}>
              📍 {location}
            </p>
            {since && (
              <p style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', margin: '3px 0 0', fontWeight: 500 }}>
                {since}
              </p>
            )}
          </div>
        </div>

        {/* Divider */}
        <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(145,190,77,0.3), transparent)', margin: '0 0 18px' }} />

        {/* Medal tally */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 24, marginBottom: 18 }}>
          {[['Gold', '🥇'], ['Silver', '🥈'], ['Bronze', '🥉']].map(([m, emoji]) => (
            <div key={m} style={{ textAlign: 'center' }}>
              <p style={{ fontSize: 22, margin: 0, lineHeight: 1 }}>{emoji}</p>
              <p style={{ fontSize: 18, fontWeight: 900, color: '#ffffff', margin: '4px 0 0', lineHeight: 1 }}>
                {medals[m]}
              </p>
              <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', margin: '2px 0 0', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
                {m}
              </p>
            </div>
          ))}
        </div>

        {/* Tournament highlights */}
        {medalTournaments.length > 0 && (
          <>
            <div style={{ height: 1, background: 'linear-gradient(to right, transparent, rgba(145,190,77,0.2), transparent)', margin: '0 0 14px' }} />
            <div>
              <p style={{ fontSize: 9, fontWeight: 800, color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase', letterSpacing: '0.15em', margin: '0 0 9px' }}>
                Highlights
              </p>
              {medalTournaments.map((t, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6, width: '100%', overflow: 'hidden' }}>
                  <span style={{ fontSize: 14, flexShrink: 0 }}>{MEDAL_EMOJI[t.medal]}</span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <p style={{ fontSize: 11, fontWeight: 700, color: '#ffffff', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {t.name}
                    </p>
                    <p style={{ fontSize: 9, color: 'rgba(255,255,255,0.4)', margin: '1px 0 0', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.category}</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        {/* Footer */}
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.08em' }}>
            pickletracker.in
          </span>
          {totalMedals > 0 && (
            <span style={{
              fontSize: 8, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase',
              padding: '3px 8px', borderRadius: 20,
              background: totalMedals >= 10 ? 'rgba(236,153,55,0.2)' : 'rgba(145,190,77,0.15)',
              color: totalMedals >= 10 ? '#ec9937' : '#91BE4D',
              border: `1px solid ${totalMedals >= 10 ? 'rgba(236,153,55,0.3)' : 'rgba(145,190,77,0.25)'}`,
            }}>
              {totalMedals >= 10 ? '🏆 Legend' : totalMedals >= 5 ? '⭐ Elite' : '✨ Rising'}
            </span>
          )}
        </div>
      </div>

      {/* Download button */}
      <button
        onClick={handleDownload}
        disabled={downloading}
        className="flex items-center gap-2 disabled:opacity-60 hover:opacity-90 text-white font-bold px-6 py-2.5 rounded-xl text-sm tracking-wide transition-opacity"
        style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
      >
        {downloading ? (
          <>
            <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            Saving…
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
            Download Card
          </>
        )}
      </button>
    </div>
  );
}
