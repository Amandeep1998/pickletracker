import React, { useRef, useState, useCallback, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { toPng } from 'html-to-image';
import { useAuth } from '../context/AuthContext';
import { ShareCard } from './TournamentShareModal';

const MEDAL_EMOJI = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };

/** Feed upcoming row → same shape as Calendar `upcomingTournaments` entries for ShareCard */
function mapFeedUpcomingToShareItems(feedItem) {
  const loc = feedItem.tournament?.location;
  const locationObj =
    loc && typeof loc === 'object'
      ? loc
      : { name: typeof loc === 'string' && loc.trim() ? loc : null };
  const cats = feedItem.categories || [];
  const dates = cats.map((c) => c.date).filter(Boolean).sort();
  return [
    {
      tournament: {
        name: feedItem.tournament.name,
        location: locationObj,
      },
      categories: cats.map((c) => ({
        categoryName: c.name ?? c.categoryName,
        date: String(c.date || '').split('T')[0],
      })),
      earliestDate: feedItem.earliestDate || dates[0] || '',
    },
  ];
}

/** Feed played/recent row → ShareCard `played` variant */
function mapFeedPlayedToShareItems(feedItem) {
  const loc = feedItem.tournament?.location;
  const locationObj =
    loc && typeof loc === 'object'
      ? loc
      : { name: typeof loc === 'string' && loc.trim() ? loc : null };
  const cats = feedItem.categories || [];
  const dates = cats.map((c) => c.date).filter(Boolean).sort();
  const earliest =
    dates[0] || (feedItem.latestDate ? String(feedItem.latestDate).split('T')[0] : '');
  return [
    {
      tournament: {
        name: feedItem.tournament.name,
        location: locationObj,
      },
      categories: cats.map((c) => ({
        categoryName: c.name ?? c.categoryName,
        date: String(c.date || '').split('T')[0],
        medal: c.medal || 'None',
      })),
      earliestDate: earliest,
    },
  ];
}

function formatDateShort(d) {
  if (!d) return '—';
  try {
    return new Date(String(d).includes('T') ? d : `${d}T12:00:00`).toLocaleDateString(undefined, {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return d;
  }
}

function formatDateRange(dates) {
  const sorted = [...new Set(dates.filter(Boolean))].sort();
  if (!sorted.length) return '';
  const fmt = (d, opts) => new Date(d).toLocaleDateString('en-IN', opts);
  if (sorted.length === 1 || sorted[0] === sorted[sorted.length - 1]) {
    return fmt(sorted[0], { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const first = new Date(sorted[0]);
  const last = new Date(sorted[sorted.length - 1]);
  if (
    first.getMonth() === last.getMonth() &&
    first.getFullYear() === last.getFullYear()
  ) {
    return `${first.getDate()}–${last.getDate()} ${fmt(sorted[0], { month: 'short', year: 'numeric' })}`;
  }
  return `${fmt(sorted[0], { day: 'numeric', month: 'short' })} – ${fmt(sorted[sorted.length - 1], { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

export default function FeedTournamentShareModal({ item, onClose }) {
  const cardRef = useRef(null);
  const [status, setStatus] = useState('idle');
  const { user } = useAuth();

  const isUpcoming = item.type === 'upcoming';
  const dates = item.categories.map((c) => c.date).filter(Boolean);
  const dateRange = formatDateRange(dates);

  const shareCardItems = useMemo(() => {
    if (isUpcoming) return mapFeedUpcomingToShareItems(item);
    return mapFeedPlayedToShareItems(item);
  }, [item, isUpcoming]);

  const cardVariant = isUpcoming ? 'upcoming' : 'played';

  const userNameForCard = item.user?.name || user?.name;
  const totalCategories = item.categories?.length ?? 0;
  const modalSubtitle = `1 tournament${totalCategories > 1 ? `, ${totalCategories} categories` : ''} · Download or share`;

  const shareUrl = typeof window !== 'undefined' ? `${window.location.origin}/calendar` : '';

  const shareText = useCallback(() => {
    const lines = [];
    lines.push(`${item.tournament.name} · PickleTracker 🏓`);
    lines.push(`${item.user.name} — ${isUpcoming ? 'Upcoming' : 'Played'}`);
    if (item.tournament.location) lines.push(`📍 ${item.tournament.location}`);
    if (dateRange) lines.push(`📅 ${dateRange}`);
    lines.push('');
    lines.push('Categories:');
    item.categories.forEach((c) => {
      const dt = formatDateShort(c.date);
      let line = `• ${c.name} (${dt})`;
      if (!isUpcoming && c.medal && c.medal !== 'None') {
        line += ` — ${MEDAL_EMOJI[c.medal] || ''} ${c.medal}`.trim();
      }
      if (isUpcoming && c.partnerName) line += ` · w/ ${c.partnerName}`;
      lines.push(line);
    });
    lines.push('');
    lines.push(shareUrl);
    return lines.join('\n');
  }, [item, isUpcoming, dateRange, shareUrl]);

  const generateImage = async () => {
    if (!cardRef.current) return null;
    setStatus('generating');
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      setStatus('idle');
      return dataUrl;
    } catch (err) {
      console.error('Feed tournament share image failed:', err);
      setStatus('error');
      return null;
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    const a = document.createElement('a');
    if (isUpcoming) {
      a.download = 'my-upcoming-tournaments.png';
    } else {
      const slug = (item.tournament.name || 'tournament').replace(/\s+/g, '-').toLowerCase();
      const safe = slug.replace(/[^a-z0-9-]/g, '') || 'tournament';
      a.download = `${safe}-pickletracker.png`;
    }
    a.href = dataUrl;
    document.body.appendChild(a);
    a.click();
    a.remove();
  };

  const handleShare = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    try {
      const blob = await (await fetch(dataUrl)).blob();
      const fileName = isUpcoming ? 'my-upcoming-tournaments.png' : 'pickletracker-tournament.png';
      const file = new File([blob], fileName, { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: isUpcoming ? 'My Upcoming Tournaments' : item.tournament.name,
          text: isUpcoming
            ? "Check out the pickleball tournaments I'm playing soon! 🏆"
            : shareText(),
        });
      } else {
        const a = document.createElement('a');
        a.download = fileName;
        a.href = dataUrl;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      /* cancelled */
    }
    setStatus('idle');
  };

  return createPortal(
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 sm:p-6">
      {/* Backdrop — full viewport, behind dialog */}
      <button
        type="button"
        className="absolute inset-0 z-0 bg-black/60 backdrop-blur-[2px] cursor-default border-0 p-0"
        aria-label="Close dialog"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="feed-share-title"
        className="relative z-10 flex w-full max-w-xl lg:max-w-2xl flex-col rounded-2xl bg-white shadow-2xl max-h-[min(88vh,920px)] min-h-0 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-5 sm:px-6 pt-5 pb-4 border-b border-gray-100 shrink-0 rounded-t-2xl bg-white">
          <div>
            <p id="feed-share-title" className="text-lg sm:text-xl font-bold text-gray-900">
              {isUpcoming ? 'Share Upcoming Tournaments' : 'Share tournament'}
            </p>
            <p className="text-sm text-gray-500 mt-1">{modalSubtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition shrink-0"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Only this region scrolls — keeps Download / Share always visible below */}
        <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain bg-gray-50 flex justify-center items-start py-4 px-4">
          <ShareCard ref={cardRef} items={shareCardItems} userName={userNameForCard} variant={cardVariant} />
        </div>

        <div className="px-5 sm:px-8 py-4 grid grid-cols-2 gap-3 border-t border-gray-200 shrink-0 bg-white rounded-b-2xl shadow-[0_-4px_16px_rgba(0,0,0,0.06)]">
          <button
            type="button"
            onClick={handleDownload}
            disabled={status === 'generating'}
            className="flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-semibold text-sm sm:text-base py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V4" />
            </svg>
            {status === 'generating' ? 'Wait…' : 'Download'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={status === 'generating'}
            className="flex items-center justify-center gap-2 text-white font-semibold text-sm sm:text-base py-3 rounded-xl transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {status === 'generating' ? 'Generating…' : 'Share'}
          </button>
        </div>

        <p className="text-center text-xs sm:text-sm text-gray-400 pb-5 px-6 pt-0 leading-relaxed shrink-0">
          On mobile, tap Share to post directly. On desktop, download and upload to Instagram.
        </p>
      </div>
    </div>,
    document.body,
  );
}
