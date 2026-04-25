const { DateTime } = require('luxon');

const DEFAULT_TZ = 'UTC';

/**
 * IANA timezone for calendar reminders (tournament dates are plain YYYY-MM-DD).
 * Existing users without `timeZone` are treated as UTC until they set Profile → Time zone.
 */
function effectiveTimeZone(user) {
  const tz = user?.timeZone;
  if (!tz || typeof tz !== 'string' || !tz.trim()) return DEFAULT_TZ;
  const z = tz.trim();
  if (!DateTime.now().setZone(z).isValid) return DEFAULT_TZ;
  return z;
}

function nowInUserZone(user) {
  return DateTime.now().setZone(effectiveTimeZone(user));
}

/** Today's calendar date in the user's zone (YYYY-MM-DD). */
function calendarDateInUserZone(user, from = DateTime.now()) {
  return from.setZone(effectiveTimeZone(user)).toISODate();
}

/** Add whole calendar days in the user's zone (returns YYYY-MM-DD). */
function calendarDatePlusDaysInUserZone(user, days, from = DateTime.now()) {
  return from.setZone(effectiveTimeZone(user)).plus({ days }).toISODate();
}

/** True during local 08:00–08:49 (morning digest emails), checked every ~15 min by cron. */
function inMorningEmailWindow(user) {
  const dt = nowInUserZone(user);
  return dt.hour === 8 && dt.minute < 50;
}

/** True during local 19:00–19:49 (day-before tournament push). */
function inDayBeforePushWindow(user) {
  const dt = nowInUserZone(user);
  return dt.hour === 19 && dt.minute < 50;
}

/** True during local 23:15–23:49 (same-day log-results push). */
function inEveningResultPushWindow(user) {
  const dt = nowInUserZone(user);
  return dt.hour === 23 && dt.minute >= 15 && dt.minute < 50;
}

function isValidIanaTimeZone(tz) {
  if (!tz || typeof tz !== 'string') return false;
  return DateTime.now().setZone(tz.trim()).isValid;
}

/** Whether ping-platform may overwrite `timeZone` from the browser. */
function shouldAutoUpdateTimeZoneFromDevice(user) {
  if (!user) return false;
  if (user.timeZoneSource === 'manual') return false;
  if (user.timeZoneSource === 'auto') return true;
  // Legacy documents (no timeZoneSource): treat non-UTC as user-chosen, UTC as auto.
  if (user.timeZone && user.timeZone !== DEFAULT_TZ) return false;
  return true;
}

module.exports = {
  DEFAULT_TZ,
  effectiveTimeZone,
  nowInUserZone,
  calendarDateInUserZone,
  calendarDatePlusDaysInUserZone,
  inMorningEmailWindow,
  inDayBeforePushWindow,
  inEveningResultPushWindow,
  isValidIanaTimeZone,
  shouldAutoUpdateTimeZoneFromDevice,
};
