import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import * as api from '../services/api';
import { usePushNotifications } from '../hooks/usePushNotifications';

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

function NotificationItem({ notif }) {
  const isComment = notif.type === 'comment';
  const initials = (notif.actorName || '?')[0].toUpperCase();

  return (
    <div className={`flex items-start gap-3 px-4 py-3 transition-colors ${notif.read ? '' : 'bg-[#f4f8e8]'}`}>
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
        <span className="w-2 h-2 rounded-full bg-[#91BE4D] flex-shrink-0 mt-2" />
      )}
    </div>
  );
}

function PushPrompt({ onEnable, enabling }) {
  return (
    <div className="mx-3 sm:mx-4 my-3 rounded-xl border border-[#91BE4D]/30 bg-[#f4f8e8] p-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-3 min-w-0">
      <div className="flex gap-3 items-start min-w-0 flex-1">
        <span className="text-xl flex-shrink-0 leading-none pt-0.5">🔔</span>
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold text-[#272702]">Enable push notifications</p>
          <p className="text-[11px] text-gray-500 mt-0.5 leading-snug">
            Get notified when someone comments and for tournament reminders
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

export default function NotificationBell() {
  const containerRef = useRef(null);
  const panelRef = useRef(null);
  const [open, setOpen] = useState(false);
  const [isMobileLayout, setIsMobileLayout] = useState(
    () => typeof window !== 'undefined' && window.matchMedia('(max-width: 639px)').matches
  );
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [enabling, setEnabling] = useState(false);

  const { permission, subscribed, checking, isSupported, requestAndSubscribe } = usePushNotifications();

  // Poll unread count every 60s while page is open
  const fetchUnreadCount = useCallback(async () => {
    try {
      const res = await api.getFeedNotifications();
      setUnreadCount(res.data.unreadCount || 0);
    } catch { /* silent */ }
  }, []);

  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 60_000);
    return () => clearInterval(interval);
  }, [fetchUnreadCount]);

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)');
    const sync = () => setIsMobileLayout(mq.matches);
    sync();
    mq.addEventListener('change', sync);
    return () => mq.removeEventListener('change', sync);
  }, []);

  // Close on outside click (panel may be portaled outside the bell wrapper on mobile)
  useEffect(() => {
    if (!open) return;
    const handler = (e) => {
      if (containerRef.current?.contains(e.target)) return;
      if (panelRef.current?.contains(e.target)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const handleOpen = async () => {
    if (open) { setOpen(false); return; }
    setOpen(true);
    setLoading(true);
    try {
      const res = await api.getFeedNotifications();
      setNotifications(res.data.data || []);
      setUnreadCount(res.data.unreadCount || 0);
      // Only mark read if push is already sorted out — keep the badge while the prompt is showing
      const pushPending = isSupported && !checking && permission !== 'denied' && !subscribed;
      if (!pushPending && (res.data.unreadCount || 0) > 0) {
        api.markFeedNotificationsRead().catch(() => {});
        setUnreadCount(0);
        setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      }
    } catch { /* silent */ }
    finally { setLoading(false); }
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

  const showPushPrompt = isSupported && !checking && permission !== 'denied' && !subscribed;
  const showPushDenied = isSupported && !checking && permission === 'denied';

  // Show at least "1" while push permission hasn't been resolved — draws user to the prompt
  const badgeCount = showPushPrompt ? Math.max(1, unreadCount) : unreadCount;

  const dropdownBody = (
    <>
      <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-gray-100 shrink-0">
        <h3 className="font-semibold text-sm text-[#272702] truncate">Notifications</h3>
        {unreadCount === 0 && notifications.length > 0 && (
          <span className="text-[11px] text-gray-400 shrink-0">All caught up</span>
        )}
      </div>

      {showPushPrompt && <PushPrompt onEnable={handleEnablePush} enabling={enabling} />}
      {showPushDenied && <PushDeniedBanner />}

      <div className="max-h-[min(360px,50dvh)] sm:max-h-[360px] overflow-y-auto overflow-x-hidden min-h-0">
        {loading && (
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
        )}

        {!loading && notifications.length === 0 && (
          <div className="text-center py-10 px-3">
            <p className="text-2xl mb-2">🔔</p>
            <p className="text-sm font-medium text-gray-500">No notifications yet</p>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              When someone likes or comments on your tournaments, you'll see it here
            </p>
          </div>
        )}

        {!loading && notifications.length > 0 && (
          <div className="divide-y divide-gray-50">
            {notifications.map((n) => (
              <NotificationItem key={String(n.id)} notif={n} />
            ))}
          </div>
        )}
      </div>
    </>
  );

  const desktopPanelClass =
    'absolute right-0 mt-2 w-80 max-w-[calc(100vw-1.5rem)] bg-white rounded-2xl shadow-xl border border-gray-100 z-[100] overflow-hidden flex flex-col min-w-0';

  const mobilePanelClass =
    'fixed z-[200] top-[calc(4rem+env(safe-area-inset-top,0px))] max-h-[min(85dvh,640px)] flex flex-col min-w-0 overflow-hidden bg-white rounded-2xl shadow-xl border border-gray-100 ' +
    'left-[max(0.75rem,env(safe-area-inset-left,0px))] right-[max(0.75rem,env(safe-area-inset-right,0px))]';

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className={`relative p-2 rounded-lg transition-colors ${
          open ? 'bg-[#f4f8e8] text-[#4a6e10]' : 'text-gray-400 hover:text-[#4a6e10] hover:bg-[#f4f8e8]'
        }`}
        aria-label="Notifications"
        aria-expanded={open}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
        </svg>
        {badgeCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-0.5 rounded-full flex items-center justify-center text-[10px] font-bold text-white bg-rose-500 leading-none">
            {badgeCount > 9 ? '9+' : badgeCount}
          </span>
        )}
      </button>

      {open && !isMobileLayout && (
        <div ref={panelRef} className={desktopPanelClass}>
          {dropdownBody}
        </div>
      )}

      {open &&
        isMobileLayout &&
        typeof document !== 'undefined' &&
        createPortal(
          <div ref={panelRef} className={mobilePanelClass} role="dialog" aria-label="Notifications">
            {dropdownBody}
          </div>,
          document.body
        )}
    </div>
  );
}
