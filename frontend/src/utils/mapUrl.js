/**
 * Generates a Google Maps URL for a location.
 *
 * Uses the official Google Maps URL API format:
 *   query_place_id  → opens the exact venue with its correct name (most reliable)
 *   lat,lng         → fallback when only coordinates are stored
 *   name/address    → text search fallback for legacy data with no coords/placeId
 */
export function getMapUrl(location) {
  if (!location) return null;

  const base = 'https://www.google.com/maps/search/?api=1';

  // Best: place_id + name — opens exact venue, shows correct name on all platforms
  if (location.placeId) {
    const query = [location.name, location.address].filter(Boolean).join(', ') || 'location';
    return `${base}&query=${encodeURIComponent(query)}&query_place_id=${encodeURIComponent(location.placeId)}`;
  }

  // Coordinates fallback — pins the spot even without a place_id
  if (location.lat && location.lng) {
    const query = [location.name, location.address].filter(Boolean).join(', ');
    return `${base}&query=${encodeURIComponent(query || `${location.lat},${location.lng}`)}`;
  }

  // Text search fallback for legacy entries with only a name
  if (location.name || location.address) {
    const query = [location.name, location.address].filter(Boolean).join(', ');
    return `${base}&query=${encodeURIComponent(query)}`;
  }

  return null;
}
