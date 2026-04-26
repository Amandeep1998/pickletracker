/**
 * Rough map from IANA time zone → display currency for users in `timeZoneSource: auto`.
 * IP-based detection (ipapi) is separate; when we can infer a currency from the profile TZ,
 * that wins over IP so laptop / profile clock changes match what users expect.
 */

import * as api from '../services/api';

const SUPPORTED = ['INR', 'USD', 'AUD', 'EUR', 'GBP', 'CAD', 'SGD', 'MYR', 'PHP'];

const CA = new Set([
  'America/Toronto',
  'America/Vancouver',
  'America/Winnipeg',
  'America/Edmonton',
  'America/Halifax',
  'America/Moncton',
  'America/St_Johns',
  'America/Regina',
  'America/Yellowknife',
  'America/Whitehorse',
  'America/Iqaluit',
  'America/Rankin_Inlet',
  'America/Cambridge_Bay',
  'America/Inuvik',
]);

/** @returns {string|null} */
export function inferCurrencyFromIanaTimeZone(tz) {
  if (!tz || typeof tz !== 'string') return null;
  const z = tz.trim();
  if (!z) return null;

  if (z === 'Asia/Kolkata' || z === 'Asia/Calcutta') return 'INR';
  if (z === 'Asia/Singapore') return 'SGD';
  if (z === 'Asia/Kuala_Lumpur') return 'MYR';
  if (z === 'Asia/Manila') return 'PHP';

  if (z.startsWith('Australia/')) return 'AUD';

  if (z.startsWith('Europe/London') || z === 'Europe/Belfast') return 'GBP';
  if (z.startsWith('Europe/')) return 'EUR';

  if (CA.has(z)) return 'CAD';
  if (z === 'Pacific/Honolulu') return 'USD';
  if (z.startsWith('America/') || z.startsWith('US/') || z.startsWith('Canada/')) return 'USD';

  if (z.startsWith('Pacific/') || z.startsWith('Atlantic/')) return null;

  return null;
}

export function isSupportedCurrency(code) {
  return typeof code === 'string' && SUPPORTED.includes(code);
}

/**
 * If the user is in auto time-zone mode and we can infer a currency, PATCH profile and return new public user.
 * @returns {Promise<object|null>}
 */
export async function tryUpdateCurrencyFromAutoTimeZone(userSnap) {
  if (!userSnap?.timeZone || userSnap.timeZoneSource === 'manual') return null;
  const suggested = inferCurrencyFromIanaTimeZone(userSnap.timeZone);
  if (!suggested || !isSupportedCurrency(suggested)) return null;
  if (userSnap.currency === suggested) return null;
  try {
    const res = await api.updateProfile({ currency: suggested });
    return res?.data?.data || null;
  } catch {
    return null;
  }
}
