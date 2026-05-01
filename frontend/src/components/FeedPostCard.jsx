import { useState, useEffect, useRef, memo } from 'react';
import * as api from '../services/api';
import FeedTournamentShareModal from './FeedTournamentShareModal';

const MEDAL_EMOJI = { Gold: '🥇', Silver: '🥈', Bronze: '🥉' };

const MEDAL_STYLE = {
  Gold: 'bg-yellow-50 text-yellow-700 border-yellow-200',
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
  const last = new Date(sorted[sorted.length - 1]);
  if (
    first.getMonth() === last.getMonth() &&
    first.getFullYear() === last.getFullYear()
  ) {
    return `${first.getDate()}–${last.getDate()} ${fmt(sorted[0], { month: 'short', year: 'numeric' })}`;
  }
  return `${fmt(sorted[0], { day: 'numeric', month: 'short' })} – ${fmt(sorted[sorted.length - 1], { day: 'numeric', month: 'short', year: 'numeric' })}`;
}

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

/**
 * Community feed card — used on Home and in the notification post popup.
 */
function FeedCardComponent({ item, currentUserId, onViewProfile, expandCommentsFromLink = false }) {
  const isUpcoming = item.type === 'upcoming';
  const dates = item.categories.map((c) => c.date).filter(Boolean);
  const dateRange = formatDateRange(dates);
  const firstName = (item.user.name || '').split(' ')[0];

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
  const [shareOpen, setShareOpen] = useState(false);
  const inputRef = useRef(null);

  const tournamentId = String(item.tournament.id);

  const isOwnTournament = Boolean(
    currentUserId != null && item.user?.id != null && String(currentUserId) === String(item.user.id),
  );

  useEffect(() => {
    if (!isOwnTournament) setShareOpen(false);
  }, [isOwnTournament]);

  const expandedFromLinkRef = useRef(false);
  useEffect(() => {
    if (!expandCommentsFromLink || expandedFromLinkRef.current) return;
    expandedFromLinkRef.current = true;
    let cancelled = false;
    (async () => {
      setCommentsOpen(true);
      setLoadingComments(true);
      try {
        const res = await api.getFeedComments(tournamentId);
        if (!cancelled) {
          setComments(res.data.data || []);
          setAllLoaded(true);
        }
      } catch {
        /* keep recentComments */
      } finally {
        if (!cancelled) setLoadingComments(false);
      }
      setTimeout(() => inputRef.current?.focus(), 280);
    })();
    return () => {
      cancelled = true;
    };
  }, [expandCommentsFromLink, tournamentId]);

  const handleLike = async () => {
    if (liking) return;
    const wasLiked = liked;
    setLiked(!wasLiked);
    setLikeCount((c) => c + (wasLiked ? -1 : 1));
    setLiking(true);
    try {
      const res = await api.toggleFeedLike(tournamentId);
      setLiked(res.data.likedByMe);
      setLikeCount(res.data.likeCount);
    } catch {
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
      } catch {
        /* keep showing recentComments */
      } finally {
        setLoadingComments(false);
      }
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
    } catch {
      /* silent */
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteComment = async (commentId) => {
    try {
      await api.deleteFeedComment(tournamentId, commentId);
      setComments((prev) => prev.filter((c) => String(c.id) !== String(commentId)));
      setCommentCount((c) => Math.max(0, c - 1));
    } catch {
      /* silent */
    }
  };

  let activityLine;
  if (isUpcoming) {
    activityLine = (
      <>
        <span className="font-medium">{firstName} is playing </span>
        <span className="font-semibold text-[#2d7005]">{item.tournament.name}</span>
      </>
    );
  } else if (item.medals?.length) {
    activityLine = (
      <>
        <span className="font-medium">{firstName} won at </span>
        <span className="font-semibold text-[#2d7005]">{item.tournament.name}</span>
      </>
    );
  } else {
    activityLine = (
      <>
        <span className="font-medium">{firstName} played </span>
        <span className="font-semibold text-[#2d7005]">{item.tournament.name}</span>
      </>
    );
  }

  return (
    <div
      id={`feed-post-${item.id}`}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden hover:shadow-md transition-shadow"
    >
      <div className="p-4">
        <div className="flex items-start gap-3 mb-3">
          <Avatar user={item.user} />
          <div className="min-w-0 flex-1">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap min-w-0">
                  <span className="font-semibold text-[#272702] text-sm">{item.user.name}</span>
                  {item.user?.id && onViewProfile && (
                    <button
                      type="button"
                      onClick={() => onViewProfile(item.user.id)}
                      className="inline-flex items-center gap-1 text-xs font-bold text-[#4a6e10] bg-[#f4f8e8] hover:bg-[#eaf4d4] px-2 py-0.5 rounded-full border border-[#91BE4D]/35 transition-colors shadow-sm shrink-0"
                    >
                      <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      View profile
                    </button>
                  )}
                </div>
                {item.user.city && (
                  <div className="flex items-center gap-0.5 text-xs text-gray-400 mt-0.5">
                    <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {item.user.city}
                  </div>
                )}
                <p className="text-xs text-gray-400 mt-0.5">
                  <span className="text-gray-500">Posted in feed</span> · {timeAgo(item.createdAt)}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <span
                  className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${isUpcoming ? 'bg-blue-50 text-blue-600' : 'bg-[#f4f8e8] text-[#4a6e10]'}`}
                >
                  {isUpcoming ? 'Upcoming' : 'Played'}
                </span>
                {isOwnTournament && (
                <button
                  type="button"
                  onClick={() => setShareOpen(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#4a6e10] bg-[#f4f8e8] hover:bg-[#eaf4d4] px-2 py-1 rounded-lg border border-[#91BE4D]/35 transition-colors shadow-sm"
                >
                  <svg className="w-3.5 h-3.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                  Share
                </button>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="mb-3">
          <p className="text-sm text-[#272702]">
            <span className="mr-1.5">{isUpcoming ? '🏆' : item.medals?.length ? '🎉' : '🎾'}</span>
            {activityLine}
          </p>
          {(dateRange || item.tournament.location) && (
            <div className="flex items-center gap-1.5 mt-1 text-xs text-gray-500 flex-wrap">
              {dateRange && (
                <span className="flex items-center gap-1 flex-wrap">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span className="font-medium text-gray-600">Tournament dates</span>
                  <span className="text-gray-500">{dateRange}</span>
                </span>
              )}
              {dateRange && item.tournament.location && <span className="text-gray-300">·</span>}
              {item.tournament.location && (
                <span className="flex items-center gap-1">
                  <svg className="w-3 h-3 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span className="font-medium text-gray-600">Venue</span>
                  <span className="text-gray-500">{item.tournament.location}</span>
                </span>
              )}
            </div>
          )}
        </div>

        {item.categories.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-4">
            {item.categories.map((cat, i) => {
              const medal = cat.medal && cat.medal !== 'None' ? cat.medal : null;
              return (
                <span
                  key={i}
                  className={`inline-flex items-center gap-1 text-xs font-medium px-2.5 py-1 rounded-full border ${medal ? MEDAL_STYLE[medal] : 'bg-gray-50 text-gray-600 border-gray-200'}`}
                >
                  {medal && <span>{MEDAL_EMOJI[medal]}</span>}
                  {cat.name}
                </span>
              );
            })}
          </div>
        )}

        <div className="flex items-center gap-1 pt-1 border-t border-gray-50 flex-wrap">
          <button
            type="button"
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
            type="button"
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

      {shareOpen && isOwnTournament && (
        <FeedTournamentShareModal item={item} onClose={() => setShareOpen(false)} />
      )}

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
                          type="button"
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

export const FeedCard = memo(FeedCardComponent);
