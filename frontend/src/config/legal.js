// Mirror of backend/src/config/legal.js — keep the two in sync.
export const TERMS_VERSION = '2026-04-25';
export const PRIVACY_VERSION = '2026-04-25';
export const MIN_AGE_EU = 16;
export const MIN_AGE_DEFAULT = 13;

// EU member-state IANA time-zone prefixes/zones we treat as GDPR "eu" for the age gate.
// Coarse on purpose: it only decides 16 vs 13 and which cookie-consent default to show.
const EU_ZONES = new Set([
  'Europe/Vienna', 'Europe/Brussels', 'Europe/Sofia', 'Europe/Zagreb', 'Europe/Nicosia',
  'Europe/Prague', 'Europe/Copenhagen', 'Europe/Tallinn', 'Europe/Helsinki', 'Europe/Paris',
  'Europe/Berlin', 'Europe/Busingen', 'Europe/Athens', 'Europe/Budapest', 'Europe/Dublin',
  'Europe/Rome', 'Europe/Riga', 'Europe/Vilnius', 'Europe/Luxembourg', 'Europe/Malta',
  'Europe/Amsterdam', 'Europe/Warsaw', 'Europe/Lisbon', 'Atlantic/Azores', 'Atlantic/Madeira',
  'Europe/Bucharest', 'Europe/Bratislava', 'Europe/Ljubljana', 'Europe/Madrid',
  'Africa/Ceuta', 'Atlantic/Canary', 'Europe/Stockholm',
]);

const UK_ZONES = new Set(['Europe/London', 'Europe/Belfast', 'Europe/Guernsey', 'Europe/Jersey', 'Europe/Isle_of_Man']);

/**
 * Coarse region bucket from the browser time zone. Used only to choose the age-gate
 * minimum and the cookie-consent default — never for anything user-facing or billing.
 * Returns 'eu' | 'uk' | 'us' | 'other'.
 */
export function guessRegion() {
  let tz = '';
  try {
    tz = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
  } catch {
    return 'other';
  }
  if (EU_ZONES.has(tz)) return 'eu';
  if (UK_ZONES.has(tz)) return 'uk';
  if (tz.startsWith('America/') && !tz.startsWith('America/Argentina') && !tz.startsWith('America/Sao')) return 'us';
  return 'other';
}

/** Regions where ePrivacy/GDPR require opt-in before loading analytics/replay. */
export function requiresCookieOptIn(region = guessRegion()) {
  return region === 'eu' || region === 'uk';
}

export function minAgeForRegion(region = guessRegion()) {
  return region === 'eu' ? MIN_AGE_EU : MIN_AGE_DEFAULT;
}
