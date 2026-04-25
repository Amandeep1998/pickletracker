const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
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

const runPushReminders = async () => {
  const subscriptions = await PushSubscription.find().lean();
  if (!subscriptions.length) return 0;

  const userIds = [...new Set(subscriptions.map((s) => String(s.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('timeZone pushLastDayBeforeNudgeEventDate')
    .lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  let sent = 0;

  for (const userId of userIds) {
    const user = userById.get(userId);
    if (!user) continue;
    if (!inDayBeforePushWindow(user)) continue;

    const tomorrowStr = calendarDatePlusDaysInUserZone(user, 1);
    if (user.pushLastDayBeforeNudgeEventDate === tomorrowStr) continue;

    const tournaments = await Tournament.find({
      userId,
      'categories.date': tomorrowStr,
    }).lean();
    if (!tournaments.length) continue;

    const names = tournaments.map((t) => t.name);
    const title = 'Tournament Tomorrow! 🏆';
    const body =
      names.length === 1
        ? `You have ${names[0]} tomorrow. Good luck!`
        : `You have ${names.length} tournaments tomorrow: ${names.slice(0, 2).join(', ')}${names.length > 2 ? '…' : ''}`;

    const payload = JSON.stringify({
      title,
      body,
      url: '/tournaments',
      tag: 'tournament-reminder',
    });
    const userSubs = subscriptions.filter((s) => String(s.userId) === userId);

    let ok = 0;
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        ok++;
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        }
      }
    }
    if (ok > 0) {
      await User.updateOne({ _id: userId }, { $set: { pushLastDayBeforeNudgeEventDate: tomorrowStr } }).catch(() => {});
    }
  }
  return sent;
};

// ── Cron: same evening (~11:30 PM in the user's time zone) — log today's results ──

const runPushResultReminders = async () => {
  const subscriptions = await PushSubscription.find().lean();
  if (!subscriptions.length) return 0;

  const userIds = [...new Set(subscriptions.map((s) => String(s.userId)))];
  const users = await User.find({ _id: { $in: userIds } })
    .select('timeZone pushLastEveningResultNudgeLocalDate')
    .lean();
  const userById = new Map(users.map((u) => [String(u._id), u]));

  let sent = 0;

  for (const userId of userIds) {
    const user = userById.get(userId);
    if (!user) continue;
    if (!inEveningResultPushWindow(user)) continue;

    const todayStr = calendarDateInUserZone(user);
    if (user.pushLastEveningResultNudgeLocalDate === todayStr) continue;

    const tournaments = await Tournament.find({
      userId,
      'categories.date': todayStr,
    }).lean();
    if (!tournaments.length) continue;

    const relevant = tournaments.filter((t) => {
      const todayCats = t.categories.filter((c) => c.date === todayStr);
      if (!todayCats.length) return false;
      return todayCats.every((c) => c.medal === 'None');
    });
    if (!relevant.length) continue;

    const names = relevant.map((t) => t.name);
    const title = "Log today's results 🏆";
    const body =
      names.length === 1
        ? `How did ${names[0]} go? Tap to log your medal and scores before the day ends.`
        : `You had ${names.length} tournaments today — log your results while they're fresh.`;

    const payload = JSON.stringify({
      title,
      body,
      url: '/calendar',
      tag: 'result-log-sameday',
    });
    const userSubs = subscriptions.filter((s) => String(s.userId) === userId);

    let ok = 0;
    for (const sub of userSubs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        ok++;
        sent++;
      } catch (err) {
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        }
      }
    }
    if (ok > 0) {
      await User.updateOne({ _id: userId }, { $set: { pushLastEveningResultNudgeLocalDate: todayStr } }).catch(() => {});
    }
  }
  return sent;
};

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
