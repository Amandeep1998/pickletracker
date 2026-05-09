/**
 * Whether the app is running as an installed PWA / home-screen web app.
 * Safe on older browsers: no matchMedia, or unknown media features, must not throw.
 */
export function isStandaloneDisplay() {
  try {
    if (typeof navigator !== 'undefined' && navigator.standalone === true) return true;
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return false;
    const mq = window.matchMedia('(display-mode: standalone)');
    return !!(mq && mq.matches);
  } catch {
    return false;
  }
}

const PWA_INSTALLED_KEY = 'pwa_installed';

/** Persist install flag — call this when appinstalled fires. */
export function markPwaInstalled() {
  try { localStorage.setItem(PWA_INSTALLED_KEY, '1'); } catch { /* ignore */ }
}

/** Sync check: was the app ever installed on this device? */
export function readPwaInstalled() {
  try { return localStorage.getItem(PWA_INSTALLED_KEY) === '1'; } catch { return false; }
}
