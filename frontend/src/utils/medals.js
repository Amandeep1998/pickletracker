/**
 * Tally Gold/Silver/Bronze medals from logged tournaments + the user's
 * past achievements they entered manually on their player card.
 *
 * Both sources contribute equally — this matches how the player card and
 * the public player profile report medals on the backend, so banners stay
 * consistent across the app.
 */
export function computeMedalTally(tournaments, manualAchievements) {
  const medals = { Gold: 0, Silver: 0, Bronze: 0 };

  for (const t of tournaments || []) {
    for (const c of t?.categories || []) {
      if (medals[c.medal] !== undefined) medals[c.medal]++;
    }
  }
  for (const a of manualAchievements || []) {
    if (medals[a.medal] !== undefined) medals[a.medal]++;
  }

  return {
    ...medals,
    total: medals.Gold + medals.Silver + medals.Bronze,
  };
}
