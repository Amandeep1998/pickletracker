import { useState, useEffect } from 'react';
import * as api from '../services/api';

const VAPID_PUBLIC_KEY = import.meta.env.VITE_VAPID_PUBLIC_KEY;

function urlBase64ToUint8Array(base64String) {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  return new Uint8Array([...rawData].map((c) => c.charCodeAt(0)));
}

const isSupported =
  typeof window !== 'undefined' &&
  'Notification' in window &&
  'serviceWorker' in navigator &&
  'PushManager' in window;

export function usePushNotifications() {
  const [permission, setPermission] = useState(() =>
    isSupported ? Notification.permission : 'denied'
  );
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

  // Request browser permission then subscribe with VAPID key
  const requestAndSubscribe = async () => {
    if (!isSupported || !VAPID_PUBLIC_KEY) return false;
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      if (result !== 'granted') return false;

      const reg = await navigator.serviceWorker.ready;
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
    if (!isSupported || !VAPID_PUBLIC_KEY || Notification.permission !== 'granted') return;
    try {
      const reg = await navigator.serviceWorker.ready;
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
      const reg = await navigator.serviceWorker.ready;
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

  return { permission, subscribed, checking, isSupported, requestAndSubscribe, silentSubscribe, unsubscribe };
}
