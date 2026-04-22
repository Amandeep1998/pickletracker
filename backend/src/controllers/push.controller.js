const webpush = require('web-push');
const PushSubscription = require('../models/PushSubscription');
const Tournament = require('../models/Tournament');

webpush.setVapidDetails(
  'mailto:' + (process.env.ADMIN_EMAIL || 'admin@pickletracker.in'),
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

const pad = (n) => String(n).padStart(2, '0');

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

// ── Cron: send push reminders for tomorrow's tournaments ──────────────────────

const runPushReminders = async () => {
  // Use IST (UTC+5:30) to match how tournament dates are stored
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const tomorrowIST = new Date(Date.now() + istOffsetMs + 24 * 60 * 60 * 1000);
  const tomorrowStr = `${tomorrowIST.getUTCFullYear()}-${pad(tomorrowIST.getUTCMonth() + 1)}-${pad(tomorrowIST.getUTCDate())}`;

  const subscriptions = await PushSubscription.find().lean();
  if (!subscriptions.length) return 0;

  const userIds = [...new Set(subscriptions.map((s) => String(s.userId)))];
  let sent = 0;

  for (const userId of userIds) {
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

    const payload = JSON.stringify({ title, body, url: '/tournaments' });
    const userSubs = subscriptions.filter((s) => String(s.userId) === userId);

    for (const sub of userSubs) {
      try {
        await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, payload);
        sent++;
      } catch (err) {
        // 410 Gone = subscription expired; clean it up
        if (err.statusCode === 410 || err.statusCode === 404) {
          await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
        }
      }
    }
  }
  return sent;
};

exports.runPushReminders = runPushReminders;

exports.triggerPushReminders = async (req, res, next) => {
  if (!process.env.CRON_SECRET || req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const sent = await runPushReminders();
    res.json({ success: true, sent });
  } catch (err) { next(err); }
};
