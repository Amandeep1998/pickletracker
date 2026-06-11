// Cookie/tracking consent gate. EU/UK ePrivacy + GDPR require opt-IN before loading
// non-essential trackers (PostHog analytics, Sentry session replay). Outside EU/UK we
// default to opt-OUT semantics (load unless the user has declined) which is acceptable
// under CCPA/CPRA as long as a "do not sell/share" / decline path exists.
import { requiresCookieOptIn } from '../config/legal';

const KEY = 'pt-cookie-consent'; // 'granted' | 'denied'

export function getConsentState() {
  try {
    return localStorage.getItem(KEY); // null = undecided
  } catch {
    return null;
  }
}

export function setConsent(granted) {
  try {
    localStorage.setItem(KEY, granted ? 'granted' : 'denied');
  } catch {
    /* storage blocked — treat as session-only, trackers stay off */
  }
  window.dispatchEvent(new CustomEvent('pt-cookie-consent-changed', { detail: granted }));
}

/**
 * Whether non-essential trackers are allowed to load right now.
 * - EU/UK: only if the user has explicitly granted (opt-in).
 * - Elsewhere: allowed unless the user explicitly denied (opt-out).
 */
export function analyticsAllowed() {
  const state = getConsentState();
  if (requiresCookieOptIn()) return state === 'granted';
  return state !== 'denied';
}

/** Whether we still need to show the banner (no decision recorded yet). */
export function needsConsentDecision() {
  return getConsentState() === null;
}
