/** IANA zone from the browser (e.g. America/Los_Angeles), if available. */
export function getBrowserIanaTimeZone() {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    return tz && typeof tz === 'string' ? tz : null;
  } catch {
    return null;
  }
}
