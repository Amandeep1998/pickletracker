const WhatsAppSession = require('../models/WhatsAppSession');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Session = require('../models/Session');
const { send } = require('../services/whatsapp.service');

// ── Formatting helpers ─────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
};

const fmtMoney = (n) => `₹${new Intl.NumberFormat('en-IN').format(Math.abs(n))}`;

const fmtProfit = (n) => (n >= 0 ? `+${fmtMoney(n)}` : `-${fmtMoney(n)}`);

// ── Static messages ────────────────────────────────────────────────────────────

const MENU_MSG =
  `🏓 *PickleTracker*\n\n` +
  `What would you like to do?\n` +
  `1️⃣ View Summary\n` +
  `2️⃣ Help\n\n` +
  `Reply with a number, or visit pickletracker.in to add sessions & tournaments.`;

const HELP_MSG =
  `*PickleTracker Help* 🏓\n\n` +
  `You'll receive automatic reminders here:\n` +
  `• *Tournament reminders* — 1 day before an upcoming tournament\n` +
  `• *Weekly insights* — your top strengths, areas to work on, and streak\n\n` +
  `*Commands (any time):*\n` +
  `• *1* — View your tournament summary\n` +
  `• *2* or *help* — Show this help message\n` +
  `• *menu* or *cancel* — Back to main menu\n\n` +
  `To log sessions or add tournaments, open the app: pickletracker.in`;

// ── Conversation handlers ──────────────────────────────────────────────────────

const handleMenu = async (session, text, waId) => {
  const t = text.trim().toLowerCase();

  if (t === '1' || t.includes('summ') || t.includes('view') || t.includes('stat')) {
    await sendSummary(session, waId);
    return;
  }

  if (t === '2' || t.includes('help')) {
    await send(waId, HELP_MSG);
    return;
  }

  await send(waId, MENU_MSG);
};

// ── Summary ────────────────────────────────────────────────────────────────────

const sendSummary = async (session, waId) => {
  const [recent, all] = await Promise.all([
    Tournament.find({ userId: session.userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Tournament.find({ userId: session.userId }).lean(),
  ]);

  if (all.length === 0) {
    await send(waId,
      `📊 *Your Summary*\n\nNo tournaments yet.\n\nLog your first tournament at pickletracker.in!\n\n${MENU_MSG}`
    );
    return;
  }

  const totalProfit = all.reduce(
    (sum, t) => sum + t.categories.reduce((s, c) => s + (c.prizeAmount - c.entryFee), 0),
    0
  );

  const lines = recent.map((t) => {
    const profit = t.categories.reduce((s, c) => s + (c.prizeAmount - c.entryFee), 0);
    return `• *${t.name}* — ${fmtProfit(profit)}`;
  }).join('\n');

  await send(waId,
    `📊 *Your Summary*\n\n` +
    `Tournaments: ${all.length}\n` +
    `Overall P/L: *${fmtProfit(totalProfit)}*\n\n` +
    `*Recent:*\n${lines}\n\n` +
    `─────────────────\n` +
    MENU_MSG
  );
};

// ── Phone normalisation ────────────────────────────────────────────────────────

const normalisePhone = (input) => {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && /^91[6-9]/.test(digits)) return digits;
  return null;
};

// ── App-side connect / disconnect / status ─────────────────────────────────────

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('whatsappPhone whatsappEnabled').lean();
    res.json({
      enabled: !!user?.whatsappEnabled,
      connected: !!user?.whatsappPhone,
      phone: user?.whatsappPhone || null,
    });
  } catch (err) {
    next(err);
  }
};

exports.connect = async (req, res, next) => {
  try {
    const waId = normalisePhone(req.body.phone || '');
    if (!waId) {
      return res.status(400).json({ message: 'Please enter a valid 10-digit Indian mobile number.' });
    }

    const updateFields = { whatsappPhone: waId };
    if (req.body.city) updateFields.city = String(req.body.city).trim().slice(0, 100);
    if (req.body.state) updateFields.state = String(req.body.state).trim().slice(0, 100);

    // Remove any existing session for this user (changing number)
    await WhatsAppSession.deleteOne({ userId: req.user.id });

    // If another user already linked this number, unlink them first
    await User.updateOne({ whatsappPhone: waId, _id: { $ne: req.user.id } }, { whatsappPhone: null });

    // Link number (and optionally city/state) on the User record
    await User.findByIdAndUpdate(req.user.id, updateFields);

    // Create fresh session
    await WhatsAppSession.findOneAndUpdate(
      { waId },
      { waId, userId: req.user.id, state: 'MENU', context: {}, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send welcome message
    const user = await User.findById(req.user.id).select('name').lean();
    await send(waId,
      `👋 Hi *${user.name}*! Welcome to PickleTracker on WhatsApp! 🏓\n\n` +
      `You'll now receive:\n` +
      `• Tournament reminders the day before your events\n` +
      `• Weekly performance insights\n\n` +
      MENU_MSG
    );

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

exports.disconnect = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('whatsappPhone').lean();
    if (user?.whatsappPhone) {
      await WhatsAppSession.deleteOne({ waId: user.whatsappPhone });
      await User.findByIdAndUpdate(req.user.id, { whatsappPhone: null });
    }
    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

// ── Cron: Tournament reminders ─────────────────────────────────────────────────

/**
 * Find users whose tournament categories are tomorrow and send WhatsApp reminders.
 * Called by a daily cron job via POST /api/whatsapp/trigger-reminders
 */
const sendTournamentReminders = async () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];

  // Find users with a WhatsApp number connected
  const users = await User.find({ whatsappPhone: { $ne: null } }).select('_id whatsappPhone name').lean();

  let sent = 0;
  for (const user of users) {
    const tournaments = await Tournament.find({
      userId: user._id,
      'categories.date': tomorrowStr,
    }).lean();

    if (tournaments.length === 0) continue;

    const lines = [];
    for (const t of tournaments) {
      const cats = t.categories.filter((c) => c.date?.startsWith(tomorrowStr));
      for (const cat of cats) {
        const emoji = cat.medal === 'Gold' ? '🥇' : cat.medal === 'Silver' ? '🥈' : cat.medal === 'Bronze' ? '🥉' : '🏓';
        lines.push(`${emoji} *${t.name}* — ${cat.categoryName}`);
        if (cat.entryFee > 0) lines.push(`   Entry fee: ${fmtMoney(cat.entryFee)}`);
      }
    }

    const msg =
      `🔔 *Tournament Reminder*\n\n` +
      `Hi *${user.name}*! You have a tournament tomorrow (${fmtDate(tomorrowStr)}):\n\n` +
      lines.join('\n') +
      `\n\nGood luck! 🏆 Check your schedule on pickletracker.in`;

    try {
      await send(user.whatsappPhone, msg);
      sent++;
    } catch (err) {
      console.error(`[WA Reminders] Failed to send to ${user.whatsappPhone}:`, err.message);
    }
  }

  return sent;
};

exports.triggerReminders = async (req, res, next) => {
  const secret = req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const sent = await sendTournamentReminders();
    res.json({ success: true, sent });
  } catch (err) {
    next(err);
  }
};

// ── Cron: Weekly insights ──────────────────────────────────────────────────────

/**
 * Send weekly performance insights to all WhatsApp-connected users.
 * Called by a weekly cron job via POST /api/whatsapp/trigger-insights
 */
const sendWeeklyInsights = async () => {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = weekAgo.toISOString().split('T')[0];

  const users = await User.find({ whatsappPhone: { $ne: null } }).select('_id whatsappPhone name').lean();

  let sent = 0;
  for (const user of users) {
    const sessions = await Session.find({
      userId: user._id,
      date: { $gte: weekAgoStr },
    }).lean();

    if (sessions.length === 0) continue;

    // Tally skills
    const wellCount = {};
    const wrongCount = {};
    for (const s of sessions) {
      (s.wentWell || []).forEach((skill) => { wellCount[skill] = (wellCount[skill] || 0) + 1; });
      (s.wentWrong || []).forEach((skill) => { wrongCount[skill] = (wrongCount[skill] || 0) + 1; });
    }

    const topStrengths = Object.entries(wellCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);
    const topFocus = Object.entries(wrongCount).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([s]) => s);
    const avgRating = (sessions.reduce((s, x) => s + x.rating, 0) / sessions.length).toFixed(1);
    const courtFees = sessions.reduce((s, x) => s + (x.courtFee || 0), 0);

    let msg =
      `📈 *Your Weekly Pickleball Insights*\n\n` +
      `Hi *${user.name}*! Here's how your last 7 days looked:\n\n` +
      `🎯 *Sessions:* ${sessions.length}\n` +
      `⭐ *Avg rating:* ${avgRating}/5\n`;

    if (courtFees > 0) msg += `🏟️ *Court fees:* ${fmtMoney(courtFees)}\n`;

    if (topStrengths.length > 0) {
      msg += `\n✅ *Top strengths:*\n${topStrengths.map((s) => `• ${s}`).join('\n')}\n`;
    }

    if (topFocus.length > 0) {
      msg += `\n🎯 *Focus areas:*\n${topFocus.map((s) => `• ${s}`).join('\n')}\n`;
    }

    msg += `\nKeep it up! Log your next session at pickletracker.in 🏓`;

    try {
      await send(user.whatsappPhone, msg);
      sent++;
    } catch (err) {
      console.error(`[WA Insights] Failed to send to ${user.whatsappPhone}:`, err.message);
    }
  }

  return sent;
};

exports.triggerInsights = async (req, res, next) => {
  const secret = req.headers['x-cron-secret'];
  if (!process.env.CRON_SECRET || secret !== process.env.CRON_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const sent = await sendWeeklyInsights();
    res.json({ success: true, sent });
  } catch (err) {
    next(err);
  }
};

// ── Main message processor ─────────────────────────────────────────────────────

const GLOBAL_COMMANDS = new Set(['menu', 'cancel', 'hi', 'hello', 'start', '/start']);

const processMessage = async (waId, text) => {
  let session = await WhatsAppSession.findOne({ waId });

  // No session — check if linked via the app
  if (!session) {
    const linkedUser = await User.findOne({ whatsappPhone: waId }).select('_id name').lean();
    if (linkedUser) {
      session = await WhatsAppSession.create({
        waId,
        userId: linkedUser._id,
        state: 'MENU',
        context: {},
      });
      await send(waId,
        `👋 Hi *${linkedUser.name}*! Welcome back to PickleTracker! 🏓\n\n` +
        MENU_MSG
      );
      return;
    }

    // Unknown number — prompt to connect via app
    await send(waId,
      `👋 Welcome to *PickleTracker*! 🏓\n\n` +
      `To connect WhatsApp, please visit your profile on pickletracker.in and enter your phone number there.\n\n` +
      `It only takes a few seconds!`
    );
    return;
  }

  session.updatedAt = new Date();

  const t = text.trim().toLowerCase();

  if (GLOBAL_COMMANDS.has(t)) {
    if (!session.userId) {
      await session.save();
      await send(waId, `Please connect your WhatsApp from the PickleTracker app at pickletracker.in`);
      return;
    }
    session.state = 'MENU';
    session.context = {};
    await session.save();
    await send(waId, MENU_MSG);
    return;
  }

  if (!session.userId) {
    await send(waId,
      `To connect your account, please visit pickletracker.in and add your phone number in your profile.`
    );
    return;
  }

  // Route — simplified to just MENU
  session.state = 'MENU';
  await session.save();
  await handleMenu(session, text, waId);
};

// ── Webhook controllers ────────────────────────────────────────────────────────

/**
 * GET /api/whatsapp/webhook
 * Meta webhook verification handshake.
 */
exports.verify = (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.status(403).send('Forbidden');
};

/**
 * POST /api/whatsapp/webhook
 * Incoming messages from WhatsApp users.
 * Must respond 200 immediately — processing happens async after.
 */
exports.webhook = async (req, res) => {
  res.status(200).send('OK');

  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message || message.type !== 'text') return;

    const waId = message.from;
    const text = message.text?.body?.trim();
    if (!waId || !text) return;

    await processMessage(waId, text);
  } catch (err) {
    console.error('[WhatsApp webhook] Unhandled error:', err);
  }
};
