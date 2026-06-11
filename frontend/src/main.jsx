// Register PWA install listener before the rest of the bundle (race with beforeinstallprompt).
import './utils/pwaInstallPrompt';
import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { BrowserTracing, Replay } from '@sentry/react';
import posthog from 'posthog-js';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';
import { analyticsAllowed } from './utils/cookieConsent';

// Keyed to build fingerprint (vite.config define): git SHA on Vercel/GitHub, else unique per `vite build`.
const PWA_CACHE_PURGE_VERSION = import.meta.env.VITE_COMMIT || 'dev-build';
const PWA_CACHE_PURGE_KEY = `pt-pwa-purge-${PWA_CACHE_PURGE_VERSION}`;

/**
 * Incognito looks "fresh" because it has no SW/cache; main Chrome profile can keep an old precached bundle.
 * Once per version: unregister SW, wipe Cache API, reload once, then the new JS runs normally.
 */
async function purgeStalePwaShellOnce() {
  if (!import.meta.env.PROD) return false;
  try {
    if (localStorage.getItem(PWA_CACHE_PURGE_KEY)) return false;
  } catch {
    return false;
  }

  let didWork = false;
  try {
    if ('serviceWorker' in navigator) {
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const reg of regs) {
        await reg.unregister();
        didWork = true;
      }
    }
    if ('caches' in window) {
      const keys = await caches.keys();
      for (const key of keys) {
        await caches.delete(key);
        didWork = true;
      }
    }
  } catch {
    /* continue: still mark complete to avoid loops */
  }

  try {
    localStorage.setItem(PWA_CACHE_PURGE_KEY, '1');
  } catch {
    /* ignore */
  }

  if (didWork) {
    window.location.reload();
    return true;
  }
  return false;
}

async function bootstrap() {
  if (await purgeStalePwaShellOnce()) {
    return;
  }

  if (import.meta.env.PROD && import.meta.env.VITE_COMMIT) {
    console.info('[PickleTracker] build', import.meta.env.VITE_COMMIT.slice(0, 7));
  }

  let reloadingForNewVersion = false;
  function scheduleReloadForNewVersion() {
    if (reloadingForNewVersion) return;
    reloadingForNewVersion = true;
    window.location.reload();
  }

  registerSW({
    immediate: true,
    // Extra safety when the plugin detects a waiting worker (pairs with autoUpdate).
    onNeedRefresh: scheduleReloadForNewVersion,
  });

  /**
   * With registerType: 'autoUpdate' + skipWaiting + clientsClaim, a new SW activates silently
   * but the current tab keeps running the OLD JS bundle until the user manually reloads.
   * Listening for `controllerchange` lets us reload once as soon as the new SW takes control,
   * so installed PWAs (especially on mobile home screens) always show the latest UI.
   */
  if (typeof navigator !== 'undefined' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      scheduleReloadForNewVersion();
    });
  }

  function pingServiceWorkerUpdate() {
    if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) return;
    navigator.serviceWorker.getRegistration().then((reg) => {
      if (reg) reg.update();
    });
  }
  if (typeof document !== 'undefined') {
    pingServiceWorkerUpdate();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') pingServiceWorkerUpdate();
    });
    // Covers users who keep the PWA foregrounded for hours without backgrounding it.
    setInterval(pingServiceWorkerUpdate, 30 * 60 * 1000);
  }

  // Non-essential trackers only load with consent (EU/UK opt-in; opt-out elsewhere).
  // The CookieConsentBanner reloads on grant so this runs again with consent in place.
  const trackingAllowed = analyticsAllowed();

  if (trackingAllowed && import.meta.env.VITE_POSTHOG_KEY) {
    posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
      api_host: 'https://app.posthog.com',
      autocapture: false,
      capture_pageview: true,
    });
  }

  if (trackingAllowed && import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
      dsn: import.meta.env.VITE_SENTRY_DSN,
      integrations: [
        new BrowserTracing(),
        new Replay({
          maskAllText: false,
          blockAllMedia: false,
        }),
      ],
      tracesSampleRate: 0.1,
      replaysSessionSampleRate: 0.1,
      replaysOnErrorSampleRate: 1.0,
      environment: import.meta.env.MODE,
    });
  }

  ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </React.StrictMode>
  );
}

bootstrap();
