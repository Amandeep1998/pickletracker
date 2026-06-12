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
        <div className="flex items-center justify-between px-5 pt-4 pb-3 border-b border-[#e2e0d4] shrink-0">
          <div>
            <p className="text-base font-extrabold text-[#16180f] tracking-tight">Share player card</p>
            <p className="text-xs text-[#8a8c7c] mt-0.5">PickleTracker · share or download</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-sm font-bold text-[#8a8c7c] hover:text-[#16180f] px-2 py-1 rounded-lg hover:bg-[#f1f0e8] transition"
            aria-label="Close"
          >
            Close
          </button>
        </div>

        <div className="overflow-y-auto flex-1 min-h-0 bg-[#f1f0e8] flex justify-center py-5 px-4">
          <div
            ref={cardRef}
            className="relative w-full max-w-[360px] rounded-[20px] overflow-hidden bg-[#fbfaf4]"
            style={{ boxShadow: '0 18px 50px -12px rgba(22,24,15,0.35), 0 0 0 1px rgba(22,24,15,0.06)' }}
          >
            {/* Premium header — dark ink band with Volt wordmark */}
            <div className="relative px-4 pt-3.5 pb-3 bg-[#16180f] overflow-hidden">
              <div
                className="absolute inset-0 opacity-[0.06]"
                style={{
                  background:
                    'radial-gradient(120% 80% at 100% 0%, #c7f23a 0%, transparent 55%)',
                }}
              />
              <div className="relative flex items-baseline justify-between">
                <p className="text-[15px] font-black tracking-tight leading-none text-[#fbfaf4]">
                  Pickle<span className="text-[#c7f23a]">Tracker</span>
                </p>
                <p className="text-[8px] font-bold tracking-[0.22em] uppercase text-[#9da08c]">
                  Player Card
                </p>
              </div>
            </div>

            <PlayerProfileCardContent
              player={player}
              currentUserId={userId}
              isOwnProfile={isOwnProfile}
              forExport
            />

            {/* Footer + corner watermark */}
            <div className="relative flex items-center justify-between gap-2 px-4 py-2.5 border-t border-[#e2e0d4] bg-[#f1f0e8]">
              <span className="text-[9px] font-bold text-[#16180f] tracking-wide">pickletracker.in</span>
              <span className="text-[8px] text-[#8a8c7c] text-right leading-tight">
                Track your game. Own your stats.
              </span>
            </div>

            {/* Diagonal corner watermark */}
            <div className="pointer-events-none absolute top-0 right-0 w-[120px] h-[120px] overflow-hidden">
              <div
                className="absolute top-[18px] -right-[34px] w-[150px] text-center rotate-45 bg-[#c7f23a] py-[3px] shadow-sm"
              >
                <span className="text-[8px] font-black tracking-[0.18em] uppercase text-[#16180f]">
                  PickleTracker
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="px-4 py-3 grid grid-cols-2 gap-2.5 border-t border-[#e2e0d4] shrink-0">
          <button
            type="button"
            onClick={handleDownload}
            disabled={status === 'generating'}
            className="border border-[#e2e0d4] hover:border-[#16180f] bg-[#fbfaf4] text-[#16180f] font-bold text-sm py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {status === 'generating' ? 'Wait…' : 'Download'}
          </button>
          <button
            type="button"
            onClick={handleShare}
            disabled={status === 'generating'}
            className="bg-[#c7f23a] hover:bg-[#a9d62b] text-[#16180f] font-extrabold text-sm py-3 rounded-xl transition-colors disabled:opacity-50"
          >
            {status === 'generating' ? 'Generating…' : 'Share image'}
          </button>
        </div>

        <p className="text-center text-xs text-[#8a8c7c] pb-4 px-4 pt-1">
          On mobile, Share image opens your share sheet (e.g. Instagram Stories). On desktop, download the PNG and upload.
        </p>
      </div>
    </div>
  );
}
