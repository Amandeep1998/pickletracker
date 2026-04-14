const User = require('../models/User');
const Tournament = require('../models/Tournament');

/**
 * GET /api/players
 * Returns all users with their public profile + aggregated tournament stats.
 *
 * Query params:
 *   search   — name contains (case-insensitive)
 *   state    — exact state match
 *   city     — city contains (case-insensitive)
 *   minDupr  — minimum DUPR rating
 *   maxDupr  — maximum DUPR rating
 *   category — has played this category
 *   sort     — medals | tournaments | dupr | recent (default: medals)
 *   page     — page number (default: 1)
 *   limit    — results per page (default: 24)
 */
exports.getPlayers = async (req, res, next) => {
  try {
    const {
      search, state, city,
      minDupr, maxDupr,
      category,
      sort = 'medals',
      page = 1,
      limit = 24,
    } = req.query;

    // ── Step 1: Build user filter ──────────────────────────────────────────────
    const userFilter = {};
    if (search) userFilter.name = { $regex: search.trim(), $options: 'i' };
    if (state) userFilter.state = state;
    if (city) userFilter.city = { $regex: city.trim(), $options: 'i' };
    if (minDupr || maxDupr) {
      const min = minDupr ? parseFloat(minDupr) : null;
      const max = maxDupr ? parseFloat(maxDupr) : null;
      const range = {};
      if (!Number.isNaN(min) && min != null) range.$gte = min;
      if (!Number.isNaN(max) && max != null) range.$lte = max;
      userFilter.$or = [{ duprSingles: range }, { duprRating: range }];
    }

    // ── Step 2: If category filter, find userIds who played it ─────────────────
    let categoryUserIds = null;
    if (category) {
      const docs = await Tournament.distinct('userId', {
        'categories.categoryName': { $regex: category.trim(), $options: 'i' },
      });
      categoryUserIds = docs.map(String);
    }
    if (categoryUserIds) {
      userFilter._id = { $in: categoryUserIds };
    }

    // ── Step 3: Fetch matching users ───────────────────────────────────────────
    const users = await User.find(userFilter)
      .select('name city state profilePhoto duprRating duprSingles duprDoubles playingSince createdAt manualAchievements')
      .lean();

    if (users.length === 0) {
      return res.json({ success: true, data: [], total: 0 });
    }

    const userIds = users.map((u) => u._id);

    // ── Step 4: Aggregate tournament stats per user ────────────────────────────
    const statsAgg = await Tournament.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $unwind: '$categories' },
      {
        $group: {
          _id: '$userId',
          totalTournaments: { $addToSet: '$_id' },
          goldMedals:   { $sum: { $cond: [{ $eq: ['$categories.medal', 'Gold'] },   1, 0] } },
          silverMedals: { $sum: { $cond: [{ $eq: ['$categories.medal', 'Silver'] }, 1, 0] } },
          bronzeMedals: { $sum: { $cond: [{ $eq: ['$categories.medal', 'Bronze'] }, 1, 0] } },
          categories: { $push: '$categories.categoryName' },
          recentTournaments: {
            $push: {
              name: '$name',
              medal: '$categories.medal',
              category: '$categories.categoryName',
              date: '$categories.date',
              createdAt: '$createdAt',
            },
          },
        },
      },
      {
        $project: {
          totalTournaments: { $size: '$totalTournaments' },
          goldMedals: 1,
          silverMedals: 1,
          bronzeMedals: 1,
          totalMedals: { $add: ['$goldMedals', '$silverMedals', '$bronzeMedals'] },
          categories: 1,
          recentTournaments: 1,
        },
      },
    ]);

    // Map stats by userId string for quick lookup
    const statsMap = {};
    for (const s of statsAgg) {
      // Top category — most frequently played
      const catCount = {};
      (s.categories || []).forEach((c) => { catCount[c] = (catCount[c] || 0) + 1; });
      const topCategories = Object.entries(catCount)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([name, count]) => ({ name, count }));

      // Recent medal-winning tournaments (last 3)
      const withMedal = (s.recentTournaments || [])
        .filter((t) => t.medal && t.medal !== 'None')
        .sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1)
        .slice(0, 3);

      // Last active date
      const allDates = (s.recentTournaments || []).map((t) => t.date).filter(Boolean).sort().reverse();

      statsMap[String(s._id)] = {
        totalTournaments: s.totalTournaments,
        medals: { Gold: s.goldMedals, Silver: s.silverMedals, Bronze: s.bronzeMedals },
        totalMedals: s.totalMedals,
        topCategories,
        recentMedalTournaments: withMedal,
        lastActiveDate: allDates[0] || null,
      };
    }

    const achievementsByUser = await Tournament.aggregate([
      { $match: { userId: { $in: userIds } } },
      { $unwind: '$categories' },
      {
        $project: {
          userId: 1,
          tournamentName: '$name',
          categoryName: '$categories.categoryName',
          medal: '$categories.medal',
          date: '$categories.date',
        },
      },
    ]);
    const autoAchievementsMap = {};
    achievementsByUser.forEach((a) => {
      const key = String(a.userId);
      if (!autoAchievementsMap[key]) autoAchievementsMap[key] = [];
      autoAchievementsMap[key].push({
        tournamentName: a.tournamentName,
        categoryName: a.categoryName,
        medal: a.medal,
        date: a.date || null,
        source: 'tournament',
      });
    });

    // ── Step 5: Merge and shape response ───────────────────────────────────────
    const players = users.map((u) => {
      const stats = statsMap[String(u._id)] || {
        totalTournaments: 0,
        medals: { Gold: 0, Silver: 0, Bronze: 0 },
        totalMedals: 0,
        topCategories: [],
        recentMedalTournaments: [],
        lastActiveDate: null,
      };
      return {
        id: u._id,
        name: u.name,
        city: u.city || null,
        state: u.state || null,
        profilePhoto: u.profilePhoto || null,
        duprRating: u.duprRating || null,
        duprSingles: u.duprSingles ?? u.duprRating ?? null,
        duprDoubles: u.duprDoubles ?? null,
        playingSince: u.playingSince || null,
        memberSince: u.createdAt,
        manualAchievements: Array.isArray(u.manualAchievements) ? u.manualAchievements : [],
        achievements: [
          ...(autoAchievementsMap[String(u._id)] || []),
          ...((Array.isArray(u.manualAchievements) ? u.manualAchievements : []).map((a) => ({
            tournamentName: a.tournamentName,
            categoryName: a.categoryName,
            medal: a.medal,
            date: a.date || null,
            source: 'manual',
          }))),
        ],
        ...stats,
      };
    });

    // ── Step 6: Sort ───────────────────────────────────────────────────────────
    players.sort((a, b) => {
      if (sort === 'medals')      return b.totalMedals - a.totalMedals;
      if (sort === 'tournaments') return b.totalTournaments - a.totalTournaments;
      if (sort === 'dupr')        return (b.duprRating || 0) - (a.duprRating || 0);
      if (sort === 'recent')      return (b.lastActiveDate || '') > (a.lastActiveDate || '') ? 1 : -1;
      return b.totalMedals - a.totalMedals;
    });

    // ── Step 7: Paginate ───────────────────────────────────────────────────────
    const total = players.length;
    const pageNum = Math.max(1, parseInt(page));
    const limitNum = Math.min(48, Math.max(1, parseInt(limit)));
    const paginated = players.slice((pageNum - 1) * limitNum, pageNum * limitNum);

    res.json({ success: true, data: paginated, total, page: pageNum, limit: limitNum });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/players/:id
 * Full public profile for a single player.
 */
exports.getPlayer = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('name city state profilePhoto duprRating duprSingles duprDoubles playingSince createdAt manualAchievements')
      .lean();

    if (!user) return res.status(404).json({ success: false, message: 'Player not found' });

    const tournaments = await Tournament.find({ userId: user._id })
      .sort({ createdAt: -1 })
      .lean();

    const medals = { Gold: 0, Silver: 0, Bronze: 0 };
    const catCount = {};
    tournaments.forEach((t) => {
      t.categories.forEach((c) => {
        if (medals[c.medal] !== undefined) medals[c.medal]++;
        if (c.categoryName) catCount[c.categoryName] = (catCount[c.categoryName] || 0) + 1;
      });
    });

    const topCategories = Object.entries(catCount)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    const recentMedalTournaments = tournaments
      .flatMap((t) =>
        t.categories
          .filter((c) => c.medal && c.medal !== 'None')
          .map((c) => ({ tournamentName: t.name, medal: c.medal, category: c.categoryName, date: c.date }))
      )
      .sort((a, b) => (b.date || '') > (a.date || '') ? 1 : -1)
      .slice(0, 5);

    const autoAchievements = tournaments.flatMap((t) =>
      (t.categories || []).map((c) => ({
        tournamentName: t.name,
        categoryName: c.categoryName,
        medal: c.medal,
        date: c.date || null,
        source: 'tournament',
      }))
    );
    const manualAchievements = (Array.isArray(user.manualAchievements) ? user.manualAchievements : []).map((a) => ({
      tournamentName: a.tournamentName,
      categoryName: a.categoryName,
      medal: a.medal,
      date: a.date || null,
      source: 'manual',
    }));

    res.json({
      success: true,
      data: {
        id: user._id,
        name: user.name,
        city: user.city || null,
        state: user.state || null,
        profilePhoto: user.profilePhoto || null,
        duprRating: user.duprRating || null,
        duprSingles: user.duprSingles ?? user.duprRating ?? null,
        duprDoubles: user.duprDoubles ?? null,
        playingSince: user.playingSince || null,
        memberSince: user.createdAt,
        totalTournaments: tournaments.length,
        medals,
        totalMedals: medals.Gold + medals.Silver + medals.Bronze,
        topCategories,
        recentMedalTournaments,
        manualAchievements: Array.isArray(user.manualAchievements) ? user.manualAchievements : [],
        achievements: [...autoAchievements, ...manualAchievements],
        tournamentNames: [...new Set([...autoAchievements, ...manualAchievements].map((a) => a.tournamentName).filter(Boolean))],
      },
    });
  } catch (err) {
    next(err);
  }
};
