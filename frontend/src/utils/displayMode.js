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

/**
 * Async check: returns true if the PWA is installed on this device.
 * Uses navigator.getInstalledRelatedApps() on Chromium; always false elsewhere.
 */
export async function checkPwaInstalled() {
  try {
    if (typeof navigator === 'undefined') return false;
    if (typeof navigator.getInstalledRelatedApps !== 'function') return false;
    const apps = await navigator.getInstalledRelatedApps();
    return apps.length > 0;
  } catch {
    return false;
  }
}
