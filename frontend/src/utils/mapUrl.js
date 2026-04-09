/**
 * Generates the best available Google Maps URL for a location.
 * Priority: place_id > name+address > lat,lng
 */
export function getMapUrl(location) {
  if (!location) return null;

  if (location.placeId) {
    return `https://www.google.com/maps/place/?q=place_id:${location.placeId}`;
  }

  if (location.name || location.address) {
    const query = [location.name, location.address].filter(Boolean).join(' ');
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
  }

  if (location.lat && location.lng) {
    return `https://www.google.com/maps?q=${location.lat},${location.lng}`;
  }

  return null;
}
