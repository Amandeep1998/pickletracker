/**
 * Generates the best available Google Maps URL for a location.
 *
 * Priority: lat+lng (exact pin, works on all platforms) > name/address search > place_id
 *
 * The old `place/?q=place_id:xxx` format showed the raw ID string on mobile
 * instead of the venue name. Using coordinates is the most reliable cross-platform
 * approach — the `name@lat,lng` form pins the exact spot AND labels it with the
 * venue name in both the Google Maps web app and the native mobile apps.
 */
export function getMapUrl(location) {
  if (!location) return null;

  // Prefer coordinates — most reliable, opens exact pin with name label
  if (location.lat && location.lng) {
    const label = [location.name, location.address].filter(Boolean).join(', ');
    if (label) {
      return `https://maps.google.com/maps?q=${encodeURIComponent(label)}@${location.lat},${location.lng}`;
    }
    return `https://maps.google.com/maps?q=${location.lat},${location.lng}`;
  }

  // Text search fallback (no coordinates stored)
  if (location.name || location.address) {
    const query = [location.name, location.address].filter(Boolean).join(', ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  // place_id fallback — include text query so Maps doesn't display raw ID
  if (location.placeId) {
    const query = location.name || 'location';
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}&query_place_id=${location.placeId}`;
  }

  return null;
}
