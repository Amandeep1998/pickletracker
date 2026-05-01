import React, { useEffect, useState } from 'react';
import * as api from '../services/api';
import PaddleLoader from './PaddleLoader';
import FriendCalendarModal from './FriendCalendarModal';
import PlayerProfileCardContent from './PlayerProfileCardContent';

/**
 * Full player profile modal — bio card, tournament table, friend actions (same calendar as Nearby Players).
 */
export default function PlayerProfileModal({
  playerId,
  onClose,
  friendState,
  currentUserId,
  onSendFriendRequest,
}) {
  const [player, setPlayer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);
  const [calendarFriend, setCalendarFriend] = useState(null);

  useEffect(() => {
    setCalendarFriend(null);
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
                onOpenFriendCalendar={setCalendarFriend}
                showCloseButton
                onClose={handleCloseProfile}
                isOwnProfile={Boolean(currentUserId && String(player.id) === String(currentUserId))}
              />
            </div>
          ) : null}
        </div>
      </div>
      {calendarFriend && (
        <FriendCalendarModal friend={calendarFriend} onClose={() => setCalendarFriend(null)} />
      )}
    </>
  );
}
