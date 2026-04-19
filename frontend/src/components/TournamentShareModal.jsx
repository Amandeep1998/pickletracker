import React, { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import { useAuth } from '../context/AuthContext';

// ── The actual share card image (rendered off-screen, captured by html-to-image) ──
export const ShareCard = React.forwardRef(function ShareCard({ items, userName }, ref) {
  const firstName = userName?.split(' ')[0] || 'Player';

  const formatDate = (dateStr) => {
    const [y, m, d] = dateStr.split('-');
    return new Date(y, m - 1, d).toLocaleDateString(undefined, {
      day: 'numeric', month: 'short',
    });
  };

  const getDaysUntil = (dateStr) => {
    const today = new Date(); today.setHours(0, 0, 0, 0);
    const target = new Date(dateStr + 'T00:00:00');
    const diff = Math.round((target - today) / 86400000);
    if (diff === 0) return 'Today';
    if (diff === 1) return 'Tomorrow';
    return `in ${diff} days`;
  };

  return (
    <div
      ref={ref}
      style={{
        width: 360,
        background: 'linear-gradient(145deg, #1c350a 0%, #2d6e05 40%, #1a4a08 70%, #a86010 100%)',
        borderRadius: 24,
        padding: 28,
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Decorative blobs */}
      <div style={{ position: 'absolute', top: -50, right: -50, width: 200, height: 200, borderRadius: '50%', background: 'rgba(145,190,77,0.12)', pointerEvents: 'none' }} />
      <div style={{ position: 'absolute', bottom: -40, left: -40, width: 160, height: 160, borderRadius: '50%', background: 'rgba(236,153,55,0.1)', pointerEvents: 'none' }} />

      {/* Branding row */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 22 }}>
        <div style={{ width: 30, height: 30, borderRadius: 8, background: 'rgba(145,190,77,0.15)', border: '1px solid rgba(145,190,77,0.3)', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <span style={{ color: '#c8e875', fontSize: 13, fontWeight: 900, letterSpacing: '-0.5px', lineHeight: 1 }}>PT</span>
        </div>
        <span style={{ color: '#91BE4D', fontSize: 11, fontWeight: 800, letterSpacing: '0.18em', textTransform: 'uppercase' }}>
          PickleTracker
        </span>
      </div>

      {/* Headline */}
      {(() => {
        const totalCats = items.reduce((s, i) => s + i.categories.length, 0);
        const multipleCats = totalCats > items.length;
        return (
          <div style={{ marginBottom: 20 }}>
            <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 8 }}>
              {firstName}'s upcoming tournaments
            </p>
            <p style={{ color: 'white', fontSize: 20, fontWeight: 900, lineHeight: 1.3, margin: 0 }}>
              I'm playing{' '}
              <span style={{ color: '#c8e875' }}>{items.length}</span>
              {items.length === 1 ? ' tournament' : ' tournaments'}
              {multipleCats && (
                <span>
                  {' '}across{' '}
                  <span style={{ color: '#ffd580' }}>{totalCats}</span>
                  {' categories'}
                </span>
              )}
              {' '}soon 🏆
            </p>
          </div>
        );
      })()}

      {/* Tournament rows — one per tournament, categories listed below */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 22 }}>
        {items.slice(0, 5).map((item, i) => {
          // Group categories by date for compact display
          const dateGroups = {};
          item.categories.forEach((cat) => {
            const d = cat.date;
            if (!dateGroups[d]) dateGroups[d] = [];
            dateGroups[d].push(cat.categoryName);
          });
          const sortedDates = Object.keys(dateGroups).sort();
          const showDatePerCat = sortedDates.length > 1; // categories on different dates

          return (
            <div
              key={i}
              style={{
                background: 'rgba(255,255,255,0.07)',
                borderRadius: 12,
                padding: '10px 14px',
                border: '1px solid rgba(145,190,77,0.18)',
              }}
            >
              {/* Tournament name + countdown */}
              <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                <p style={{ color: 'white', fontSize: 13, fontWeight: 700, margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                  {item.tournament.name}
                </p>
                <span style={{ background: 'rgba(145,190,77,0.22)', color: '#c8e875', fontSize: 10, fontWeight: 700, padding: '3px 8px', borderRadius: 20, whiteSpace: 'nowrap', flexShrink: 0 }}>
                  {getDaysUntil(item.earliestDate)}
                </span>
              </div>

              {/* Location */}
              {item.tournament.location?.name && (
                <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: 10, margin: '3px 0 4px' }}>
                  📍 {item.tournament.location.name}
                </p>
              )}

              {/* Categories — with date if they span multiple days */}
              <div style={{ marginTop: 5, display: 'flex', flexDirection: 'column', gap: 3 }}>
                {showDatePerCat
                  ? sortedDates.map((d) => (
                      <div key={d} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: 0 }}>
                          {dateGroups[d].join(' · ')}
                        </p>
                        <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{formatDate(d)}</span>
                      </div>
                    ))
                  : (
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: 10, margin: 0 }}>
                        {item.categories.map((c) => c.categoryName).join(' · ')}
                      </p>
                      <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 10 }}>{formatDate(item.earliestDate)}</span>
                    </div>
                  )
                }
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: 14 }}>
        <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: 700, letterSpacing: '0.05em', margin: 0 }}>
          pickletracker.in
        </p>
        <p style={{ color: 'rgba(255,255,255,0.2)', fontSize: 9, margin: 0 }}>
          Track your game. Own your stats.
        </p>
      </div>
    </div>
  );
});

// ── Modal wrapper ──
export default function TournamentShareModal({ items, onClose }) {
  const cardRef = useRef(null);
  const [status, setStatus] = useState('idle'); // idle | generating | done | error
  const { user } = useAuth();

  const generateImage = useCallback(async () => {
    if (!cardRef.current) return null;
    setStatus('generating');
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      setStatus('done');
      return dataUrl;
    } catch {
      setStatus('error');
      return null;
    }
  }, []);

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    const a = document.createElement('a');
    a.download = 'my-upcoming-tournaments.png';
    a.href = dataUrl;
    a.click();
    setStatus('idle');
  };

  const handleShare = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const file = new File([blob], 'my-upcoming-tournaments.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: 'My Upcoming Tournaments',
          text: "Check out the pickleball tournaments I'm playing soon! 🏆",
        });
      } else {
        // Desktop fallback — just download
        const a = document.createElement('a');
        a.download = 'my-upcoming-tournaments.png';
        a.href = dataUrl;
        a.click();
      }
    } catch {
      // user cancelled share — not an error
    }
    setStatus('idle');
  };

  if (items.length === 0) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center" onClick={onClose}>
        <div className="absolute inset-0 bg-black/60" />
        <div className="relative bg-white rounded-2xl shadow-2xl z-10 w-full max-w-xs mx-4 p-6 text-center" onClick={(e) => e.stopPropagation()}>
          <p className="text-4xl mb-3">📅</p>
          <p className="text-base font-bold text-gray-800 mb-1">No upcoming tournaments</p>
          <p className="text-sm text-gray-400 mb-4">Add some tournaments first to share them.</p>
          <button onClick={onClose} className="text-sm font-semibold text-[#4a6e10] hover:underline">Close</button>
        </div>
      </div>
    );
  }

  // Total category count for the subtitle
  const totalCategories = items.reduce((sum, item) => sum + item.categories.length, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100">
          <div>
            <p className="text-base font-bold text-gray-900">Share Upcoming Tournaments</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {items.length} tournament{items.length !== 1 ? 's' : ''}
              {totalCategories > items.length ? `, ${totalCategories} categories` : ''}
              {' '}· Download or share
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Card preview */}
        <div className="overflow-y-auto max-h-[55vh] bg-gray-50 flex justify-center py-4 px-4">
          <ShareCard ref={cardRef} items={items} userName={user?.name} />
        </div>

        {/* Actions */}
        <div className="px-4 py-4 grid grid-cols-2 gap-2 border-t border-gray-100">
          <button
            onClick={handleDownload}
            disabled={status === 'generating'}
            className="flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
            {status === 'generating' ? 'Wait...' : 'Download'}
          </button>
          <button
            onClick={handleShare}
            disabled={status === 'generating'}
            className="flex items-center justify-center gap-2 text-white font-semibold text-sm py-2.5 rounded-xl transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {status === 'generating' ? 'Generating...' : 'Share'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pb-3 px-4">
          On mobile, tap Share to post directly. On desktop, download and upload to Instagram.
        </p>
      </div>
    </div>
  );
}
