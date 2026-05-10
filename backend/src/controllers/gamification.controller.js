const UserProgress = require('../models/UserProgress');
const GamificationFeedItem = require('../models/GamificationFeedItem');
const User = require('../models/User');
const Friendship = require('../models/Friendship');
const { checkAchievements, computeLevel, computeMomentum, LEVELS } = require('../services/achievement.service');
const ACHIEVEMENTS = require('../data/achievements');

const getProgress = async (req, res, next) => {
  try {
    let progress = await UserProgress.findOne({ userId: req.user.id });
    if (!progress) {
      progress = await UserProgress.create({ userId: req.user.id, xp: 0, achievements: [] });
    }

    const momentum = await computeMomentum(req.user.id);
    const levelData = computeLevel(progress.xp);

    const sixtySecondsAgo = new Date(Date.now() - 60 * 1000);
    const pendingCount = progress.achievements.filter(
      (a) => a.unlockedAt && a.unlockedAt >= sixtySecondsAgo
    ).length;

    res.status(200).json({
      success: true,
      data: {
        xp: progress.xp,
        level: levelData.level,
        levelTitle: levelData.title,
        nextLevelXP: levelData.nextLevelXP,
        currentLevelXP: levelData.currentLevelXP,
        xpToNextLevel: levelData.xpToNextLevel,
        momentum,
        achievements: progress.achievements.map((a) => ({
          achievementId: a.achievementId,
          unlockedAt: a.unlockedAt,
          sharedToFeed: a.sharedToFeed,
        })),
        pendingCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getAchievements = async (req, res, next) => {
  try {
    const progress = await UserProgress.findOne({ userId: req.user.id });
    const unlockedMap = {};
    if (progress) {
      for (const a of progress.achievements) {
        unlockedMap[a.achievementId] = { unlockedAt: a.unlockedAt, sharedToFeed: a.sharedToFeed };
      }
    }

    const enriched = ACHIEVEMENTS.map((achievement) => {
      const record = unlockedMap[achievement.id] || null;
      return {
        ...achievement,
        unlocked: !!record,
        unlockedAt: record ? record.unlockedAt : null,
        sharedToFeed: record ? record.sharedToFeed : false,
      };
    });

    // Group by category
    const grouped = enriched.reduce((acc, a) => {
      const cat = a.category || 'general';
      if (!acc[cat]) acc[cat] = [];
      acc[cat].push(a);
      return acc;
    }, {});

    const unlockedCount = enriched.filter((a) => a.unlocked).length;

    res.status(200).json({
      success: true,
      data: {
        achievements: grouped,
        unlockedCount,
        totalCount: enriched.length,
      },
    });
  } catch (err) {
    next(err);
  }
};

const getGamificationFeed = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 20, 50);
    const before = req.query.before ? new Date(req.query.before) : null;

    // Find accepted friendships
    const friendships = await Friendship.find({
      $or: [{ requesterId: req.user.id }, { recipientId: req.user.id }],
      status: 'accepted',
    });

    const friendIds = friendships.map((f) =>
      String(f.requesterId) === String(req.user.id) ? f.recipientId : f.requesterId
    );

    const query = {
      userId: { $in: friendIds },
      type: { $in: ['achievement_unlock', 'level_up'] },
    };
    if (before) {
      query.createdAt = { $lt: before };
    }

    const items = await GamificationFeedItem.find(query)
      .sort({ createdAt: -1 })
      .limit(limit + 1)
      .lean();

    const hasMore = items.length > limit;
    const pageItems = items.slice(0, limit);

    // Collect user IDs to populate
    const userIds = [...new Set(pageItems.map((i) => String(i.userId)))];
    const users = await User.find({ _id: { $in: userIds } })
      .select('name city profilePhoto')
      .lean();
    const userMap = {};
    for (const u of users) {
      userMap[String(u._id)] = u;
    }

    // Build achievement lookup
    const achievementMap = {};
    for (const a of ACHIEVEMENTS) {
      achievementMap[a.id] = a;
    }

    // Build level lookup
    const levelMap = {};
    for (const l of LEVELS) {
      levelMap[l.level] = l;
    }

    const currentUserId = String(req.user.id);

    const enrichedItems = pageItems.map((item) => {
      const user = userMap[String(item.userId)] || null;

      let achievementDetails = null;
      if (item.type === 'achievement_unlock' && item.achievementId) {
        achievementDetails = achievementMap[item.achievementId] || null;
      }

      let levelDetails = null;
      if (item.type === 'level_up' && item.newLevel != null) {
        levelDetails = levelMap[item.newLevel] || null;
      }

      const reactions = (item.reactions || []).map((r) => ({
        userId: r.userId,
        emoji: r.emoji,
        reactedAt: r.reactedAt,
      }));

      const currentUserReaction = reactions.find((r) => String(r.userId) === currentUserId) || null;

      return {
        ...item,
        user,
        achievementDetails,
        levelDetails,
        reactions,
        currentUserReaction,
      };
    });

    res.status(200).json({
      success: true,
      data: {
        items: enrichedItems,
        hasMore,
      },
    });
  } catch (err) {
    next(err);
  }
};

const toggleGamificationReaction = async (req, res, next) => {
  try {
    const { emoji } = req.body;
    const validEmojis = ['🔥', '💪', '👏'];
    if (!validEmojis.includes(emoji)) {
      return res.status(400).json({ success: false, message: 'Invalid emoji' });
    }

    const item = await GamificationFeedItem.findById(req.params.itemId);
    if (!item) {
      return res.status(404).json({ success: false, message: 'Feed item not found' });
    }

    const userId = String(req.user.id);
    const existingIndex = item.reactions.findIndex(
      (r) => String(r.userId) === userId && r.emoji === emoji
    );

    if (existingIndex !== -1) {
      // Toggle off: remove the same emoji reaction
      item.reactions.splice(existingIndex, 1);
    } else {
      // Remove any existing reaction by this user (different emoji)
      item.reactions = item.reactions.filter((r) => String(r.userId) !== userId);
      // Add new reaction
      item.reactions.push({ userId: req.user.id, emoji, reactedAt: new Date() });
    }

    await item.save();

    res.status(200).json({
      success: true,
      data: { reactions: item.reactions },
    });
  } catch (err) {
    next(err);
  }
};

const markAchievementShared = async (req, res, next) => {
  try {
    const progress = await UserProgress.findOne({ userId: req.user.id });
    if (!progress) {
      return res.status(404).json({ success: false, message: 'Progress not found' });
    }

    const achievement = progress.achievements.find(
      (a) => a.achievementId === req.params.achievementId
    );
    if (!achievement) {
      return res.status(404).json({ success: false, message: 'Achievement not found' });
    }

    achievement.sharedToFeed = true;
    await progress.save();

    res.status(200).json({ success: true, message: 'Achievement marked as shared' });
  } catch (err) {
    next(err);
  }
};

const triggerCheck = async (req, res, next) => {
  try {
    await checkAchievements(req.user.id);
    res.status(200).json({ success: true, message: 'Check triggered' });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProgress,
  getAchievements,
  getGamificationFeed,
  toggleGamificationReaction,
  markAchievementShared,
  triggerCheck,
};
