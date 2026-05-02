import { isStandaloneDisplay } from './displayMode';

/**
 * Explains why Web Push tournament reminders may be unavailable.
 * `canSubscribe` matches what we need for PushManager.subscribe + SW + VAPID.
 */
export function getWebPushSupportState(vapidConfigured) {
  if (typeof window === 'undefined') {
    return {
      canSubscribe: false,
      userMessage: null,
      code: 'ssr',
    };
  }

  if (window.isSecureContext === false) {
    return {
      canSubscribe: false,
      userMessage: 'Open PickleTracker using HTTPS to use tournament push reminders.',
      code: 'insecure_context',
    };
  }

  const hasNotification = 'Notification' in window;
  const hasServiceWorker = 'serviceWorker' in navigator;
  const hasPushManager = 'PushManager' in window;

  if (!hasNotification || !hasServiceWorker || !hasPushManager) {
    const ua = navigator.userAgent || '';
    const iOS =
      /iPad|iPhone|iPod/.test(ua) ||
      (typeof navigator !== 'undefined' &&
        navigator.platform === 'MacIntel' &&
        navigator.maxTouchPoints > 1);

    if (iOS) {
      if (!isStandaloneDisplay()) {
        return {
          canSubscribe: false,
          userMessage:
            'On iPhone or iPad, push reminders only work in the installed app: tap Share → Add to Home Screen, then open PickleTracker from that icon (iOS 16.4+).',
          code: 'ios_needs_home_screen_app',
        };
      }
      return {
        canSubscribe: false,
        userMessage:
          'If reminders still do not appear, update to iOS 16.4 or newer. Web push works in the home-screen app, not in the Safari tab.',
        code: 'ios_standalone_maybe_old',
      };
    }

    return {
      canSubscribe: false,
      userMessage:
        'This browser cannot use Web Push (common inside Instagram/Facebook in-app browsers). Open PickleTracker in Safari or Chrome, or install the app to your home screen.',
      code: 'no_push_apis',
    };
  }

  if (!vapidConfigured) {
    return {
      canSubscribe: false,
      userMessage: 'Push reminders are not configured for this deployment.',
      code: 'missing_vapid',
    };
  }

  return { canSubscribe: true, userMessage: null, code: 'ok' };
}
