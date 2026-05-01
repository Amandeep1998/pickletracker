const mongoose = require('mongoose');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const FeedLike = require('../models/FeedLike');
const FeedComment = require('../models/FeedComment');
const FeedNotification = require('../models/FeedNotification');
const FeedLikePushLog = require('../models/FeedLikePushLog');
const { sendPushToUser } = require('./push.controller');

const LIKE_PUSH_DEBOUNCE_MS = 5 * 60 * 1000; // 5 minutes

function formatLikePushBody(likerNames, totalCount, tournamentName) {
  let who;
  if (totalCount === 1)      who = likerNames[0];
  else if (totalCount === 2) who = `${likerNames[0]} and ${likerNames[1]}`;
  else                       who = `${likerNames[0]} and ${totalCount - 1} other${totalCount - 1 > 1 ? 's' : ''}`;
  return `${who} liked your ${tournamentName}`;
}

/**
 * GET /api/feed
 * Returns community activity feed enriched with like counts, liked state, and recent comments.
 */
exports.getFeed = async (req, res, next) => {
  try {
    const currentUserId = new mongoose.Types.ObjectId(req.user.id);
    const today = new Date().toISOString().slice(0, 10);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      .toISOString()
      .slice(0, 10);

    // ── Step 1: Fetch relevant tournaments ────────────────────────────────────
    const tournaments = await Tournament.find({
      'categories.date': { $gte: thirtyDaysAgo },
    })
      .sort({ updatedAt: -1 })
      .limit(60)
      .lean();

    if (!tournaments.length) {
      return res.json({ success: true, data: [] });
    }

    const tournamentIds = tournaments.map((t) => t._id);
    const userIds = [...new Set(tournaments.map((t) => String(t.userId)))];

    // ── Step 2: Fetch user info ───────────────────────────────────────────────
    const users = await User.find({ _id: { $in: userIds } })
      .select('name city state profilePhoto')
      .lean();

    const userMap = {};
    for (const u of users) {
      userMap[String(u._id)] = {
        id: u._id,
        name: u.name,
        city: u.city || null,
        state: u.state || null,
        profilePhoto: u.profilePhoto || null,
      };
    }

    // ── Step 3: Like counts + current user liked? ─────────────────────────────
    const likeAgg = await FeedLike.aggregate([
      { $match: { tournamentId: { $in: tournamentIds } } },
      {
        $group: {
          _id: '$tournamentId',
          count: { $sum: 1 },
          likedByMe: {
            $sum: { $cond: [{ $eq: ['$userId', currentUserId] }, 1, 0] },
          },
        },
      },
    ]);

    const likeMap = {};
    for (const l of likeAgg) {
      likeMap[String(l._id)] = { count: l.count, likedByMe: l.likedByMe > 0 };
    }

    // ── Step 4: Recent comments (last 2 per tournament) ───────────────────────
    const allComments = await FeedComment.find({ tournamentId: { $in: tournamentIds } })
      .sort({ createdAt: 1 })
      .lean();

    const commentMap = {};
    for (const c of allComments) {
      const key = String(c.tournamentId);
      if (!commentMap[key]) commentMap[key] = [];
      commentMap[key].push({
        id: c._id,
        userId: c.userId,
        userName: c.userName,
        text: c.text,
        createdAt: c.createdAt,
      });
    }

    // ── Step 5: Shape feed items ──────────────────────────────────────────────
    const feedItems = [];

    for (const t of tournaments) {
      const user = userMap[String(t.userId)];
      if (!user) continue;

      const tIdStr = String(t._id);
      const social = {
        likeCount:      likeMap[tIdStr]?.count    ?? 0,
        likedByMe:      likeMap[tIdStr]?.likedByMe ?? false,
        commentCount:   commentMap[tIdStr]?.length  ?? 0,
        recentComments: (commentMap[tIdStr] || []).slice(-2),
      };

      const upcomingCategories = (t.categories || []).filter((c) => c.date && c.date >= today);
      const recentCategories   = (t.categories || []).filter((c) => c.date && c.date >= thirtyDaysAgo && c.date < today);

      if (upcomingCategories.length > 0) {
        feedItems.push({
          id: `${t._id}-upcoming`,
          type: 'upcoming',
          user,
          tournament: { id: t._id, name: t.name, location: t.location?.name || null },
          categories: upcomingCategories.map((c) => ({
            name: c.categoryName,
            date: c.date,
            partnerName: c.partnerName || null,
          })),
          earliestDate: upcomingCategories.map((c) => c.date).sort()[0],
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          ...social,
        });
      }

      if (recentCategories.length > 0) {
        feedItems.push({
          id: `${t._id}-recent`,
          type: 'recent',
          user,
          tournament: { id: t._id, name: t.name, location: t.location?.name || null },
          categories: recentCategories.map((c) => ({
            name: c.categoryName,
            date: c.date,
            medal: c.medal || 'None',
          })),
          medals: recentCategories
            .filter((c) => c.medal && c.medal !== 'None')
            .map((c) => ({ category: c.categoryName, medal: c.medal })),
          latestDate: recentCategories.map((c) => c.date).sort().reverse()[0],
          createdAt: t.createdAt,
          updatedAt: t.updatedAt,
          ...social,
        });
      }
    }

    // ── Step 6: Sort ──────────────────────────────────────────────────────────
    feedItems.sort((a, b) => {
      if (a.type === 'upcoming' && b.type !== 'upcoming') return -1;
      if (a.type !== 'upcoming' && b.type === 'upcoming') return 1;
      if (a.type === 'upcoming') return (a.earliestDate || '') < (b.earliestDate || '') ? -1 : 1;
      return (a.latestDate || '') > (b.latestDate || '') ? -1 : 1;
    });

    res.json({ success: true, data: feedItems.slice(0, 30) });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/feed/notifications
 * Returns the current user's in-app notifications (newest first, max 30).
 */
exports.getNotifications = async (req, res, next) => {
  try {
    const userId = req.user.id;

    const notifications = await FeedNotification.find({ userId })
      .sort({ createdAt: -1 })
      .limit(30)
      .lean();

    const unreadCount = await FeedNotification.countDocuments({ userId, read: false });

    res.json({
      success: true,
      unreadCount,
      data: notifications.map((n) => ({
        id: n._id,
        type: n.type,
        actorName: n.actorName,
        tournamentName: n.tournamentName,
        tournamentId: n.tournamentId,
        commentText: n.commentText || null,
        read: n.read,
        createdAt: n.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * PUT /api/feed/notifications/read-all
 * Marks all of the current user's notifications as read.
 */
exports.markAllRead = async (req, res, next) => {
  try {
    await FeedNotification.updateMany({ userId: req.user.id, read: false }, { $set: { read: true } });
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/feed/:tournamentId/like
 * Toggle like. Creates an in-app notification for the tournament owner.
 * Push notifications are batched — one push per 5-minute window per tournament,
 * showing all accumulated likers (Instagram-style).
 */
exports.toggleLike = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const actorId = req.user.id;

    const existing = await FeedLike.findOne({ tournamentId, userId: actorId });

    if (existing) {
      await existing.deleteOne();
    } else {
      await FeedLike.create({ tournamentId, userId: actorId });

      // Notify tournament owner (skip self-like)
      const tournament = await Tournament.findById(tournamentId).select('userId name').lean();
      if (tournament && String(tournament.userId) !== String(actorId)) {
        const actor = await User.findById(actorId).select('name').lean();
        if (actor) {
          // In-app notification
          await FeedNotification.create({
            userId:         tournament.userId,
            actorId,
            actorName:      actor.name,
            type:           'like',
            tournamentId,
            tournamentName: tournament.name,
          });

          // Batched push — fire-and-forget, must not block response
          sendBatchedLikePush(tournament, actorId).catch(() => {});
        }
      }
    }

    const likeCount = await FeedLike.countDocuments({ tournamentId });
    res.json({ success: true, likedByMe: !existing, likeCount });
  } catch (err) {
    next(err);
  }
};

async function sendBatchedLikePush(tournament, actorId) {
  const recipientId = tournament.userId;
  const tournamentId = tournament._id;
  const now = new Date();

  // Check when last like push was sent for this tournament → owner pair
  const log = await FeedLikePushLog.findOne({ userId: recipientId, tournamentId }).lean();

  if (log && now - new Date(log.pushedAt) < LIKE_PUSH_DEBOUNCE_MS) {
    // Within the debounce window — absorb silently
    return;
  }

  // Outside window (or first ever) — build the batched message
  // Get all current likers, newest first, to surface the most recent names
  const likes = await FeedLike.find({ tournamentId })
    .sort({ createdAt: -1 })
    .limit(10)
    .lean();

  const totalCount = likes.length;
  if (totalCount === 0) return;

  const likerIds = likes.map((l) => l.userId);
  const likers = await User.find({ _id: { $in: likerIds } }).select('name').lean();

  // Build ordered name list matching likes order (newest first)
  const likerMap = {};
  for (const u of likers) likerMap[String(u._id)] = u.name;
  const likerNames = likerIds.map((id) => likerMap[String(id)]).filter(Boolean);

  const body = formatLikePushBody(likerNames, totalCount, tournament.name);

  // Update the push log (upsert) before sending so rapid likes don't race
  await FeedLikePushLog.findOneAndUpdate(
    { userId: recipientId, tournamentId },
    { pushedAt: now },
    { upsert: true }
  );

  await sendPushToUser(recipientId, {
    title: 'Someone liked your tournament',
    body,
    url:   '/home',
    tag:   'feed-like',
  });
}

/**
 * GET /api/feed/:tournamentId/comments
 * Get all comments for a tournament (oldest first).
 */
exports.getComments = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;

    const comments = await FeedComment.find({ tournamentId })
      .sort({ createdAt: 1 })
      .lean();

    res.json({
      success: true,
      data: comments.map((c) => ({
        id: c._id,
        userId: c.userId,
        userName: c.userName,
        text: c.text,
        createdAt: c.createdAt,
      })),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * POST /api/feed/:tournamentId/comments
 * Add a comment. Creates an in-app notification + push for the tournament owner.
 */
exports.addComment = async (req, res, next) => {
  try {
    const { tournamentId } = req.params;
    const { text } = req.body;

    if (!text || !text.trim()) {
      return res.status(400).json({ success: false, message: 'Comment text is required' });
    }
    if (text.trim().length > 500) {
      return res.status(400).json({ success: false, message: 'Comment too long (max 500 chars)' });
    }

    const actor = await User.findById(req.user.id).select('name').lean();
    if (!actor) return res.status(404).json({ success: false, message: 'User not found' });

    const comment = await FeedComment.create({
      tournamentId,
      userId: req.user.id,
      userName: actor.name,
      text: text.trim(),
    });

    // Notify + push tournament owner (skip self-comment)
    const tournament = await Tournament.findById(tournamentId).select('userId name').lean();
    if (tournament && String(tournament.userId) !== String(req.user.id)) {
      const excerpt = text.trim().length > 60 ? text.trim().slice(0, 60) + '…' : text.trim();

      await FeedNotification.create({
        userId:         tournament.userId,
        actorId:        req.user.id,
        actorName:      actor.name,
        type:           'comment',
        tournamentId,
        tournamentName: tournament.name,
        commentText:    text.trim(),
      });

      // Push notification for comments
      sendPushToUser(tournament.userId, {
        title: `${actor.name} commented on your tournament`,
        body:  excerpt,
        url:   '/home',
        tag:   'feed-comment',
      }).catch(() => {}); // fire-and-forget, must not block response
    }

    res.status(201).json({
      success: true,
      data: {
        id:        comment._id,
        userId:    comment.userId,
        userName:  comment.userName,
        text:      comment.text,
        createdAt: comment.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * DELETE /api/feed/:tournamentId/comments/:commentId
 * Delete own comment.
 */
exports.deleteComment = async (req, res, next) => {
  try {
    const { commentId } = req.params;

    const comment = await FeedComment.findById(commentId);
    if (!comment) return res.status(404).json({ success: false, message: 'Comment not found' });
    if (String(comment.userId) !== req.user.id) {
      return res.status(403).json({ success: false, message: 'Not your comment' });
    }

    await comment.deleteOne();
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};
