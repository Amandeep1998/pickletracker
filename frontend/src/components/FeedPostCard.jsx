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

function CommentAvatar({ name, photo, size = 7 }) {
  if (photo) {
    return (
      <img
        src={photo}
        alt={name}
        className={`w-${size} h-${size} rounded-full object-cover flex-shrink-0 mt-0.5`}
      />
    );
  }
  return (
    <span
      className={`w-${size} h-${size} rounded-full flex items-center justify-center text-[10px] font-bold text-white flex-shrink-0 mt-0.5`}
      style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
    >
      {(name || '?')[0].toUpperCase()}
    </span>
  );
}

function buildLikedByText(likeCount, likedByMe, recentLikers) {
  if (likeCount === 0) return null;
  const others = recentLikers || [];
  if (likedByMe) {
    const remaining = likeCount - 1;
    if (remaining === 0) return 'Liked by you';
    if (remaining === 1 && others.length > 0) return `Liked by you and ${others[0].name}`;
    return `Liked by you and ${remaining} other${remaining > 1 ? 's' : ''}`;
  }
  if (others.length === 0) return `${likeCount} like${likeCount > 1 ? 's' : ''}`;
  if (likeCount === 1) return `Liked by ${others[0].name}`;
  if (likeCount === 2 && others.length >= 2) return `Liked by ${others[0].name} and ${others[1].name}`;
  return `Liked by ${others[0].name} and ${likeCount - 1} other${likeCount - 1 > 1 ? 's' : ''}`;
}

function buildCommentTree(flat) {
  const map = {};
  for (const c of flat) map[String(c.id)] = { ...c, replies: [] };
  const roots = [];
  for (const c of flat) {
    if (c.parentId && map[String(c.parentId)]) {
      map[String(c.parentId)].replies.push(map[String(c.id)]);
    } else {
      roots.push(map[String(c.id)]);
    }
  }
  return roots;
}

function CommentNode({ comment, currentUserId, replyingTo, replyText, submitting, onDelete, onStartReply, onCancelReply, onSubmitReply, onReplyTextChange, depth = 0 }) {
  const isReplying = replyingTo === String(comment.id);
  const replyInputRef = useRef(null);

  useEffect(() => {
    if (isReplying) setTimeout(() => replyInputRef.current?.focus(), 80);
  }, [isReplying]);

  return (
    <div className="flex items-start gap-2 group">
      <CommentAvatar name={comment.userName} photo={comment.profilePhoto} size={depth > 0 ? 6 : 7} />
      <div className="flex-1 min-w-0">
        <div className="bg-white rounded-xl px-3 py-2 border border-gray-100 inline-block max-w-full">
          <span className="text-xs font-semibold text-[#272702]">{comment.userName} </span>
          <span className="text-xs text-gray-600">{comment.text}</span>
        </div>
        <div className="flex items-center gap-3 mt-0.5 pl-1">
          <span className="text-[10px] text-gray-400">{timeAgo(comment.createdAt)}</span>
          {depth < 2 && (
            <button
              type="button"
              onClick={() => isReplying ? onCancelReply() : onStartReply(comment.id)}
              className="text-[10px] font-medium text-[#4a6e10] hover:underline"
            >
              {isReplying ? 'Cancel' : 'Reply'}
            </button>
          )}
          {String(comment.userId) === String(currentUserId) && (
            <button
              type="button"
              onClick={() => onDelete(comment.id)}
              className="text-[10px] text-gray-400 hover:text-rose-400 transition-colors opacity-0 group-hover:opacity-100"
            >
              Delete
            </button>
          )}
        </div>

        {isReplying && (
          <form onSubmit={(e) => onSubmitReply(e, comment.id)} className="mt-2 flex items-center gap-2">
            <input
              ref={replyInputRef}
              type="text"
              value={replyText}
              onChange={(e) => onReplyTextChange(e.target.value)}
              placeholder={`Reply to ${comment.userName}…`}
              maxLength={500}
              className="flex-1 text-xs bg-white border border-gray-200 rounded-xl px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-[#91BE4D] focus:border-[#91BE4D] placeholder:text-gray-400"
            />
            <button
              type="submit"
              disabled={!replyText.trim() || submitting}
              className="flex-shrink-0 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-opacity disabled:opacity-40"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
            >
              {submitting ? '…' : 'Post'}
            </button>
          </form>
        )}

        {comment.replies?.length > 0 && (
          <div className="mt-2 space-y-2 pl-3 border-l-2 border-gray-100">
            {comment.replies.map((reply) => (
              <CommentNode
                key={String(reply.id)}
                comment={reply}
                currentUserId={currentUserId}
                replyingTo={replyingTo}
                replyText={replyText}
                submitting={submitting}
                onDelete={onDelete}
                onStartReply={onStartReply}
                onCancelReply={onCancelReply}
                onSubmitReply={onSubmitReply}
                onReplyTextChange={onReplyTextChange}
                depth={depth + 1}
              />
            ))}
          </div>
        )}
      </div>
    </div>
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
  const [recentLikers, setRecentLikers] = useState(item.recentLikers || []);
  const [liking, setLiking] = useState(false);
  const [likersOpen, setLikersOpen] = useState(false);
  const [likersList, setLikersList] = useState(null);
  const [loadingLikers, setLoadingLikers] = useState(false);

  const [commentsOpen, setCommentsOpen] = useState(false);
  const [comments, setComments] = useState(item.recentComments || []);
  const [commentCount, setCommentCount] = useState(item.commentCount);
  const [allLoaded, setAllLoaded] = useState((item.recentComments || []).length >= item.commentCount);
  const [loadingComments, setLoadingComments] = useState(false);

  const [commentText, setCommentText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
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
    (async () => {
      setCommentsOpen(true);
      setLoadingComments(true);
      try {
        const res = await api.getFeedComments(tournamentId);
        setComments(res.data.data || []);
        setAllLoaded(true);
      } catch {
        /* keep recentComments */
      } finally {
        setLoadingComments(false);
      }
      setTimeout(() => inputRef.current?.focus(), 280);
    })();
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
      if (res.data.recentLikers) setRecentLikers(res.data.recentLikers);
    } catch {
      setLiked(wasLiked);
      setLikeCount((c) => c + (wasLiked ? 1 : -1));
    } finally {
      setLiking(false);
    }
  };

  const handleOpenLikers = async () => {
    if (likeCount === 0) return;
    setLikersOpen(true);
    if (!likersList) {
      setLoadingLikers(true);
      try {
        const res = await api.getFeedLikers(tournamentId);
        setLikersList(res.data.data || []);
      } catch {
        setLikersList([]);
      } finally {
        setLoadingLikers(false);
      }
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

  const handleSubmitReply = async (e, parentId) => {
    e.preventDefault();
    const text = replyText.trim();
    if (!text || submitting) return;
    setSubmitting(true);
    try {
      const res = await api.addFeedComment(tournamentId, text, parentId);
      setComments((prev) => [...prev, res.data.data]);
      setCommentCount((c) => c + 1);
      setReplyText('');
      setReplyingTo(null);
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
      setComments((prev) => prev.filter(
        (c) => String(c.id) !== String(commentId) && String(c.parentId) !== String(commentId)
      ));
      setCommentCount((c) => Math.max(0, c - 1));
    } catch {
      /* silent */
    }
  };

  const commentTree = buildCommentTree(comments);
  const likedByText = buildLikedByText(likeCount, liked, recentLikers);

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

        {likedByText && (
          <button
            type="button"
            onClick={handleOpenLikers}
            className="mt-1 text-xs text-gray-500 hover:text-gray-700 px-1 text-left transition-colors"
          >
            <svg className="w-3 h-3 inline-block mr-1 text-rose-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
            {likedByText}
          </button>
        )}
      </div>

      {shareOpen && isOwnTournament && (
        <FeedTournamentShareModal item={item} onClose={() => setShareOpen(false)} />
      )}

      {likersOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40" onClick={() => setLikersOpen(false)}>
          <div
            className="bg-white rounded-t-2xl sm:rounded-2xl w-full sm:max-w-sm max-h-[70vh] flex flex-col shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
              <span className="font-semibold text-sm text-[#272702]">Likes</span>
              <button type="button" onClick={() => setLikersOpen(false)} className="text-gray-400 hover:text-gray-600">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="overflow-y-auto flex-1 p-4 space-y-3">
              {loadingLikers && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="flex items-center gap-3 animate-pulse">
                      <div className="w-9 h-9 rounded-full bg-gray-200 flex-shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 bg-gray-200 rounded w-1/3" />
                        <div className="h-2.5 bg-gray-100 rounded w-1/4" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {!loadingLikers && likersList?.length === 0 && (
                <p className="text-xs text-gray-400 text-center py-4">No likes yet.</p>
              )}
              {!loadingLikers && likersList?.map((liker) => (
                <div key={String(liker.id)} className="flex items-center gap-3">
                  <CommentAvatar name={liker.name} photo={liker.profilePhoto} size={9} />
                  <div>
                    <p className="text-sm font-semibold text-[#272702]">{liker.name}</p>
                    {liker.city && <p className="text-xs text-gray-400">{liker.city}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
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

          {!loadingComments && commentTree.length > 0 && (
            <div className="space-y-3">
              {commentTree.map((c) => (
                <CommentNode
                  key={String(c.id)}
                  comment={c}
                  currentUserId={currentUserId}
                  replyingTo={replyingTo}
                  replyText={replyText}
                  submitting={submitting}
                  onDelete={handleDeleteComment}
                  onStartReply={(id) => { setReplyingTo(String(id)); setReplyText(''); }}
                  onCancelReply={() => setReplyingTo(null)}
                  onSubmitReply={handleSubmitReply}
                  onReplyTextChange={setReplyText}
                />
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
