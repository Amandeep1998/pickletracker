import { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { useNavigate, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import * as api from '../services/api';
import LocationModal from '../components/LocationModal';
import PlayerProfileModal from '../components/PlayerProfileModal';
import EditCommunityPlayerCardModal from '../components/EditCommunityPlayerCardModal';
import PlayerProfileCardContent from '../components/PlayerProfileCardContent';
import PaddleLoader from '../components/PaddleLoader';

// ── Helpers ──────────────────────────────────────────────────────────────────

const MEDAL_EMOJI = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };

const MEDAL_STYLE = {
  Gold:   'bg-yellow-50 text-yellow-700 border-yellow-200',
  Silver: 'bg-gray-50 text-gray-500 border-gray-200',
  Bronze: 'bg-orange-50 text-orange-700 border-orange-200',
};

function timeAgo(dateStr) {
  const diff = Math.floor((Date.now() - new Date(dateStr)) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  const days = Math.floor(diff / 86400);
  if (days === 1) return 'yesterday';
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function formatDateRange(dates) {
  const sorted = [...new Set(dates.filter(Boolean))].sort();
  if (!sorted.length) return '';
  const fmt = (d, opts) => new Date(d).toLocaleDateString('en-IN', opts);
  if (sorted.length === 1 || sorted[0] === sorted[sorted.length - 1]) {
    return fmt(sorted[0], { day: 'numeric', month: 'short', year: 'numeric' });
  }
  const first = new Date(sorted[0]);
  const last  = new Date(sorted[sorted.length - 1]);
  if (
    first.getMonth() === last.getMonth() &&
    first.getFullYear() === last.getFullYear()
  ) {
    return `${first.getDate()}–${last.getDate()} ${fmt(sorted[0], { month: 'short', year: 'numeric' })}`;
  }
  return `${fmt(sorted[0], { day: 'numeric', month: 'short' })} – ${fmt(sorted[sorted.length - 1], { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function Avatar({ user }) {
  if (user.profilePhoto) {
    return (
      <img
        src={user.profilePhoto}
        alt={user.name}
        className="w-10 h-10 rounded-full object-cover flex-shrink-0 ring-2 ring-[#91BE4D]/30"
      />
    );
  }
  const initials = (user.name || '?')
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <span
      className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white flex-shrink-0"
      style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
    >
      {initials}
    </span>
  );
}

function FeedCard({ item, currentUserId, onViewProfile }) {
  const isUpcoming = item.type === 'upcoming';
  const dates = item.categories.map((c) => c.date).filter(Boolean);
  const dateRange = formatDateRange(dates);
  const firstName = (item.user.name || '').split(' ')[0];

  // ── Social state ────────────────────────────────────────────────────────────
  const [liked, setLiked] = useState(item.likedByMe);
  const [likeCount, setLikeCount] = useState(item.likeCount);
  const [liking, setLiking] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(item.recentComments || []);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [allLoaded, setAllLoaded] = useState((item.recentComments || []).length >= item.commentCount);
  const [loadingComments, setLoadingComments] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const inputRef = useRef(null);

  const tournamentId = String(item.tournament.id);

  const handleLike = async () => {
    if (liking) return;
    // Optimistic update
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setLiking(true);
    try {
      const res = await api.toggleFeedLike(tournamentId);
      setLiked(res.data.likedByMe);
      setLikeCount(res.data.likeCount);
    } catch {
      // Revert on failure
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setLiking(false);
    }
  };

  const handleToggleComments = async () => {
    const opening = !commentsOpen;
    setCommentsOpen(opening);
    if (opening && !allLoaded) {
      setLoadingComments(true);
      try {
        const res = await api.getFeedComments(tournamentId);
        setComments(res.data.data || []);
        setAllLoaded(true);
      } catch { /* keep showing recentComments */ }
      finally { setLoadingComments(false); }
    }
    if (opening) setTimeout(() => inputRef.current?.focus(), 150);
  };

  const handleSubmitComment = async (e) => {
    e.preventDefault();
    const text = commentText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.addFeedComment(tournamentId, text);
      setComments((prev) => [...prev, res.data.data]);
      setCommentCount((c) => c + 1);
      setCommentText('');
      setAllLoaded(true);
    } catch { /* silent — user can retry */ }
    finally { setSubmitting(false); }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.deleteFeedComment(tournamentId, commentId);
      setComments((prev) => prev.filter((c) => String(c.id) !== String(commentId)));
      setCommentCount((c) => Math.max(0, c - 1));
    } catch { /* silent */ }
  };

  // ── Activity sentence ───────────────────────────────────────────────────────
  let activityLine;
  if (isUpcoming) {
    activityLine = (<><span className="font-medium">{firstName} is playing </span><span className="font-semibold text-[#2d7005]">{item.tournament.name}</span></>);
  } else if (item.medals?.length) {
    activityLine = (<><span className="font-medium">{firstName} won at </span><span className="font-semibold text-[#2d7005]">{item.tournament.name}</span></>);
  } else {
    activityLine = (<><span className="font-medium">{firstName} played </span><span className="font-semibold text-[#2d7005]">{item.tournament.name}</span></>);
  }

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow">
      <div className="p-4">
        {/* Header */}
        <div className="flex items-start gap-3 mb-3">
          <Avatar user={item.user} />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-semibold text-[#272702] text-sm">{item.user.name}</span>
              {item.user.city && (
                <span className="text-xs text-gray-400 flex items-center gap-0.5">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {item.user.city}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5">{timeAgo(item.createdAt)}</p>
            {item.user?.id && onViewProfile && (
              <button
                type="button"
                onClick={() => onViewProfile(item.user.id)}
                className="mt-2 inline-flex items-center gap-1.5 text-xs font-bold text-[#4a6e10] bg-[#f4f8e8] hover:bg-[#eaf4d4] px-3 py-1.5 rounded-full border border-[#91BE4D]/35 transition-colors shadow-sm"
              >
                <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                View profile
              </button>
            )}
          </div>
          <span className={`flex-shrink-0 text-[11px] font-semibold px-2 py-0.5 rounded-full ${isUpcoming ? 'bg-blue-50 text-blue-600' : 'bg-[#f4f8e8] text-[#4a6e10]'}`}>
            {isUpcoming ? 'Upcoming' : 'Played'}
          </span>
        </div>

        {/* Activity */}
        <div className="mb-3">
          <p className="text-sm text-[#272702]">
            <span className="mr-1.5">{isUpcoming ? '🏆' : item.medals?.length ? '🎉' : '🎾'}</span>
            {activityLine}
          </p>
          {(dateRange || item.tournament.location) && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 flex-wrap">
              {dateRange && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  {dateRange}
                </span>
              )}
              {dateRange && item.tournament.location && <span className="text-gray-300">·</span>}
              {item.tournament.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {item.tournament.location}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Category chips */}
        {item.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.categories.map((cat, i) => {
              const medal = cat.medal && cat.medal !== 'None' ? cat.medal : null;
              return (
                <span key={i} className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${medal ? MEDAL_STYLE[medal] : 'bg-gray-50 text-gray-600 border-gray-200'}`}>
                  {medal && <span>{MEDAL_EMOJI[medal]}</span>}
                  {cat.name}
                </span>
              );
            })}
          </div>
        )}

        {/* Like + Comment action bar */}
        <div className="flex items-center gap-1 pt-1 border-t border-gray-50">
          <button
            onClick={handleLike}
            disabled={liking}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              liked ? 'text-rose-500 bg-rose-50' : 'text-gray-400 hover:text-rose-400 hover:bg-rose-50'
            }`}
          >
            <svg className="w-4 h-4" fill={liked ? 'currentColor' : 'none'} viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            <span>{likeCount > 0 ? likeCount : 'Like'}</span>
          </button>

          <button
            onClick={handleToggleComments}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              commentsOpen ? 'text-[#4a6e10] bg-[#f4f8e8]' : 'text-gray-400 hover:text-[#4a6e10] hover:bg-[#f4f8e8]'
            }`}
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
            </svg>
            <span>{commentCount > 0 ? commentCount : 'Comment'}</span>
          </button>
        </div>
      </div>

      {/* Comments section — inline expand */}
      {commentsOpen && (
        <div className="border-t border-gray-100 bg-gray-50/60 px-4 pt-3 pb-4 space-y-3">
          {loadingComments && (
            <div className="space-y-2">
              {[1, 2].map((i) => (
                <div key={i} className="flex gap-2 animate-pulse">
                  <div className="w-7 h-7 rounded-full bg-gray-200 flex-shrink-0" />
                  <div className="flex-1 space-y-1 pt-1">
                    <div className="h-3 bg-gray-200 rounded w-1/4" />
                    <div className="h-3 bg-gray-100 rounded w-3/4" />
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loadingComments && comments.length === 0 && (
            <p className="text-xs text-gray-400 text-center py-1">No comments yet. Be the first!</p>
          )}

          {!loadingComments && comments.length > 0 && (
            <div className="space-y-2.5">
              {comments.map((c) => (
                <div key={String(c.id)} className="flex items-start gap-2 group">
                  <span
                    className="w-7 h-7 rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5"
                    style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
                  >
                    {(c.userName || '?')[0].toUpperCase()}
                  </span>
                  <div className="flex-1 min-w-0">
                    <div className="bg-white rounded-xl px-3 py-2 border border-gray-100 inline-block max-w-full">
                      <span className="text-xs font-semibold text-[#272702]">{c.userName} </span>
                      <span className="text-xs text-gray-600">{c.text}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 pl-1">
                      <span className="text-[10px] text-gray-400">{timeAgo(c.createdAt)}</span>
                      {String(c.userId) === String(currentUserId) && (
                        <button
                          onClick={() => handleDeleteComment(c.id)}
                          className="text-[10px] text-gray-400 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Add comment input */}
          <form onSubmit={handleSubmitComment} className="flex items-center gap-2 pt-1">
            <input
              ref={inputRef}
              type="text"
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment…"
              maxLength={500}
              className="flex-1 text-sm bg-white border border-gray-200 rounded-xl px-3 py-2 focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!commentText.trim() || submitting}
              className="flex-shrink-0 text-white text-xs font-bold px-3 py-2 rounded-xl transition-opacity disabled:opacity-40"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
            >
              {submitting ? '…' : 'Post'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}

function SkeletonCard() {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 animate-pulse">
      <div className="flex items-center gap-3 mb-3">
        <div className="w-10 h-10 rounded-full bg-gray-200 flex-shrink-0" />
        <div className="flex-1 space-y-1.5">
          <div className="h-3.5 bg-gray-200 rounded w-1/3" />
          <div className="h-3 bg-gray-100 rounded w-1/4" />
        </div>
        <div className="h-5 w-16 bg-gray-100 rounded-full" />
      </div>
      <div className="space-y-2 mb-3">
        <div className="h-4 bg-gray-200 rounded w-3/4" />
        <div className="h-3 bg-gray-100 rounded w-1/2" />
      </div>
      <div className="flex gap-1.5">
        <div className="h-6 w-28 bg-gray-100 rounded-full" />
        <div className="h-6 w-24 bg-gray-100 rounded-full" />
      </div>
    </div>
  );
}

/** Log tournament CTA — fixed at top of Home */
function HomeLogTournamentBanner({ onLogTournament }) {
  return (
    <div
      className="rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
      style={{ background: 'linear-gradient(135deg, #2d7005 0%, #91BE4D 55%, #ec9937 100%)' }}
      onClick={onLogTournament}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onLogTournament();
      }}
    >
      <div>
        <p className="text-white font-semibold text-sm">Playing a tournament?</p>
        <p className="text-white/80 text-xs mt-0.5">
          Log it and let your community know
        </p>
      </div>
      <span className="flex-shrink-0 bg-white/20 text-white text-xs font-bold px-3 py-1.5 rounded-xl border border-white/30 whitespace-nowrap pointer-events-none">
        Log Tournament →
      </span>
    </div>
  );
}

/** Public player card preview — inserted mid-feed after activity */
function HomeMidFeedPlayerCardPromo({ cardLoading, publicCardPlayer, currentUserId, onEditPlayerCard }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm px-4 py-4 sm:px-5">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-gray-900">Your public player card</p>
          <p className="text-xs text-gray-500 mt-0.5 leading-snug">
            Preview how you appear when someone opens your profile from the feed or Nearby. Email and phone are never shown here.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onEditPlayerCard}
            className="inline-flex items-center justify-center gap-1.5 text-xs font-bold py-2.5 px-4 rounded-xl text-white hover:opacity-95 transition-opacity shadow-sm whitespace-nowrap"
            style={{ background: 'linear-gradient(to right, #1e3a5f, #2563ab)' }}
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
            </svg>
            Edit player card
          </button>
          <NavLink
            to="/profile"
            className="text-xs font-semibold text-[#4a6e10] hover:text-[#2d7005] hover:underline underline-offset-2 py-2"
          >
            All profile settings →
          </NavLink>
        </div>
      </div>
      <div className="rounded-xl border border-gray-200 overflow-hidden bg-[#f1f5f9] flex flex-col max-h-[min(65vh,520px)] min-h-[200px]">
        {cardLoading ? (
          <div className="py-14 flex justify-center">
            <PaddleLoader label="Loading preview…" />
          </div>
        ) : publicCardPlayer ? (
          <div className="overflow-y-auto min-h-0 flex-1">
            <PlayerProfileCardContent
              player={publicCardPlayer}
              currentUserId={currentUserId}
              isOwnProfile
            />
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-12 px-4">Could not load preview.</p>
        )}
      </div>
    </div>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'friends', label: 'Friends' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'played', label: 'Played' },
  { key: 'nearby', label: 'Nearby' },
];

/** Insert promo blocks after this many feed cards when enough activity exists */
const FEED_ITEMS_BEFORE_PROMO = 3;

export default function Home() {
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const socket = useSocket();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');
  const [locationOpen, setLocationOpen] = useState(false);
  const [profilePlayerId, setProfilePlayerId] = useState(null);
  const [friendRequests, setFriendRequests] = useState({ incoming: [], outgoing: [] });
  const [friends, setFriends] = useState([]);
  const [pendingFriendIds, setPendingFriendIds] = useState(() => new Set());
  const [showEditPlayerCard, setShowEditPlayerCard] = useState(false);
  const [publicCardPlayer, setPublicCardPlayer] = useState(null);
  const [cardLoading, setCardLoading] = useState(false);

  const loadPublicCardPreview = useCallback(async () => {
    if (!user?.id) return;
    setCardLoading(true);
    try {
      const res = await api.getPlayer(user.id);
      setPublicCardPlayer(res.data.data);
    } catch {
      setPublicCardPlayer(null);
    } finally {
      setCardLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadPublicCardPreview();
  }, [loadPublicCardPreview]);

  const fetchFriendData = useCallback(async () => {
    try {
      const [reqRes, friendsRes] = await Promise.all([api.getFriendRequests(), api.getFriends()]);
      const data = reqRes.data.data || { incoming: [], outgoing: [] };
      const friendsList = friendsRes.data.data || [];
      setFriendRequests(data);
      setFriends(friendsList);
      const outgoingIds = new Set(data.outgoing.map((r) => String(r.user?.id)));
      const friendIds = new Set(friendsList.map((f) => String(f.id)));
      setPendingFriendIds((prev) => {
        const next = new Set([...prev].filter((id) => outgoingIds.has(id) || friendIds.has(id)));
        return next.size === prev.size ? prev : next;
      });
    } catch { /* feed stays usable */ }
  }, []);

  useEffect(() => {
    if (!user?.id) return;
    fetchFriendData();
  }, [user?.id, fetchFriendData]);

  useEffect(() => {
    if (!socket) return;
    socket.on('friend:refresh', fetchFriendData);
    socket.on('connect', fetchFriendData);
    return () => {
      socket.off('friend:refresh', fetchFriendData);
      socket.off('connect', fetchFriendData);
    };
  }, [socket, fetchFriendData]);

  const friendStatusByUserId = useMemo(() => {
    const map = {};
    friends.forEach((f) => {
      map[String(f.id)] = 'friend';
    });
    (friendRequests.incoming || []).forEach((r) => {
      map[String(r.user.id)] = 'incoming';
    });
    (friendRequests.outgoing || []).forEach((r) => {
      map[String(r.user.id)] = 'pending';
    });
    pendingFriendIds.forEach((id) => {
      if (!map[String(id)]) map[String(id)] = 'pending';
    });
    return map;
  }, [friendRequests, friends, pendingFriendIds]);

  const friendIdsSet = useMemo(
    () => new Set(friends.map((f) => String(f.id))),
    [friends]
  );

  const handleSendFriendRequest = async (playerId) => {
    setPendingFriendIds((prev) => new Set(prev).add(String(playerId)));
    try {
      await api.sendFriendRequest(playerId);
      await fetchFriendData();
    } catch {
      setPendingFriendIds((prev) => {
        const next = new Set(prev);
        next.delete(String(playerId));
        return next;
      });
    }
  };

  useEffect(() => {
    let cancelled = false;
    const params = filter === 'nearby' ? { nearby: 1 } : {};

    const run = async () => {
      setError('');
      setLoading(true);
      try {
        const res = await api.getFeed(params);
        if (!cancelled) setFeed(res.data.data || []);
      } catch (err) {
        const code = err.response?.data?.code;
        if (err.response?.status === 400 && code === 'NEEDS_CITY') {
          if (!cancelled) {
            setLocationOpen(true);
            if (filter === 'nearby') setFilter('all');
            setFeed([]);
          }
        } else if (!cancelled) {
          setError('Could not load feed. Please try again.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [filter]);

  const firstName = (user?.name || '').split(' ')[0];
  const hasCity = Boolean(String(user?.city || '').trim());

  const selectFilter = (key) => {
    if (key === 'nearby' && !hasCity) {
      setLocationOpen(true);
      return;
    }
    setFilter(key);
  };

  const retryFetch = () => {
    const params = filter === 'nearby' ? { nearby: 1 } : {};
    setError('');
    setLoading(true);
    api
      .getFeed(params)
      .then((res) => setFeed(res.data.data || []))
      .catch(() => setError('Could not load feed. Please try again.'))
      .finally(() => setLoading(false));
  };

  const handleLocationSave = async (city) => {
    try {
      const res = await api.updateProfile({ city });
      refreshUser(res.data.data);
      setLocationOpen(false);
      setFilter('nearby');
      loadPublicCardPreview();
    } catch {
      setError('Could not save your city. Please try again.');
    }
  };

  const visibleFeed = useMemo(() => {
    return feed.filter((item) => {
      const posterId = item.user?.id != null ? String(item.user.id) : '';
      if (filter === 'friends') {
        return Boolean(posterId && friendIdsSet.has(posterId));
      }
      if (filter === 'nearby') return true;
      if (filter === 'upcoming') return item.type === 'upcoming';
      if (filter === 'played') return item.type === 'recent';
      return true;
    });
  }, [feed, filter, friendIdsSet]);

  return (
    <div className="min-h-screen bg-[#f8faf3]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold text-[#272702]">
            Hey {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {filter === 'nearby' && user?.city
              ? `Full feed — activity from ${user.city} shown first`
              : filter === 'friends'
                ? 'Tournament activity from people you’re friends with'
              : 'See what your fellow picklers are up to'}
          </p>
        </div>

        <HomeLogTournamentBanner onLogTournament={() => navigate('/calendar')} />

        {/* Toggle */}
        <div className="flex flex-wrap bg-white rounded-xl border border-gray-100 shadow-sm p-1 gap-1">
          {FILTERS.map(({ key, label }) => (
            <button
              type="button"
              key={key}
              onClick={() => selectFilter(key)}
              className={`flex-1 min-w-[4.5rem] py-1.5 px-1 text-xs sm:text-sm font-semibold rounded-lg transition-colors ${
                filter === key
                  ? 'text-white shadow-sm'
                  : 'text-gray-400 hover:text-[#272702]'
              }`}
              style={filter === key ? { background: 'linear-gradient(to right, #2d7005, #91BE4D)' } : {}}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Feed */}
        {loading && (
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <SkeletonCard key={i} />
            ))}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">{error}</p>
            <button
              type="button"
              onClick={retryFetch}
              className="mt-3 text-xs text-[#91BE4D] font-semibold hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && visibleFeed.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">
              {filter === 'nearby' ? '📍' : filter === 'friends' ? '👥' : '🎾'}
            </div>
            <p className="font-semibold text-[#272702]">
              {filter === 'upcoming'
                ? 'No upcoming tournaments'
                : filter === 'played'
                  ? 'No recent results'
                  : filter === 'nearby'
                    ? 'No activity yet'
                    : filter === 'friends'
                      ? friends.length === 0
                        ? 'No friends yet'
                        : 'No activity from friends'
                      : 'No activity yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'nearby'
                ? user?.city
                  ? 'Nothing in the feed right now. Log a tournament or check back soon.'
                  : 'Set your city to see activity near you.'
                : filter === 'friends'
                  ? friends.length === 0
                    ? 'Add friends from Nearby Players — then their tournaments appear here.'
                    : 'Nothing from friends in this feed window. Try All to see everyone, or check back after friends log events.'
                  : filter === 'all'
                    ? 'Be the first to log a tournament!'
                    : 'Try switching to a different filter'}
            </p>
            {filter === 'friends' && friends.length === 0 ? (
              <button
                type="button"
                onClick={() => navigate('/players')}
                className="mt-4 text-sm font-semibold text-white px-5 py-2 rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
              >
                Find players
              </button>
            ) : filter !== 'nearby' ? (
              <button
                type="button"
                onClick={() => navigate('/calendar')}
                className="mt-4 text-sm font-semibold text-white px-5 py-2 rounded-xl hover:opacity-90 transition-opacity"
                style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
              >
                Log Tournament
              </button>
            ) : null}
          </div>
        )}

        {!loading && !error && visibleFeed.length > 0 && (
          <div className="space-y-3">
            {visibleFeed.length >= FEED_ITEMS_BEFORE_PROMO ? (
              <>
                {visibleFeed.slice(0, FEED_ITEMS_BEFORE_PROMO).map((item) => (
                  <FeedCard
                    key={item.id}
                    item={item}
                    currentUserId={user?.id}
                    onViewProfile={setProfilePlayerId}
                  />
                ))}

                <HomeMidFeedPlayerCardPromo
                  cardLoading={cardLoading}
                  publicCardPlayer={publicCardPlayer}
                  currentUserId={user?.id}
                  onEditPlayerCard={() => setShowEditPlayerCard(true)}
                />

                {visibleFeed.slice(FEED_ITEMS_BEFORE_PROMO).map((item) => (
                  <FeedCard
                    key={item.id}
                    item={item}
                    currentUserId={user?.id}
                    onViewProfile={setProfilePlayerId}
                  />
                ))}
              </>
            ) : (
              <>
                {visibleFeed.map((item) => (
                  <FeedCard
                    key={item.id}
                    item={item}
                    currentUserId={user?.id}
                    onViewProfile={setProfilePlayerId}
                  />
                ))}

                <HomeMidFeedPlayerCardPromo
                  cardLoading={cardLoading}
                  publicCardPlayer={publicCardPlayer}
                  currentUserId={user?.id}
                  onEditPlayerCard={() => setShowEditPlayerCard(true)}
                />
              </>
            )}
          </div>
        )}

        {profilePlayerId && (
          <PlayerProfileModal
            playerId={profilePlayerId}
            onClose={() => setProfilePlayerId(null)}
            friendState={friendStatusByUserId[String(profilePlayerId)] || 'none'}
            currentUserId={user?.id}
            onSendFriendRequest={handleSendFriendRequest}
          />
        )}

        {showEditPlayerCard && (
          <EditCommunityPlayerCardModal
            onClose={() => setShowEditPlayerCard(false)}
            onSaved={async () => {
              try {
                const res = await api.getProfile();
                refreshUser(res.data.data);
              } catch {
                /* modal already saved */
              }
              await loadPublicCardPreview();
            }}
          />
        )}

        {locationOpen && (
          <LocationModal onSave={handleLocationSave} onSkip={() => setLocationOpen(false)} />
        )}
      </div>
    </div>
  );
}
