import React, { useRef, useState, useCallback } from 'react';
import { toPng } from 'html-to-image';
import PlayerProfileCardContent from './PlayerProfileCardContent';

export default function PlayerProfileShareModal({ player, userId, onClose }) {
  const cardRef = useRef(null);
  const [status, setStatus] = useState('idle');

  const isOwnProfile = Boolean(
    userId != null && player?.id != null && String(userId) === String(player.id),
  );

  const shareUrl =
    typeof window !== 'undefined' ? `${window.location.origin}/players` : '';

  const shareMessage = useCallback(() => {
    const first = (player?.name || 'Player').split(' ')[0];
    return `${first}'s player card on PickleTracker 🏓\n${shareUrl}`;
  }, [player?.name, shareUrl]);

  const shareTitle = useCallback(() => {
    const first = (player?.name || 'Player').split(' ')[0];
    return isOwnProfile ? 'My PickleTracker player card' : `${first}'s PickleTracker player card`;
  }, [isOwnProfile, player?.name]);

  const generateImage = async () => {
    if (!cardRef.current) return null;
    setStatus('generating');
    try {
      const dataUrl = await toPng(cardRef.current, { cacheBust: true, pixelRatio: 2 });
      setStatus('idle');
      return dataUrl;
    } catch (err) {
      console.error('Player card share image failed:', err);
      setStatus('error');
      return null;
    }
  };

  const handleDownload = async () => {
    const dataUrl = await generateImage();
    if (!dataUrl) return;
    const raw = (player?.name || 'player').replace(/\s+/g, '-').toLowerCase();
    const slug = raw.replace(/[^a-z0-9-]/g, '') || 'player';
    const a = document.createElement('a');
    a.download = `${slug}-pickletracker-card.png`;
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
      const file = new File([blob], 'pickletracker-player-card.png', { type: 'image/png' });
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({
          files: [file],
          title: shareTitle(),
          text: shareMessage(),
        });
      } else {
        const a = document.createElement('a');
        a.download = 'pickletracker-player-card.png';
        a.href = dataUrl;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch {
      // user cancelled share
    }
    setStatus('idle');
  };

  if (!player) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60" />
      <div
        className="relative bg-white w-full sm:max-w-sm rounded-t-2xl sm:rounded-2xl shadow-2xl z-10 overflow-hidden max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between px-4 pt-4 pb-3 border-b border-gray-100 shrink-0">
          <div>
            <p className="text-base font-bold text-gray-900">Share player card</p>
            <p className="text-xs text-gray-400 mt-0.5">PickleTracker branding · share or download</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 transition"
            aria-label="Close"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 bg-gray-50 flex justify-center py-4 px-3">
          <div
            ref={cardRef}
            className="w-full max-w-[360px] rounded-2xl overflow-hidden shadow-lg border border-gray-200/80 bg-white"
          >
            <div
              className="flex items-center gap-2 px-3 py-2"
              style={{
                background: 'linear-gradient(145deg, #1c350a 0%, #2d6e05 45%, #1a4a08 80%)',
              }}
            >
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border border-[#91BE4D]/40"
                style={{ background: 'rgba(145,190,77,0.15)' }}
              >
                <span className="text-[#c8e875] text-xs font-black tracking-tight leading-none">PT</span>
              </div>
              <div>
                <p className="text-[10px] font-extrabold tracking-[0.18em] uppercase text-[#91BE4D] leading-tight">
                  PickleTracker
                </p>
                <p className="text-[9px] text-white/60 mt-0.5">Community player card</p>
              </div>
            </div>
            <PlayerProfileCardContent
              player={player}
              currentUserId={userId}
              isOwnProfile={isOwnProfile}
              forExport
            />
            <div className="flex items-center justify-between gap-2 px-3 py-2 border-t border-gray-100 bg-gray-50">
              <span className="text-[9px] font-bold text-gray-400 tracking-wide">pickletracker.in</span>
              <span className="text-[8px] text-gray-400 text-right leading-tight">Track your game. Own your stats.</span>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 grid grid-cols-2 gap-2 border-t border-gray-100 shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            disabled={status === 'generating'}
            className="flex items-center justify-center gap-2 border-2 border-gray-200 hover:border-gray-300 bg-white text-gray-700 font-semibold text-sm py-2.5 rounded-xl transition-colors disabled:opacity-50"
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
            className="flex items-center justify-center gap-2 text-white font-semibold text-sm py-2.5 rounded-xl transition-opacity disabled:opacity-50 hover:opacity-90"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            {status === 'generating' ? 'Generating…' : 'Share image'}
          </button>
        </div>

        <p className="text-center text-xs text-gray-400 pb-4 px-4 pt-1">
          On mobile, Share image opens your share sheet (e.g. Instagram Stories). On desktop, download the PNG and upload.
        </p>
      </div>
    </div>
  );
}
