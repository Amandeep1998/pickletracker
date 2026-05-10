/**
 * Achievement Service — core gamification engine.
 *
 * Public API:
 *   checkAchievements(userId)  — evaluate all achievements, award XP, emit socket events
 *   computeStats(userId)       — build the stats object used by achievement checks
 *   computeLevel(xp)           — map an XP value to a level 1-20
 *   computeMomentum(userId)    — compute a 0-100 activity momentum score
 *
 * All functions are safe to call fire-and-forget (they swallow errors internally).
 */

const Tournament = require('../models/Tournament');
const Session = require('../models/Session');
const Expense = require('../models/Expense');
const User = require('../models/User');
const UserProgress = require('../models/UserProgress');
const GamificationFeedItem = require('../models/GamificationFeedItem');
const ACHIEVEMENTS = require('../data/achievements');
const socketManager = require('../socket/socketManager');

// ─── Level curve ─────────────────────────────────────────────────────────────

const LEVELS = [
  { level: 1,  xpRequired: 0,     title: 'Rookie' },
  { level: 2,  xpRequired: 200,   title: 'Rec Player' },
  { level: 3,  xpRequired: 500,   title: 'Club Regular' },
  { level: 4,  xpRequired: 1100,  title: 'Court Hustler' },
  { level: 5,  xpRequired: 2000,  title: 'Weekend Warrior' },
  { level: 6,  xpRequired: 3200,  title: 'Doubles Enthusiast' },
  { level: 7,  xpRequired: 4700,  title: 'Dink Specialist' },
  { level: 8,  xpRequired: 6500,  title: 'Kitchen Pro' },
  { level: 9,  xpRequired: 8700,  title: 'Rally King' },
  { level: 10, xpRequired: 11200, title: 'Tournament Regular' },
  { level: 11, xpRequired: 14000, title: 'Circuit Player' },
  { level: 12, xpRequired: 17200, title: 'State Contender' },
  { level: 13, xpRequired: 20900, title: 'Regional Elite' },
  { level: 14, xpRequired: 25200, title: 'National Hopeful' },
  { level: 15, xpRequired: 30200, title: 'Pro Circuit' },
  { level: 16, xpRequired: 36000, title: 'Elite Amateur' },
  { level: 17, xpRequired: 42800, title: 'Tour Player' },
  { level: 18, xpRequired: 50600, title: 'City Legend' },
  { level: 19, xpRequired: 59500, title: 'Grand Slam' },
  { level: 20, xpRequired: 70000, title: 'Hall of Fame' },
];

// ─── computeLevel ────────────────────────────────────────────────────────────

/**
 * Returns the level (1–20) for a given XP total.
 * Level 20 is the maximum (Hall of Fame).
 */
function computeLevel(xp) {
  let idx = 0;
  for (let i = LEVELS.length - 1; i >= 0; i--) {
    if (xp >= LEVELS[i].xpRequired) {
      idx = i;
      break;
    }
  }
  const current = LEVELS[idx];
  const next = LEVELS[idx + 1] || null;
  return {
    level: current.level,
    title: current.title,
    currentLevelXP: current.xpRequired,
    nextLevelXP: next ? next.xpRequired : current.xpRequired,
    xpToNextLevel: next ? Math.max(0, next.xpRequired - xp) : 0,
  };
}

// ─── computeStats ────────────────────────────────────────────────────────────

/**
 * Builds the full stats object consumed by each achievement's check() function.
 * @param {string|ObjectId} userId
 * @returns {Promise<Object>} stats
 */
async function computeStats(userId) {
  const now = new Date();

  // ── Date helpers ──────────────────────────────────────────────────────────
  const currentMonthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const last30Days = new Date(now);
  last30Days.setDate(last30Days.getDate() - 30);

  const last60Days = new Date(now);
  last60Days.setDate(last60Days.getDate() - 60);

  const last7Days = new Date(now);
  last7Days.setDate(last7Days.getDate() - 7);

  const last14Days = new Date(now);
  last14Days.setDate(last14Days.getDate() - 14);

  // ── Parallel data fetch ───────────────────────────────────────────────────
  const [tournaments, sessions, expenses, user] = await Promise.all([
    Tournament.find({ userId }).lean(),
    Session.find({ userId }).lean(),
    Expense.find({ userId }).lean(),
    User.findById(userId).lean(),
  ]);

  // ── Session stats ─────────────────────────────────────────────────────────
  const totalSessions = sessions.length;

  // Monthly session counts  { 'YYYY-MM': count }
  const monthlySessionCounts = {};
  const sessionsThisMonthArr = [];

  for (const s of sessions) {
    if (!s.date) continue;
    const monthKey = s.date.slice(0, 7); // 'YYYY-MM'
    monthlySessionCounts[monthKey] = (monthlySessionCounts[monthKey] || 0) + 1;
    if (monthKey === currentMonthKey) sessionsThisMonthArr.push(s);
  }
  const sessionsThisMonth = sessionsThisMonthArr.length;

  // Active months: months with >= 4 sessions
  const activeMonths = Object.entries(monthlySessionCounts)
    .filter(([, count]) => count >= 4)
    .map(([key]) => key)
    .sort();

  const activeMonthsCount = activeMonths.length;

  // Longest streak of consecutive active months
  let maxConsecutiveActiveMonths = 0;
  if (activeMonths.length > 0) {
    let streak = 1;
    let best = 1;
    for (let i = 1; i < activeMonths.length; i++) {
      const prev = new Date(activeMonths[i - 1] + '-01');
      const curr = new Date(activeMonths[i] + '-01');
      const diffMonths =
        (curr.getFullYear() - prev.getFullYear()) * 12 +
        (curr.getMonth() - prev.getMonth());
      if (diffMonths === 1) {
        streak++;
        best = Math.max(best, streak);
      } else {
        streak = 1;
      }
    }
    maxConsecutiveActiveMonths = best;
  }

  // Weekends active this month (distinct Sat/Sun dates with sessions)
  const weekendDatesThisMonth = new Set();
  for (const s of sessionsThisMonthArr) {
    if (!s.date) continue;
    const d = new Date(s.date + 'T00:00:00');
    const dow = d.getDay(); // 0=Sun, 6=Sat
    if (dow === 0 || dow === 6) {
      // Key by ISO week number + year to group each Sat+Sun pair as one "weekend"
      // Simple approach: group by the Saturday of that week
      const satDate = new Date(d);
      if (dow === 0) satDate.setDate(d.getDate() - 1); // Sun → previous Sat
      weekendDatesThisMonth.add(satDate.toISOString().slice(0, 10));
    }
  }
  const weekendsActiveThisMonth = weekendDatesThisMonth.size;

  // ── Tournament stats ──────────────────────────────────────────────────────
  const totalTournaments = tournaments.length;

  let totalGoldMedals = 0;
  let totalSilverMedals = 0;
  let totalBronzeMedals = 0;
  let totalEarnings = 0;
  let totalEntryFees = 0;
  const uniqueCitySet = new Set();
  let tournamentsLast60Days = 0;
  let goldMedalsThisMonth = 0;
  const tournamentsWithGoldSet = new Set();
  const tournamentGoldDates = []; // for consecutive wins

  for (const t of tournaments) {
    const categories = Array.isArray(t.categories) ? t.categories : [];

    // Track city
    if (t.location && t.location.name) {
      uniqueCitySet.add(t.location.name.trim().toLowerCase());
    }

    let hasGoldInTournament = false;
    let isWithin60Days = false;
    let isWithin30Days = false;

    // Find the earliest date in this tournament's categories
    const categoryDates = categories
      .map((c) => c.date)
      .filter(Boolean)
      .sort();
    const firstCategoryDate = categoryDates[0] || null;

    if (firstCategoryDate) {
      const tDate = new Date(firstCategoryDate + 'T00:00:00');
      if (tDate >= last60Days) isWithin60Days = true;
      if (tDate >= last30Days) isWithin30Days = true;
    }

    if (isWithin60Days) tournamentsLast60Days++;

    for (const cat of categories) {
      totalEntryFees += cat.entryFee || 0;
      totalEarnings += cat.prizeAmount || 0;

      if (cat.medal === 'Gold') {
        totalGoldMedals++;
        hasGoldInTournament = true;
        if (isWithin30Days) goldMedalsThisMonth++;
        if (cat.date) tournamentGoldDates.push(cat.date);
      } else if (cat.medal === 'Silver') {
        totalSilverMedals++;
      } else if (cat.medal === 'Bronze') {
        totalBronzeMedals++;
      }
    }

    if (hasGoldInTournament) {
      tournamentsWithGoldSet.add(String(t._id));
    }
  }

  const totalPodiums = totalGoldMedals + totalSilverMedals + totalBronzeMedals;
  const uniqueCities = uniqueCitySet.size;
  const tournamentsWithGold = tournamentsWithGoldSet.size;

  // Consecutive wins: sort tournaments by earliest category date, find longest
  // streak of consecutive tournaments (by order) where the tournament had a gold
  const sortedTournaments = tournaments
    .map((t) => {
      const categories = Array.isArray(t.categories) ? t.categories : [];
      const dates = categories.map((c) => c.date).filter(Boolean).sort();
      return { id: String(t._id), firstDate: dates[0] || '0000-00-00', hasGold: false };
    })
    .map((t) => ({
      ...t,
      hasGold: tournamentsWithGoldSet.has(t.id),
    }))
    .sort((a, b) => (a.firstDate < b.firstDate ? -1 : 1));

  let maxConsecutiveWins = 0;
  let currentStreak = 0;
  for (const t of sortedTournaments) {
    if (t.hasGold) {
      currentStreak++;
      maxConsecutiveWins = Math.max(maxConsecutiveWins, currentStreak);
    } else {
      currentStreak = 0;
    }
  }

  // ── Expense stats ─────────────────────────────────────────────────────────
  const gearExpenses = expenses.filter((e) => e.type === 'gear');
  const totalGearItems = gearExpenses.length;
  const ownedPaddles = gearExpenses.filter(
    (e) => e.title && e.title.toLowerCase().includes('paddle')
  ).length;
  const hasTravelExpense = expenses.some((e) => e.type === 'travel');
  const hasGearLogged = totalGearItems > 0;
  const hasExpenseLogged = expenses.length > 0;
  const hasPrizeEarnings = totalEarnings > 0;
  const totalExpenseAmount = expenses.reduce((sum, e) => sum + (e.amount || 0), 0);

  // ── User / profile stats ──────────────────────────────────────────────────
  const profileComplete = !!(
    user &&
    user.name &&
    user.name.trim() &&
    user.city &&
    user.city.trim() &&
    user.profilePhoto
  );

  return {
    totalSessions,
    totalTournaments,
    totalGoldMedals,
    totalSilverMedals,
    totalBronzeMedals,
    totalPodiums,
    totalEarnings,
    totalEntryFees,
    uniqueCities,
    totalGearItems,
    sessionsThisMonth,
    activeMonthsCount,
    maxConsecutiveActiveMonths,
    weekendsActiveThisMonth,
    tournamentsLast60Days,
    maxConsecutiveWins,
    goldMedalsThisMonth,
    tournamentsWithGold,
    profileComplete,
    hasGearLogged,
    hasExpenseLogged,
    hasPrizeEarnings,
    ownedPaddles,
    monthlySessionCounts,
    currentMonthKey,
    hasTravelExpense,
    totalExpenseAmount,
  };
}

// ─── computeMomentum ─────────────────────────────────────────────────────────

/**
 * Computes an activity momentum score from 0 to 100.
 *   Sessions in last 7 days  × 20 → capped at 70
 *   Sessions in days 8-14    × 7  → added, total capped at 100
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<number>} 0–100
 */
async function computeMomentum(userId) {
  try {
    const now = new Date();

    const cutoff7 = new Date(now);
    cutoff7.setDate(cutoff7.getDate() - 7);
    const cutoff14 = new Date(now);
    cutoff14.setDate(cutoff14.getDate() - 14);

    // Format as YYYY-MM-DD strings for string-comparison against session.date
    const fmt = (d) => d.toISOString().slice(0, 10);
    const today = fmt(now);
    const d7 = fmt(cutoff7);
    const d14 = fmt(cutoff14);

    const sessions = await Session.find({ userId }, { date: 1, _id: 0 }).lean();

    let recent7 = 0;
    let recent8to14 = 0;
    for (const s of sessions) {
      if (!s.date) continue;
      if (s.date > d7 && s.date <= today) recent7++;
      else if (s.date > d14 && s.date <= d7) recent8to14++;
    }

    const score7 = Math.min(recent7 * 20, 70);
    const score = Math.min(score7 + recent8to14 * 7, 100);
    return score;
  } catch (err) {
    console.error('[achievement.service] computeMomentum error:', err);
    return 0;
  }
}

// ─── checkAchievements ───────────────────────────────────────────────────────

/**
 * Main achievement evaluation function.
 * - Finds or creates a UserProgress document for the user
 * - Evaluates all achievements
 * - Awards XP for newly unlocked achievements
 * - Emits socket events for real-time UI updates
 * - Creates GamificationFeedItem documents for feed-worthy unlocks and level-ups
 *
 * Safe to call fire-and-forget — all errors are caught internally.
 *
 * @param {string|ObjectId} userId
 * @returns {Promise<{ newlyUnlocked: Array, progress: Object }>}
 */
async function checkAchievements(userId) {
  try {
    // ── Load or create progress ──────────────────────────────────────────────
    let progress = await UserProgress.findOne({ userId });
    if (!progress) {
      progress = new UserProgress({ userId, xp: 0, level: 1, achievements: [] });
    }

    const previousLevel = progress.level;

    // ── Compute stats ────────────────────────────────────────────────────────
    const stats = await computeStats(userId);

    // Build a Set of already-unlocked achievement IDs for O(1) lookups
    const unlockedIds = new Set(progress.achievements.map((a) => a.achievementId));

    // ── Evaluate achievements ────────────────────────────────────────────────
    const newlyUnlocked = [];
    const now = new Date();

    for (const achievement of ACHIEVEMENTS) {
      if (unlockedIds.has(achievement.id)) continue;

      let unlocked = false;
      try {
        unlocked = achievement.check(stats);
      } catch (checkErr) {
        console.error(
          `[achievement.service] check() error for "${achievement.id}":`,
          checkErr
        );
      }

      if (unlocked) {
        progress.achievements.push({
          achievementId: achievement.id,
          unlockedAt: now,
          sharedToFeed: false,
        });
        progress.xp += achievement.xpReward;
        newlyUnlocked.push(achievement);
      }
    }

    // ── Recompute level ──────────────────────────────────────────────────────
    const newLevelData = computeLevel(progress.xp);
    const newLevel = newLevelData.level;
    progress.level = newLevel;
    progress.lastChecked = now;

    // ── Persist progress ─────────────────────────────────────────────────────
    await progress.save();

    // ── Create feed items ────────────────────────────────────────────────────
    const feedPromises = [];

    // Level-up feed item
    if (newLevel > previousLevel) {
      feedPromises.push(
        GamificationFeedItem.create({
          userId,
          type: 'level_up',
          newLevel,
          achievementId: null,
          achievementTier: null,
        }).catch((err) =>
          console.error('[achievement.service] level_up feed item error:', err)
        )
      );
    }

    // Achievement unlock feed items (feed-worthy only)
    for (const achievement of newlyUnlocked) {
      if (!achievement.feedWorthy) continue;
      feedPromises.push(
        GamificationFeedItem.create({
          userId,
          type: 'achievement_unlock',
          achievementId: achievement.id,
          achievementTier: achievement.tier,
          newLevel: null,
        }).catch((err) =>
          console.error(
            `[achievement.service] achievement_unlock feed item error (${achievement.id}):`,
            err
          )
        )
      );

      // Mark sharedToFeed on the progress record
      const record = progress.achievements.find(
        (a) => a.achievementId === achievement.id
      );
      if (record) record.sharedToFeed = true;
    }

    if (feedPromises.length > 0) {
      await Promise.all(feedPromises);
      // Save again to persist sharedToFeed flags
      await progress.save();
    }

    // ── Emit socket event ────────────────────────────────────────────────────
    if (newlyUnlocked.length > 0) {
      socketManager.emitToUser(String(userId), 'achievements:unlocked', {
        achievements: newlyUnlocked.map((a) => ({
          id: a.id,
          name: a.name,
          description: a.description,
          tier: a.tier,
          icon: a.icon,
          xpReward: a.xpReward,
        })),
        xp: progress.xp,
        level: progress.level,
        leveledUp: newLevel > previousLevel,
      });
    }

    return { newlyUnlocked, progress };
  } catch (err) {
    console.error('[achievement.service] checkAchievements error:', err);
    return { newlyUnlocked: [], progress: null };
  }
}

// ─── Exports ──────────────────────────────────────────────────────────────────

module.exports = {
  checkAchievements,
  computeStats,
  computeLevel,
  computeMomentum,
  LEVELS,
};
