const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const FeedNotification = require('../models/FeedNotification');
const {
  calendarDateInUserZone,
  calendarDatePlusDaysInUserZone,
  inDayBeforePushWindow,
  inEveningResultPushWindow,
} = require('../utils/userTimeZone');

webpush.setVapidDetails(
  'mailto:' + (process.env.ADMIN_EMAIL || 'admin@pickletracker.in'),
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

// ── Subscribe ─────────────────────────────────────────────────────────────────

exports.subscribe = async (req, res, next) => {
  try {
    const { endpoint, keys } = req.body;
    if (!endpoint || !keys?.p256dh || !keys?.auth) {
      return res.status(400).json({ message: 'Invalid subscription payload' });
    }
    await PushSubscription.findOneAndUpdate(
      { endpoint },
      { userId: req.user.id, endpoint, keys },
      { upsert: true, new: true }
    );
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Unsubscribe ───────────────────────────────────────────────────────────────

exports.unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (endpoint) {
      await PushSubscription.deleteOne({ userId: req.user.id, endpoint });
    }
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Cron: day-before push (~7 PM in the user's time zone) ────────────────────
// One reminder per (tournament, category) on tomorrow's date — dedup'd via the
// FeedNotification row (unique partial index on userId+tournamentId+categoryDate+
// categoryName+type), so multi-day tournaments correctly fire on each preceding
// evening instead of once per user.

const runPushReminders = async () => {
  const subscriptions = await PushSubscription.find().lean();
  if (!subscriptions.length) return 0;

  const userIds = [...new Set(subscriptions.map((s) => String(s.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('timeZone')
    .lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  let sent = 0;

  for (const userId of userIds) {
    const user = userById.get(userId);
    if (!user) continue;
    if (!inDayBeforePushWindow(user)) continue;

    const tomorrowStr = calendarDatePlusDaysInUserZone(user, 1);

    const tournaments = await Tournament.find({
      userId,
      'categories.date': tomorrowStr,
    }).lean();
    if (!tournaments.length) continue;

    // Build the per-category candidate list for tomorrow.
    const candidates = [];
    for (const t of tournaments) {
      for (const cat of t.categories || []) {
        if (cat.date === tomorrowStr) {
          candidates.push({ tournament: t, category: cat });
        }
      }
    }
    if (!candidates.length) continue;

    // Try to insert one FeedNotification per candidate; the unique index drops
    // duplicates so anything that survives is genuinely fresh (push-worthy).
    const fresh = [];
    for (const c of candidates) {
      try {
        await FeedNotification.create({
          userId,
          type: 'tournament_reminder',
          tournamentId: c.tournament._id,
          tournamentName: c.tournament.name,
          categoryName: c.category.categoryName,
          categoryDate: tomorrowStr,
        });
        fresh.push(c);
      } catch (err) {
        if (err && err.code === 11000) continue; // already notified
        console.error('[PushReminder] failed to create tournament_reminder', err);
      }
    }
    if (!fresh.length) continue;

    // One consolidated push per user per evening for all newly-recorded categories.
    const labels = fresh.map((f) =>
      f.tournament.name === f.category.categoryName
        ? f.tournament.name
        : `${f.tournament.name} — ${f.category.categoryName}`
    );
    const title = 'Tournament Tomorrow! 🏆';
    const body =
      labels.length === 1
        ? `${labels[0]} is tomorrow. Good luck!`
        : `${labels.length} categories tomorrow: ${labels.slice(0, 2).join(', ')}${labels.length > 2 ? '…' : ''}`;

    const payload = JSON.stringify({
      title,
      body,
      url: '/',
      tag: `tournament-reminder-${tomorrowStr}`,
    });
    const userSubs = subscriptions.filter((s) => String(s.userId) === userId);

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        }
      }
    }
  }
  return sent;
};

// ── Cron: same evening (~11:30 PM in the user's time zone) — log today's results ──
// One nudge per (tournament, category) that finished today with medal still unset.
// Dedup'd via FeedNotification row, so each category gets its own log-results
// reminder for multi-day tournaments.

const runPushResultReminders = async () => {
  const subscriptions = await PushSubscription.find().lean();
  if (!subscriptions.length) return 0;

  const userIds = [...new Set(subscriptions.map((s) => String(s.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('timeZone')
    .lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  let sent = 0;

  for (const userId of userIds) {
    const user = userById.get(userId);
    if (!user) continue;
    if (!inEveningResultPushWindow(user)) continue;

    const todayStr = calendarDateInUserZone(user);

    const tournaments = await Tournament.find({
      userId,
      'categories.date': todayStr,
    }).lean();
    if (!tournaments.length) continue;

    // Per-category candidates: today's date + medal not yet logged.
    const candidates = [];
    for (const t of tournaments) {
      for (const cat of t.categories || []) {
        if (cat.date === todayStr && cat.medal === 'None') {
          candidates.push({ tournament: t, category: cat });
        }
      }
    }
    if (!candidates.length) continue;

    const fresh = [];
    for (const c of candidates) {
      try {
        await FeedNotification.create({
          userId,
          type: 'log_results',
          tournamentId: c.tournament._id,
          tournamentName: c.tournament.name,
          categoryName: c.category.categoryName,
          categoryDate: todayStr,
        });
        fresh.push(c);
      } catch (err) {
        if (err && err.code === 11000) continue; // already nudged
        console.error('[PushReminder] failed to create log_results notification', err);
      }
    }
    if (!fresh.length) continue;

    const labels = fresh.map((f) =>
      f.tournament.name === f.category.categoryName
        ? f.tournament.name
        : `${f.tournament.name} — ${f.category.categoryName}`
    );
    const title = "Log today's results 🏆";
    const body =
      labels.length === 1
        ? `How did ${labels[0]} go? Tap to log your medal before the day ends.`
        : `${labels.length} categories today — log your results while they're fresh.`;

    const payload = JSON.stringify({
      title,
      body,
      url: '/',
      tag: `result-log-${todayStr}`,
    });
    const userSubs = subscriptions.filter((s) => String(s.userId) === userId);

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        }
      }
    }
  }
  return sent;
};

// ── Shared utility: send push to a single user ───────────────────────────────

const sendPushToUser = async (userId, payload) => {
  const subs = await PushSubscription.find({ userId }).lean();
  for (const sub of subs) {
    try {
      await webpush.sendNotification(
        { endpoint: sub.endpoint, keys: sub.keys },
        JSON.stringify(payload)
      );
    } catch (err) {
      if (err.statusCode === 410 || err.statusCode === 404) {
        await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
      }
    }
  }
};

exports.sendPushToUser = sendPushToUser;

exports.runPushReminders = runPushReminders;
exports.runPushResultReminders = runPushResultReminders;

exports.triggerPushReminders = async (req, res, next) => {
  if (!process.env.CRON_SECRET || req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const sent = await runPushReminders();
    res.json({ success: true, sent });
  } catch (err) { next(err); }
};

exports.triggerPushResultReminders = async (req, res, next) => {
  if (!process.env.CRON_SECRET || req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const sent = await runPushResultReminders();
    res.json({ success: true, sent });
  } catch (err) { next(err); }
};
