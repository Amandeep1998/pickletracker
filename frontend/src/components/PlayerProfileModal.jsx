import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import PaddleLoader from './PaddleLoader';
import FriendCalendarModal from './FriendCalendarModal';
import PlayerProfileCardContent from './PlayerProfileCardContent';
import PlayerProfileShareModal from './PlayerProfileShareModal';

/**
 * Full player profile modal — bio card, tournament table, friend actions (same calendar as Nearby Players).
 */
export default function PlayerProfileModal({
  playerId,
  onClose,
  friendState,
  currentUserId,
  onSendFriendRequest,
  onRemoveFriend,
}) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [calendarFriend, setCalendarFriend] = useState(null);
  const [showShare, setShowShare] = useState(false);

  useEffect(() => {
    setCalendarFriend(null);
    setShowShare(false);
  }, [playerId]);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .getPlayer(playerId)
      .then((res) => setPlayer(res.data.data))
      .catch(() => setError('Could not load player profile.'))
      .finally(() => setLoading(false));
  }, [playerId]);

  const handleFriendClick = async () => {
    if (friendState !== 'none' || sending) return;
    setSending(true);
    await onSendFriendRequest(player.id);
    setSending(false);
  };

  const handleCloseProfile = () => {
    setCalendarFriend(null);
    onClose();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center p-0 sm:p-4"
        onClick={handleCloseProfile}
        role="presentation"
      >
        <div className="absolute inset-0 bg-black/55 backdrop-blur-[2px]" />
        <div
          className="relative w-full sm:max-w-xl sm:rounded-2xl rounded-t-2xl max-h-[92dvh] overflow-hidden shadow-2xl flex flex-col min-h-0 bg-[#f1f5f9] ring-1 ring-black/10"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="sm:hidden flex justify-center pt-3 pb-1 bg-[#1e3a5f] rounded-t-2xl shrink-0">
            <div className="w-10 h-1 bg-white/25 rounded-full" />
          </div>

          {loading ? (
            <div className="py-20 bg-white">
              <PaddleLoader label="Loading player…" />
            </div>
          ) : error ? (
            <div className="py-16 px-6 text-center text-red-500 text-sm bg-white">{error}</div>
          ) : player ? (
            <div className="flex flex-col flex-1 min-h-0 overflow-hidden">
              <PlayerProfileCardContent
                player={player}
                currentUserId={currentUserId}
                friendState={friendState}
                sending={sending}
                onFriendClick={handleFriendClick}
                onRemoveFriend={
                  friendState === 'friend' && onRemoveFriend ? () => onRemoveFriend(player) : undefined
                }
                onOpenFriendCalendar={setCalendarFriend}
                showCloseButton
                onClose={handleCloseProfile}
                isOwnProfile={Boolean(currentUserId && String(player.id) === String(currentUserId))}
                nameAction={
                  <button
                    type="button"
                    onClick={() => setShowShare(true)}
                    className="inline-flex items-center justify-center gap-1 text-[11px] sm:text-xs font-bold py-1.5 px-2.5 sm:py-2 sm:px-3 rounded-lg sm:rounded-xl border-2 border-[#91BE4D]/50 text-[#4a6e10] bg-[#f4f8e8] hover:bg-[#eef6dc] transition-colors whitespace-nowrap"
                    aria-label="Share player card"
                  >
                    <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                    </svg>
                    Share
                  </button>
                }
              />
            </div>
          ) : null}
        </div>
      </div>
      {calendarFriend && (
        <FriendCalendarModal friend={calendarFriend} onClose={() => setCalendarFriend(null)} />
      )}
      {showShare && player && (
        <PlayerProfileShareModal
          player={player}
          userId={currentUserId}
          onClose={() => setShowShare(false)}
        />
      )}
    </>
  );
}
