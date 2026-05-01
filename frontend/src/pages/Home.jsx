import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';

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

function FeedCard({ item, currentUserId }) {
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

// ── Page ──────────────────────────────────────────────────────────────────────

const FILTERS = [
  { key: 'all',      label: 'All' },
  { key: 'upcoming', label: 'Upcoming' },
  { key: 'played',   label: 'Played' },
];

export default function Home() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [feed, setFeed] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState('all');

  useEffect(() => {
    let mounted = true;
    api.getFeed()
      .then((res) => { if (mounted) setFeed(res.data.data || []); })
      .catch(() => { if (mounted) setError('Could not load feed. Please try again.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, []);

  const firstName = (user?.name || '').split(' ')[0];

  const visibleFeed = feed.filter((item) => {
    if (filter === 'upcoming') return item.type === 'upcoming';
    if (filter === 'played')   return item.type === 'recent';
    return true;
  });

  return (
    <div className="min-h-screen bg-[#f8faf3]">
      <div className="max-w-2xl mx-auto px-4 py-6 space-y-4">

        {/* Greeting */}
        <div>
          <h1 className="text-xl font-bold text-[#272702]">
            Hey {firstName} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            See what your fellow picklers are up to
          </p>
        </div>

        {/* CTA card */}
        <div
          className="rounded-2xl p-4 flex items-center justify-between cursor-pointer hover:opacity-95 transition-opacity"
          style={{ background: 'linear-gradient(135deg, #2d7005 0%, #91BE4D 55%, #ec9937 100%)' }}
          onClick={() => navigate('/calendar')}
        >
          <div>
            <p className="text-white font-semibold text-sm">Playing a tournament?</p>
            <p className="text-white/80 text-xs mt-0.5">
              Log it and let your community know
            </p>
          </div>
          <button className="flex-shrink-0 bg-white/20 hover:bg-white/30 text-white text-xs font-bold px-3 py-1.5 rounded-xl transition-colors border border-white/30 whitespace-nowrap">
            Log Tournament →
          </button>
        </div>

        {/* Toggle */}
        <div className="flex bg-white rounded-xl border border-gray-100 shadow-sm p-1 gap-1">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`flex-1 py-1.5 text-sm font-semibold rounded-lg transition-colors ${
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
            {[1, 2, 3].map((i) => <SkeletonCard key={i} />)}
          </div>
        )}

        {!loading && error && (
          <div className="text-center py-12">
            <p className="text-sm text-gray-400">{error}</p>
            <button
              onClick={() => { setError(''); setLoading(true); api.getFeed().then((r) => setFeed(r.data.data || [])).catch(() => setError('Could not load feed.')).finally(() => setLoading(false)); }}
              className="mt-3 text-xs text-[#91BE4D] font-semibold hover:underline"
            >
              Try again
            </button>
          </div>
        )}

        {!loading && !error && visibleFeed.length === 0 && (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🎾</div>
            <p className="font-semibold text-[#272702]">
              {filter === 'upcoming' ? 'No upcoming tournaments' : filter === 'played' ? 'No recent results' : 'No activity yet'}
            </p>
            <p className="text-sm text-gray-400 mt-1">
              {filter === 'all' ? 'Be the first to log a tournament!' : 'Try switching to a different filter'}
            </p>
            <button
              onClick={() => navigate('/calendar')}
              className="mt-4 text-sm font-semibold text-white px-5 py-2 rounded-xl hover:opacity-90 transition-opacity"
              style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
            >
              Log Tournament
            </button>
          </div>
        )}

        {!loading && !error && visibleFeed.length > 0 && (
          <div className="space-y-3">
            {visibleFeed.map((item) => (
              <FeedCard key={item.id} item={item} currentUserId={user?.id} />
            ))}
          </div>
        )}

      </div>
    </div>
  );
}
