function ratingContext(rating) {
  if (!rating) return 'technique';
  if (rating <= 2) return 'fundamentals';
  if (rating >= 4) return 'drills';
  return 'technique';
}

export function buildVideoUrl(skill, rating) {
  const query = encodeURIComponent(`pickleball ${skill} ${ratingContext(rating)}`);
  return `https://www.youtube.com/results?search_query=${query}`;
}
