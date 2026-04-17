import React from 'react';
import ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import * as Sentry from '@sentry/react';
import { BrowserTracing, Replay } from '@sentry/react';
import posthog from 'posthog-js';
import App from './App';
import './index.css';
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  // When a new build is deployed, reload so the app does not stay on precached old UI.
  onNeedRefresh() {
    window.location.reload();
  },
});

// Desktop tabs often keep an old service worker until explicitly checked; refresh when user returns.
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
}

if (import.meta.env.VITE_POSTHOG_KEY) {
  posthog.init(import.meta.env.VITE_POSTHOG_KEY, {
    api_host: 'https://app.posthog.com',
    autocapture: false, // only track explicit events we fire
    capture_pageview: true,
  });
}

if (import.meta.env.VITE_SENTRY_DSN) {
  Sentry.init({
    dsn: import.meta.env.VITE_SENTRY_DSN,
    integrations: [
      new BrowserTracing(),
      new Replay({
        maskAllText: false,    // show actual text in replays
        blockAllMedia: false,  // show images/media
      }),
    ],
    tracesSampleRate: 0.1,
    replaysSessionSampleRate: 0.1,  // record 10% of all sessions
    replaysOnErrorSampleRate: 1.0,  // record 100% of sessions that hit an error
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
