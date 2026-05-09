import { useState, useEffect, useRef, useCallback, useMemo, memo } from 'react';
import { createPortal } from 'react-dom';
import { useNavigate } from 'react-router-dom';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useAuth } from '../context/AuthContext';
import * as api from '../services/api';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { useSocket } from '../context/SocketContext';
import { FeedCard } from './FeedPostCard';
import PlayerProfileModal from './PlayerProfileModal';
import PaddleLoader from './PaddleLoader';

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

const FriendRequestRow = memo(function FriendRequestRowInner({ request, onAccept, onReject, busy }) {
  const u = request.user;
  const name = u?.name || 'Player';
  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="flex items-start gap-3 px-4 py-3 bg-[#f8fafc]">
      {u?.profilePhoto ? (
        <img src={u.profilePhoto} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0 mt-0.5 border border-gray-200" />
      ) : (
        <span
          className="w-9 h-9 rounded-full flex items-center justify-center text-[11px] font-bold text-white flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          {initials}
        </span>
      )}
      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#272702] leading-snug">
          <span className="font-semibold">{name}</span>
          <span className="text-gray-600 font-normal"> wants to be friends</span>
        </p>
        {u?.city && <p className="text-[11px] text-gray-400 mt-0.5">{u.city}</p>}
        <p className="text-[11px] text-[#4a6e10] mt-1.5 leading-snug">
          If you accept, <span className="font-semibold">{name}</span> can view your tournament &amp; session schedule — and you can view theirs.
        </p>
        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(request.createdAt)}</p>
        <div className="flex flex-wrap gap-2 mt-2">
          <button
            type="button"
            disabled={busy}
            onClick={() => onAccept(request.id)}
            className="text-xs font-bold text-white px-3 py-1.5 rounded-lg disabled:opacity-50 transition-opacity"
            style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
          >
            Accept
          </button>
          <button
            type="button"
            disabled={busy}
            onClick={() => onReject(request.id)}
            className="text-xs font-semibold text-gray-600 px-3 py-1.5 rounded-lg border border-gray-200 bg-white hover:bg-gray-50 disabled:opacity-50"
          >
            Decline
          </button>
        </div>
      </div>
    </div>
  );
});

function formatCategoryDate(dateStr) {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  const dt = new Date(y, m - 1, d);
  return dt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

const NotificationItem = memo(function NotificationItemInner({ notif, onNotificationClick }) {
  const isComment = notif.type === 'comment';
  const isFriendConnected = notif.type === 'friend_connected';
  const isTournamentReminder = notif.type === 'tournament_reminder';
  const isLogResults = notif.type === 'log_results';
  const initials = (notif.actorName || '?')[0].toUpperCase();

  if (isTournamentReminder || isLogResults) {
    const categoryLabel = notif.categoryName || '';
    const tournamentLabel = notif.tournamentName || 'tournament';
    const dateLabel = formatCategoryDate(notif.categoryDate);
    return (
      <button
        type="button"
        onClick={() => onNotificationClick(notif)}
        className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50/90 active:bg-gray-100/80 ${
          notif.read ? '' : 'bg-[#f4f8e8]'
        }`}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-base flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
          aria-hidden
        >
          {isLogResults ? '🏆' : '⏰'}
        </span>
        <div className="flex-1 min-w-0">
          {isLogResults ? (
            <p className="text-sm text-[#272702] leading-snug break-words">
              How did <span className="font-medium text-[#4a6e10]">{tournamentLabel}</span>
              {categoryLabel ? <> — <span className="font-medium">{categoryLabel}</span></> : null} go? Tap to log your medal.
            </p>
          ) : (
            <p className="text-sm text-[#272702] leading-snug break-words">
              <span className="font-semibold">Tomorrow:</span>{' '}
              <span className="font-medium text-[#4a6e10]">{tournamentLabel}</span>
              {categoryLabel ? <> — <span className="font-medium">{categoryLabel}</span></> : null}. Good luck!
            </p>
          )}
          {dateLabel && (
            <p className="text-[11px] text-gray-500 mt-0.5">{dateLabel}</p>
          )}
          <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
        </div>
        {!notif.read && (
          <span className="w-2 h-2 rounded-full bg-[#91BE4D] flex-shrink-0 mt-2" aria-hidden />
        )}
      </button>
    );
  }

  if (isFriendConnected) {
    return (
      <button
        type="button"
        onClick={() => onNotificationClick(notif)}
        className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50/90 active:bg-gray-100/80 ${
          notif.read ? '' : 'bg-[#f4f8e8]'
        }`}
      >
        <span
          className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
          style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
        >
          {initials}
        </span>
        <div className="flex-1 min-w-0">
          <p className="text-sm text-[#272702] leading-snug break-words">
            You and <span className="font-semibold">{notif.actorName}</span> are now friends.
          </p>
          <p className="text-xs text-gray-500 mt-1 leading-snug">
            You can view each other&apos;s schedule from your friends list.
          </p>
          <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
        </div>
        {!notif.read && (
          <span className="w-2 h-2 rounded-full bg-[#91BE4D] flex-shrink-0 mt-2" aria-hidden />
        )}
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => onNotificationClick(notif)}
      className={`w-full text-left flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50/90 active:bg-gray-100/80 ${notif.read ? '' : 'bg-[#f4f8e8]'}`}
    >
      {/* Actor avatar */}
      <span
        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
        style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D 45%, #ec9937)' }}
      >
        {initials}
      </span>

      <div className="flex-1 min-w-0">
        <p className="text-sm text-[#272702] leading-snug break-words">
          <span className="font-semibold">{notif.actorName}</span>
          {isComment ? ' commented on ' : ' liked '}
          <span className="font-medium text-[#4a6e10] break-words">{notif.tournamentName}</span>
        </p>
        {isComment && notif.commentText && (
          <p className="text-xs text-gray-500 mt-0.5 line-clamp-2">
            "{notif.commentText}"
          </p>
        )}
        <p className="text-[11px] text-gray-400 mt-1">{timeAgo(notif.createdAt)}</p>
      </div>

      {/* Unread dot */}
      {!notif.read && (
        <span className="w-2 h-2 rounded-full bg-[#91BE4D] flex-shrink-0 mt-2" aria-hidden />
      )}
    </button>
  );
});

function PushPrompt({ onEnable, enabling }) {
  return (
    <div className="mx-3 sm:mx-4 my-3 rounded-xl border border-[#91BE4D]/30 bg-[#f4f8e8] p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 min-w-0">
      <div className="flex gap-3 items-start min-w-0 flex-1">
        <span className="text-xl flex-shrink-0 leading-none pt-0.5">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#272702]">Enable push notifications</p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
            Get notified for comments and likes on your posts, plus tournament reminders
          </p>
        </div>
      </div>
      <button
        type="button"
        onClick={onEnable}
        disabled={enabling}
        className="w-full sm:w-auto shrink-0 text-xs font-bold text-white px-3 py-2.5 sm:py-1.5 rounded-lg disabled:opacity-60 transition-opacity text-center"
        style={{ background: 'linear-gradient(to right, #2d7005, #91BE4D)' }}
      >
        {enabling ? '…' : 'Allow'}
      </button>
    </div>
  );
}

function PushDeniedBanner() {
  return (
    <div className="mx-3 sm:mx-4 my-3 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2.5 flex items-start gap-2 min-w-0">
      <span className="text-base flex-shrink-0 leading-none mt-0.5">🔕</span>
      <p className="text-[11px] text-gray-500 leading-snug min-w-0 flex-1 break-words">
        Notifications blocked — enable them in your browser settings to get live updates.
      </p>
    </div>
  );
}

const EST_SECTION = 30;
const EST_FRIEND = 148;
const EST_NOTIF = 82;
const EST_NOTIF_WITH_COMMENT = 100;
const EST_NOTIF_FRIEND = 102;
const EST_NOTIF_REMINDER = 100;

function buildFriendRows(friendRequests) {
  return friendRequests.map((req) => ({
    type: 'friend',
    key: `fr-${req.id}`,
    request: req,
  }));
}

function buildNotifRows(notifs) {
  return notifs.map((n) => ({
    type: 'notif',
    key: `n-${n.id}`,
    notif: n,
  }));
}

function NotificationPanelVirtualList({
  rows,
  onAcceptFriend,
  onRejectFriend,
  friendActionId,
  onNotificationClick,
}) {
  const scrollRef = useRef(null);
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => scrollRef.current,
    estimateSize: (index) => {
      const row = rows[index];
      if (!row) return EST_NOTIF;
      if (row.type === 'section') return EST_SECTION;
      if (row.type === 'friend') return EST_FRIEND;
      if (row.type === 'notif' && row.notif?.type === 'friend_connected') return EST_NOTIF_FRIEND;
      if (row.type === 'notif' && (row.notif?.type === 'tournament_reminder' || row.notif?.type === 'log_results')) {
        return EST_NOTIF_REMINDER;
      }
      return row.notif?.commentText ? EST_NOTIF_WITH_COMMENT : EST_NOTIF;
    },
    overscan: 8,
    gap: 0,
    enabled: rows.length > 0,
  });

  return (
    <div
      ref={scrollRef}
      className="max-h-[min(420px,55dvh)] sm:max-h-[420px] overflow-y-auto overflow-x-hidden min-h-0 flex-1"
    >
      <div className="relative w-full" style={{ height: virtualizer.getTotalSize() }}>
        {virtualizer.getVirtualItems().map((v) => {
          const row = rows[v.index];
          return (
            <div
              key={v.key}
              data-index={v.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${v.start}px)`,
              }}
            >
              {row.type === 'section' && (
                <div
                  className={`px-4 pt-3 pb-1 bg-white ${row.showBorder ? 'border-t border-gray-100' : ''}`}
                >
                  <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{row.label}</p>
                </div>
              )}
              {row.type === 'friend' && (
                <FriendRequestRow
                  request={row.request}
                  onAccept={onAcceptFriend}
                  onReject={onRejectFriend}
                  busy={String(friendActionId) === String(row.request.id)}
                />
              )}
              {row.type === 'notif' && (
                <NotificationItem notif={row.notif} onNotificationClick={onNotificationClick} />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default function NotificationBell() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const containerRef = useRef(null);
  const friendPanelRef = useRef(null);
  const notifPanelRef = useRef(null);
  const socket = useSocket();
  const [friendOpen, setFriendOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [mobilePanelTop, setMobilePanelTop] = useState(0);

  const computeMobilePanelTop = useCallback(() => {
    if (!containerRef.current) return;
    let el = containerRef.current.parentElement;
    while (el && el !== document.body) {
      if (getComputedStyle(el).position === 'sticky') {
        setMobilePanelTop(el.getBoundingClientRect().bottom);
        return;
      }
      el = el.parentElement;
    }
    setMobilePanelTop(containerRef.current.getBoundingClientRect().bottom + 8);
  }, []);
  const [isMobileLayout, setIsMobileLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  );
  const [notifications, setNotifications] = useState([]);
  const [incomingFriendRequests, setIncomingFriendRequests] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [enabling, setEnabling] = useState(false);
  const [friendActionId, setFriendActionId] = useState(null);

  /** Like/comment notification → full post in overlay */
  const [feedPostModal, setFeedPostModal] = useState(null);
  /** null | { loading: true, expandComments } | { error: string } | { item, expandComments } */

  const [profilePlayerId, setProfilePlayerId] = useState(null);

  const { permission, subscribed, checking, isSupported, pushSupportMessage, requestAndSubscribe, refreshPushState } =
    usePushNotifications();

  const refreshBellData = useCallback(async () => {
    try {
      const [notifRes, friendsRes] = await Promise.all([
        api.getFeedNotifications(),
        api.getFriendRequests(),
      ]);
      setNotifications(notifRes.data.data || []);
      setUnreadCount(notifRes.data.unreadCount || 0);
      setIncomingFriendRequests(friendsRes.data.data?.incoming || []);
    } catch {
      /* silent */
    }
  }, []);

  /** Loads notifications + friend requests (+ push snapshot). Caller decides whether to mark feed notifications read. */
  const loadPanelData = useCallback(async () => {
    const [pushSnap, notifRes, friendsRes] = await Promise.all([
      refreshPushState(),
      api.getFeedNotifications(),
      api.getFriendRequests(),
    ]);
    setNotifications(notifRes.data.data || []);
    setUnreadCount(notifRes.data.unreadCount || 0);
    setIncomingFriendRequests(friendsRes.data.data?.incoming || []);
    return { pushSnap, notifRes };
  }, [refreshPushState]);

  useEffect(() => {
    refreshBellData();
    const interval = setInterval(refreshBellData, 60_000);
    return () => clearInterval(interval);
  }, [refreshBellData]);

  useEffect(() => {
    if (!socket) return;
    const onFriendRefresh = () => {
      refreshBellData();
    };
    socket.on('friend:refresh', onFriendRefresh);
    return () => socket.off('friend:refresh', onFriendRefresh);
  }, [socket, refreshBellData]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsMobileLayout(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Close on outside click (panel may be portaled outside the bell wrapper on mobile)
  useEffect(() => {
    if (!friendOpen && !notifOpen) return;
    const handler = (e) => {
      if (containerRef.current?.contains(e.target)) return;
      if (friendPanelRef.current?.contains(e.target)) return;
      if (notifPanelRef.current?.contains(e.target)) return;
      setFriendOpen(false);
      setNotifOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [friendOpen, notifOpen]);

  useEffect(() => {
    if (!friendOpen && !notifOpen) return;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setFriendOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [friendOpen, notifOpen]);

  useEffect(() => {
    if (!feedPostModal) return;
    const onKey = (e) => {
      if (e.key === 'Escape') setFeedPostModal(null);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [feedPostModal]);

  const handleOpenFeedFromNotification = useCallback((notif) => {
    const expandComments = notif.type === 'comment';
    setNotifOpen(false);
    setFriendOpen(false);
    setFeedPostModal({ loading: true, expandComments });
    api
      .getFeedPost(notif.tournamentId)
      .then((res) => {
        setFeedPostModal({
          item: res.data.data,
          expandComments,
        });
      })
      .catch(() => {
        setFeedPostModal({
          error: 'Could not load this post. It may no longer be available.',
        });
      });
  }, []);

  const handleNotificationClick = useCallback(
    (notif) => {
      if (notif.type === 'friend_connected') {
        setNotifOpen(false);
        setFriendOpen(false);
        api
          .markFeedNotificationRead(notif.id)
          .then((res) => {
            const uc = res.data?.unreadCount;
            if (typeof uc === 'number') setUnreadCount(uc);
            setNotifications((prev) =>
              prev.map((n) => (String(n.id) === String(notif.id) ? { ...n, read: true } : n)),
            );
          })
          .catch(() => {});
        navigate('/players');
        return;
      }
      if (notif.type === 'tournament_reminder' || notif.type === 'log_results') {
        setNotifOpen(false);
        setFriendOpen(false);
        api
          .markFeedNotificationRead(notif.id)
          .then((res) => {
            const uc = res.data?.unreadCount;
            if (typeof uc === 'number') setUnreadCount(uc);
            setNotifications((prev) =>
              prev.map((n) => (String(n.id) === String(notif.id) ? { ...n, read: true } : n)),
            );
          })
          .catch(() => {});
        navigate('/calendar');
        return;
      }
      handleOpenFeedFromNotification(notif);
    },
    [handleOpenFeedFromNotification, navigate],
  );

  const handleSendFriendFromProfile = useCallback(async (playerId) => {
    await api.sendFriendRequest(playerId);
  }, []);

  const handleToggleFriendPanel = async () => {
    if (friendOpen) {
      setFriendOpen(false);
      return;
    }
    computeMobilePanelTop();
    setNotifOpen(false);
    setFriendOpen(true);
    const hasCached = incomingFriendRequests.length > 0 || notifications.length > 0;
    setLoading(!hasCached);
    try {
      await loadPanelData();
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleToggleNotifPanel = async () => {
    if (notifOpen) {
      setNotifOpen(false);
      return;
    }
    computeMobilePanelTop();
    setFriendOpen(false);
    setNotifOpen(true);
    const hasCached = notifications.length > 0 || incomingFriendRequests.length > 0;
    setLoading(!hasCached);
    try {
      const { pushSnap, notifRes } = await loadPanelData();
      const needsEnableBanner =
        isSupported && pushSnap.permission === 'default' && !pushSnap.subscribed;
      if (!needsEnableBanner && (notifRes.data.unreadCount || 0) > 0) {
        api.markFeedNotificationsRead().catch(() => {});
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptFriend = async (requestId) => {
    setFriendActionId(requestId);
    try {
      await api.acceptFriendRequest(requestId);
      setIncomingFriendRequests((prev) => prev.filter((r) => String(r.id) !== String(requestId)));
    } catch {
      /* silent */
    } finally {
      setFriendActionId(null);
    }
  };

  const handleRejectFriend = async (requestId) => {
    setFriendActionId(requestId);
    try {
      await api.rejectFriendRequest(requestId);
      setIncomingFriendRequests((prev) => prev.filter((r) => String(r.id) !== String(requestId)));
    } catch {
      /* silent */
    } finally {
      setFriendActionId(null);
    }
  };

  const handleEnablePush = async () => {
    setEnabling(true);
    await requestAndSubscribe();
    setEnabling(false);
    // Push is now sorted — clear the badge by marking notifications read
    if (unreadCount > 0) {
      api.markFeedNotificationsRead().catch(() => {});
      setUnreadCount(0);
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    }
  };

  /** Only when the browser has not been asked yet — if permission is already granted, never nag here */
  const showPushPrompt =
    isSupported && !checking && permission === 'default' && !subscribed;
  const showPushDenied = isSupported && !checking && permission === 'denied';

  const friendIncomingCount = incomingFriendRequests.length;
  /** Bell badge: unread likes/comments only (+ push prompt nudge). Friend requests use the other icon. */
  const notifBadgeCount = showPushPrompt ? Math.max(1, unreadCount) : unreadCount;

  const friendPanelRows = useMemo(
    () => buildFriendRows(incomingFriendRequests),
    [incomingFriendRequests],
  );

  const notifPanelRows = useMemo(() => buildNotifRows(notifications), [notifications]);

  const listSkeleton = (
    <div className="max-h-[min(420px,55dvh)] sm:max-h-[420px] overflow-y-auto overflow-x-hidden min-h-0">
      <div className="space-y-0 divide-y divide-gray-50">
        {[1, 2, 3].map((i) => (
          <div key={i} className="flex items-start gap-3 px-4 py-3 animate-pulse">
            <div className="w-8 h-8 rounded-full bg-gray-200 flex-shrink-0" />
            <div className="flex-1 space-y-1.5 pt-1 min-w-0">
              <div className="h-3 bg-gray-200 rounded w-3/4" />
              <div className="h-2.5 bg-gray-100 rounded w-1/2" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const friendDropdownBody = (
    <>
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="font-semibold text-sm text-[#272702] truncate">Friend requests</h3>
      </div>

      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        {loading && friendPanelRows.length === 0 && listSkeleton}

        {!loading && friendIncomingCount === 0 && (
          <div className="max-h-[min(420px,55dvh)] sm:max-h-[420px] overflow-y-auto overflow-x-hidden min-h-0">
            <div className="text-center py-10 px-3">
              <p className="text-2xl mb-2">👋</p>
              <p className="text-sm font-medium text-gray-500">No pending friend requests</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                When someone sends you a request, it will appear here
              </p>
            </div>
          </div>
        )}

        {friendPanelRows.length > 0 && (
          <NotificationPanelVirtualList
            rows={friendPanelRows}
            onAcceptFriend={handleAcceptFriend}
            onRejectFriend={handleRejectFriend}
            friendActionId={friendActionId}
            onNotificationClick={handleNotificationClick}
          />
        )}
      </div>
    </>
  );

  const notifDropdownBody = (
    <>
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="font-semibold text-sm text-[#272702] truncate">Notifications</h3>
        {unreadCount === 0 && notifications.length > 0 && (
          <span className="text-[11px] text-gray-400 shrink-0">All caught up</span>
        )}
      </div>

      {showPushPrompt && <PushPrompt onEnable={handleEnablePush} enabling={enabling} />}
      {showPushDenied && <PushDeniedBanner />}
      {!isSupported && pushSupportMessage && (
        <div className="px-3 py-2.5 border-b border-amber-100 bg-amber-50/95 text-[11px] text-amber-950 leading-snug shrink-0">
          <p className="font-semibold text-amber-900 mb-0.5">Tournament push reminders</p>
          <p>{pushSupportMessage}</p>
        </div>
      )}

      <div className="flex flex-col min-h-0 flex-1 overflow-hidden">
        {loading && notifPanelRows.length === 0 && listSkeleton}

        {!loading && notifications.length === 0 && (
          <div className="max-h-[min(420px,55dvh)] sm:max-h-[420px] overflow-y-auto overflow-x-hidden min-h-0">
            <div className="text-center py-10 px-3">
              <p className="text-2xl mb-2">🔔</p>
              <p className="text-sm font-medium text-gray-500">No notifications yet</p>
              <p className="text-xs text-gray-400 mt-1 leading-relaxed">
                When someone likes or comments on your tournaments, you&apos;ll see it here
              </p>
            </div>
          </div>
        )}

        {notifPanelRows.length > 0 && (
          <NotificationPanelVirtualList
            rows={notifPanelRows}
            onAcceptFriend={handleAcceptFriend}
            onRejectFriend={handleRejectFriend}
            friendActionId={friendActionId}
            onNotificationClick={handleNotificationClick}
          />
        )}
      </div>
    </>
  );

  const desktopPanelClass =
    'absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] overflow-hidden flex flex-col min-w-0';

  const mobilePanelClass =
    'fixed z-[200] max-h-[min(85dvh,640px)] flex flex-col min-w-0 overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100 ' +
    'left-[max(0.75rem,env(safe-area-inset-left,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))]';
  const mobilePanelStyle = { top: mobilePanelTop || 0 };

  return (
    <div ref={containerRef} className="flex items-center gap-0.5">
      {/* Friend requests — separate from activity notifications */}
      <div className="relative">
        <button
          type="button"
          onClick={handleToggleFriendPanel}
          className={`relative p-2 rounded-lg transition-colors ${
            friendOpen ? 'bg-indigo-50 text-indigo-700' : 'text-gray-400 hover:text-indigo-600 hover:bg-indigo-50/80'
          }`}
          aria-label="Friend requests"
          aria-expanded={friendOpen}
          title="Friend requests"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z"
            />
          </svg>
          {friendIncomingCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-indigo-500 leading-none">
              {friendIncomingCount > 9 ? '9+' : friendIncomingCount}
            </span>
          )}
        </button>

        {friendOpen && !isMobileLayout && (
          <div ref={friendPanelRef} className={desktopPanelClass}>
            {friendDropdownBody}
          </div>
        )}

        {friendOpen &&
          isMobileLayout &&
          typeof document !== 'undefined' &&
          createPortal(
            <div ref={friendPanelRef} className={mobilePanelClass} style={mobilePanelStyle} role="dialog" aria-label="Friend requests">
              {friendDropdownBody}
            </div>,
            document.body,
          )}
      </div>

      {/* Likes & comments (+ push prompts) */}
      <div className="relative">
        <button
          type="button"
          onClick={handleToggleNotifPanel}
          className={`relative p-2 rounded-lg transition-colors ${
            notifOpen ? 'bg-[#f4f8e8] text-[#4a6e10]' : 'text-gray-400 hover:text-[#4a6e10] hover:bg-[#f4f8e8]'
          }`}
          aria-label="Notifications"
          aria-expanded={notifOpen}
          title="Notifications"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {notifBadgeCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 leading-none">
              {notifBadgeCount > 9 ? '9+' : notifBadgeCount}
            </span>
          )}
        </button>

        {notifOpen && !isMobileLayout && (
          <div ref={notifPanelRef} className={desktopPanelClass}>
            {notifDropdownBody}
          </div>
        )}

        {notifOpen &&
          isMobileLayout &&
          typeof document !== 'undefined' &&
          createPortal(
            <div ref={notifPanelRef} className={mobilePanelClass} style={mobilePanelStyle} role="dialog" aria-label="Notifications">
              {notifDropdownBody}
            </div>,
            document.body,
          )}
      </div>

      {feedPostModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            className="fixed inset-0 z-[240] flex items-end sm:items-center justify-center p-0 sm:p-4"
            onClick={() => setFeedPostModal(null)}
            role="presentation"
          >
            <div className="absolute inset-0 bg-black/50 backdrop-blur-[1px]" />
            <div
              className="relative w-full sm:max-w-md max-h-[min(90dvh,700px)] overflow-y-auto sm:rounded-2xl bg-[#f8fafc] p-3 sm:p-4 shadow-2xl ring-1 ring-black/10"
              onClick={(e) => e.stopPropagation()}
              role="dialog"
              aria-modal="true"
              aria-label="Feed post"
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <h2 className="text-sm font-semibold text-[#272702]">Post</h2>
                <button
                  type="button"
                  onClick={() => setFeedPostModal(null)}
                  className="text-gray-400 hover:text-[#272702] p-1 rounded-lg transition-colors"
                  aria-label="Close"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {feedPostModal.loading && (
                <div className="py-16 bg-white rounded-2xl border border-gray-100">
                  <PaddleLoader label="Loading post…" />
                </div>
              )}

              {feedPostModal.error && (
                <div className="rounded-2xl bg-white border border-gray-100 p-6 text-center text-sm text-gray-600">
                  {feedPostModal.error}
                </div>
              )}

              {feedPostModal.item && (
                <FeedCard
                  item={feedPostModal.item}
                  currentUserId={user?.id}
                  expandCommentsFromLink={Boolean(feedPostModal.expandComments)}
                  onViewProfile={(id) => {
                    setFeedPostModal(null);
                    setProfilePlayerId(id);
                  }}
                />
              )}
            </div>
          </div>,
          document.body
        )}

      {profilePlayerId && (
        <PlayerProfileModal
          playerId={profilePlayerId}
          onClose={() => setProfilePlayerId(null)}
          friendState="none"
          currentUserId={user?.id}
          onSendFriendRequest={handleSendFriendFromProfile}
        />
      )}
    </div>
  );
}
