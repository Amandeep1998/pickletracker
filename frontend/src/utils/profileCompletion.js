/**
 * Weighted profile strength (1–100%) for the logged-in user's account.
 * Email and mobile count toward the score but are never shown on the public player card.
 */
export function computeProfileStrength(profile) {
  if (!profile) {
    return { percent: 0, steps: [], earned: 0, max: 100 };
  }

  const phoneDigits = profile.whatsappPhone ? String(profile.whatsappPhone).replace(/\D/g, '') : '';
  const phoneOk = phoneDigits.length >= 10;

  const achievementsList = Array.isArray(profile.manualAchievements) ? profile.manualAchievements : [];
  const achievementOk = achievementsList.some(
    (a) =>
      String(a.tournamentName || '').trim() &&
      String(a.categoryName || '').trim() &&
      ['Gold', 'Silver', 'Bronze'].includes(a.medal)
  );

  const singles =
    profile.duprSingles != null && profile.duprSingles !== ''
      ? Number(profile.duprSingles)
      : profile.duprRating != null
        ? Number(profile.duprRating)
        : null;
  const duprSinglesOk = singles != null && !Number.isNaN(singles);
  const doubles = profile.duprDoubles != null && profile.duprDoubles !== '' ? Number(profile.duprDoubles) : null;
  const duprDoublesOk = doubles != null && !Number.isNaN(doubles);

  const steps = [
    {
      id: 'name',
      label: 'Display name',
      done: Boolean(String(profile.name || '').trim()),
      weight: 5,
    },
    {
      id: 'photo',
      label: 'Profile photo',
      done: Boolean(profile.profilePhoto),
      weight: 10,
    },
    {
      id: 'city',
      label: 'City',
      done: Boolean(String(profile.city || '').trim()),
      weight: 16,
    },
    {
      id: 'duprSingles',
      label: 'DUPR singles',
      done: duprSinglesOk,
      weight: 9,
    },
    {
      id: 'duprDoubles',
      label: 'DUPR doubles',
      done: duprDoublesOk,
      weight: 9,
    },
    {
      id: 'playingSince',
      label: 'Playing since (year)',
      done:
        profile.playingSince != null &&
        profile.playingSince !== '' &&
        !Number.isNaN(Number(profile.playingSince)),
      weight: 8,
    },
    {
      id: 'achievements',
      label: 'At least 1 past achievement',
      done: achievementOk,
      weight: 18,
    },
    {
      id: 'phone',
      label: 'Mobile (private — not on your public card)',
      done: phoneOk,
      weight: 12,
    },
    {
      id: 'email',
      label: 'Email on account (private — not on your public card)',
      done: Boolean(String(profile.email || '').includes('@')),
      weight: 13,
    },
  ];

  const max = steps.reduce((s, x) => s + x.weight, 0);
  const earned = steps.reduce((s, x) => s + (x.done ? x.weight : 0), 0);
  const percent = max <= 0 ? 0 : Math.min(100, Math.round((earned / max) * 100));

  return { percent, steps, earned, max };
}
