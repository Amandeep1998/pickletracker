import { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../services/api';
import { getWebPushSupportState } from '../utils/webPushSupport';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;
const vapidConfigured = Boolean(VAPID_PUBLIC_KEY);

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

export function usePushNotifications() {
  const support = useMemo(() => getWebPushSupportState(vapidConfigured), []);
  const { canSubscribe: isSupported, userMessage: pushSupportMessage } = support;

  const [permission, setPermission] = useState(() => {
    if (!support.canSubscribe || typeof window === 'undefined' || !('Notification' in window)) {
      return 'denied';
    }
    return Notification.permission;
  });
  const [subscribed, setSubscribed] = useState(false);
  const [checking, setChecking] = useState(isSupported);

  useEffect(() => {
    if (!isSupported) return;
    navigator.serviceWorker.ready
      .then((reg) => reg.pushManager.getSubscription())
      .then((sub) => setSubscribed(!!sub))
      .catch(() => {})
      .finally(() => setChecking(false));
  }, []);

  const swReady = (timeoutMs = 8000) =>
    Promise.race([
      navigator.serviceWorker.ready,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Service worker not ready')), timeoutMs)
      ),
    ]);

  // Request browser permission then subscribe with VAPID key
  const requestAndSubscribe = async () => {
    if (!isSupported || !vapidConfigured) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return false;

      const reg = await swReady();
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await api.subscribePush(sub.toJSON());
      setSubscribed(true);
      return true;
    } catch (err) {
      console.error('[Push] Subscribe error:', err);
      return false;
    }
  };

  const silentSubscribe = async () => {
    if (!isSupported || !vapidConfigured || Notification.permission !== 'granted') return;
    try {
      const reg = await swReady();
      const existing = await reg.pushManager.getSubscription();
      if (existing) {
        setSubscribed(true);
        return;
      }
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
      });
      await api.subscribePush(sub.toJSON());
      setSubscribed(true);
    } catch (err) {
      console.error('[Push] Silent subscribe error:', err);
    }
  };

  const unsubscribe = async () => {
    if (!isSupported) return;
    try {
      const reg = await swReady();
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await api.unsubscribePush(sub.endpoint);
        await sub.unsubscribe();
      }
      setSubscribed(false);
    } catch (err) {
      console.error('[Push] Unsubscribe error:', err);
    }
  };

  /**
   * Re-read Notification.permission + PushManager subscription (fixes stale state when
   * another screen subscribed). Optionally creates subscription if permission already granted.
   * Returns a snapshot for immediate UI logic before the next paint.
   */
  const refreshPushState = useCallback(async () => {
    if (!isSupported) {
      return { permission: 'denied', subscribed: false };
    }
    const perm = Notification.permission;
    setPermission(perm);
    try {
      const reg = await swReady();
      let sub = await reg.pushManager.getSubscription();
      setSubscribed(!!sub);
      if (perm === 'granted' && !sub && vapidConfigured) {
        try {
          sub = await reg.pushManager.subscribe({
            userVisibleOnly: true,
            applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC_KEY),
          });
          await api.subscribePush(sub.toJSON());
          setSubscribed(true);
        } catch (err) {
          console.error('[Push] refreshPushState subscribe:', err);
        }
      }
      sub = await reg.pushManager.getSubscription();
      const ok = !!sub;
      setSubscribed(ok);
      return { permission: perm, subscribed: ok };
    } catch (err) {
      console.error('[Push] refreshPushState:', err);
      return { permission: perm, subscribed: false };
    }
  }, [isSupported]);

  return {
    permission,
    subscribed,
    checking,
    isSupported,
    pushSupportMessage,
    requestAndSubscribe,
    silentSubscribe,
    unsubscribe,
    refreshPushState,
  };
}
