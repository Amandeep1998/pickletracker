const WhatsAppSession = require('../models/WhatsAppSession');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Session = require('../models/Session');
const { send } = require('../services/whatsapp.service');

const maskPhone = (value) => {
  const s = String(value || '');
  if (!s) return null;
  if (s.length <= 4) return '****';
  return `${'*'.repeat(Math.max(0, s.length - 4))}${s.slice(-4)}`;
};

// ── Formatting helpers ─────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const pad = (n) => String(n).padStart(2, '0');

const todayStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
};

const fmtDate = (dateStr) => {
  if (!dateStr) return '—';
  const [y, m, d] = dateStr.split('-');
  return `${parseInt(d)} ${MONTH_NAMES[parseInt(m) - 1]} ${y}`;
};

const fmtMoney = (n) => `₹${new Intl.NumberFormat('en-IN').format(Math.abs(n))}`;

const fmtProfit = (n) => (n >= 0 ? `+${fmtMoney(n)}` : `-${fmtMoney(n)}`);

// Returns "Today", "Tomorrow", "18 Apr" etc.
const fmtRelativeDate = (dateStr) => {
  const today = todayStr();
  const [y, m, d] = dateStr.split('-');
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;
  if (dateStr === today) return 'Today';
  if (dateStr === tomorrowStr) return 'Tomorrow';
  return fmtDate(dateStr);
};

// ── Static messages ────────────────────────────────────────────────────────────

const MENU_MSG =
  `🏓 *PickleTracker*\n\n` +
  `What would you like to check?\n\n` +
  `1️⃣ Upcoming Tournaments\n` +
  `2️⃣ Performance & Streak\n` +
  `3️⃣ Finance Summary\n` +
  `4️⃣ Help\n\n` +
  `Reply with a number.`;

const HELP_MSG =
  `*PickleTracker Help* 🏓\n\n` +
  `*What you can check here:*\n` +
  `• *1* — Upcoming tournament dates & categories\n` +
  `• *2* — Recent sessions, avg rating, streak & medals\n` +
  `• *3* — Monthly P&L, career earnings & totals\n` +
  `• *4* or *help* — This message\n` +
  `• *menu* — Back to main menu\n\n` +
  `*Automatic alerts:*\n` +
  `• Tournament reminders the day before your events\n` +
  `• Weekly performance insights every Monday\n\n` +
  `To log sessions or add tournaments: pickletracker.in`;

// ── Option 1: Upcoming Tournaments ────────────────────────────────────────────

const sendUpcomingTournaments = async (session, waId) => {
  const today = todayStr();
  const allTournaments = await Tournament.find({ userId: session.userId }).lean();

  // Gather all future category dates
  const upcoming = [];
  for (const t of allTournaments) {
    for (const cat of t.categories) {
      const d = cat.date ? cat.date.split('T')[0] : null;
      if (d && d >= today) {
        upcoming.push({ name: t.name, category: cat.categoryName, date: d, entryFee: cat.entryFee });
      }
    }
  }
  upcoming.sort((a, b) => (a.date < b.date ? -1 : 1));

  if (upcoming.length === 0) {
    await send(waId,
      `📅 *Upcoming Tournaments*\n\n` +
      `You have no upcoming tournaments.\n\n` +
      `Add your next tournament at pickletracker.in! 🏆\n\n` +
      `─────────────────\n` + MENU_MSG
    );
    return;
  }

  const lines = upcoming.slice(0, 5).map((u) => {
    const fee = u.entryFee > 0 ? ` · Entry: ${fmtMoney(u.entryFee)}` : '';
    return `📌 *${u.name}*\n   ${u.category}\n   📅 ${fmtRelativeDate(u.date)}${fee}`;
  });

  const more = upcoming.length > 5 ? `\n_+${upcoming.length - 5} more on the app_` : '';

  await send(waId,
    `📅 *Upcoming Tournaments*\n\n` +
    lines.join('\n\n') +
    more +
    `\n\n─────────────────\n` + MENU_MSG
  );
};

// ── Option 2: Performance & Streak ────────────────────────────────────────────

const calcStreak = (sessions) => {
  if (sessions.length === 0) return 0;
  const today = todayStr();
  const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();

  let streak = 0;
  let cursor = today;

  for (const d of dates) {
    if (d === cursor) {
      streak++;
      // move cursor back one day
      const prev = new Date(cursor);
      prev.setDate(prev.getDate() - 1);
      cursor = `${prev.getFullYear()}-${pad(prev.getMonth() + 1)}-${pad(prev.getDate())}`;
    } else if (d < cursor) {
      // gap — streak broken
      break;
    }
  }
  return streak;
};

const sendPerformanceAndStreak = async (session, waId) => {
  const today = todayStr();
  const weekAgo = new Date();
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth() + 1)}-${pad(weekAgo.getDate())}`;

  const [allSessions, allTournaments] = await Promise.all([
    Session.find({ userId: session.userId }).lean(),
    Tournament.find({ userId: session.userId }).lean(),
  ]);

  const recentSessions = allSessions.filter((s) => s.date >= weekAgoStr);

  // Streak
  const streak = calcStreak(allSessions);

  // Medals
  const medals = { Gold: 0, Silver: 0, Bronze: 0 };
  for (const t of allTournaments) {
    for (const cat of t.categories) {
      if (medals[cat.medal] !== undefined) medals[cat.medal]++;
    }
  }
  const totalMedals = medals.Gold + medals.Silver + medals.Bronze;

  if (recentSessions.length === 0 && allSessions.length === 0) {
    await send(waId,
      `📊 *Performance & Streak*\n\n` +
      `No sessions logged yet.\n\n` +
      `Start tracking your sessions at pickletracker.in! 🎯\n\n` +
      `─────────────────\n` + MENU_MSG
    );
    return;
  }

  // Recent performance
  let perfLines = '';
  if (recentSessions.length > 0) {
    const avgRating = (recentSessions.reduce((s, x) => s + x.rating, 0) / recentSessions.length).toFixed(1);

    const wellCount = {};
    const wrongCount = {};
    recentSessions.forEach((s) => {
      (s.wentWell || []).forEach((sk) => { wellCount[sk] = (wellCount[sk] || 0) + 1; });
      (s.wentWrong || []).forEach((sk) => { wrongCount[sk] = (wrongCount[sk] || 0) + 1; });
    });

    const topStrengths = Object.entries(wellCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([s]) => s);
    const topFocus = Object.entries(wrongCount).sort((a, b) => b[1] - a[1]).slice(0, 2).map(([s]) => s);

    perfLines =
      `*Last 7 days:*\n` +
      `🎯 Sessions: ${recentSessions.length}  ·  ⭐ Avg: ${avgRating}/5\n`;

    if (topStrengths.length > 0) perfLines += `✅ Strengths: ${topStrengths.join(', ')}\n`;
    if (topFocus.length > 0) perfLines += `🔧 Focus on: ${topFocus.join(', ')}\n`;
    perfLines += '\n';
  } else {
    perfLines = `_No sessions in the last 7 days._\n\n`;
  }

  // Streak line
  const streakLine = streak > 0
    ? `🔥 *Current streak:* ${streak} day${streak !== 1 ? 's' : ''}\n`
    : `💤 *Streak:* Not active — log a session today!\n`;

  // Medal line
  const medalLine = totalMedals > 0
    ? `🏅 *Career medals:* 🥇 ${medals.Gold}  🥈 ${medals.Silver}  🥉 ${medals.Bronze}\n`
    : `🏅 *Career medals:* None yet — keep competing!\n`;

  await send(waId,
    `📊 *Performance & Streak*\n\n` +
    perfLines +
    streakLine +
    medalLine +
    `\n─────────────────\n` + MENU_MSG
  );
};

// ── Option 3: Finance Summary ──────────────────────────────────────────────────

const sendFinanceSummary = async (session, waId) => {
  const now = new Date();
  const monthStr = `${now.getFullYear()}-${pad(now.getMonth() + 1)}`;
  const monthLabel = `${MONTH_NAMES[now.getMonth()]} ${now.getFullYear()}`;

  const [allTournaments, allSessions] = await Promise.all([
    Tournament.find({ userId: session.userId }).lean(),
    Session.find({ userId: session.userId }).lean(),
  ]);

  if (allTournaments.length === 0) {
    await send(waId,
      `💰 *Finance Summary*\n\n` +
      `No tournaments recorded yet.\n\n` +
      `Track your first tournament at pickletracker.in! 🏆\n\n` +
      `─────────────────\n` + MENU_MSG
    );
    return;
  }

  // This month
  const monthTournaments = allTournaments.filter((t) =>
    t.categories.some((c) => c.date?.startsWith(monthStr))
  );
  const monthEntryFees = monthTournaments.reduce(
    (s, t) => s + t.categories.filter((c) => c.date?.startsWith(monthStr)).reduce((a, c) => a + (c.entryFee || 0), 0), 0
  );
  const monthWinnings = monthTournaments.reduce(
    (s, t) => s + t.categories.filter((c) => c.date?.startsWith(monthStr)).reduce((a, c) => a + (c.prizeAmount || 0), 0), 0
  );
  const monthProfit = monthWinnings - monthEntryFees;
  const monthCourtFees = allSessions
    .filter((s) => s.date?.startsWith(monthStr))
    .reduce((s, x) => s + (x.courtFee || 0), 0);

  // Career
  const careerEntry = allTournaments.reduce((s, t) => s + t.categories.reduce((a, c) => a + (c.entryFee || 0), 0), 0);
  const careerWinnings = allTournaments.reduce((s, t) => s + t.categories.reduce((a, c) => a + (c.prizeAmount || 0), 0), 0);
  const careerProfit = careerWinnings - careerEntry;
  const careerCourtFees = allSessions.reduce((s, x) => s + (x.courtFee || 0), 0);

  let msg = `💰 *Finance Summary*\n\n`;

  // This month section
  msg += `*${monthLabel}:*\n`;
  if (monthTournaments.length === 0) {
    msg += `No tournaments this month.\n`;
  } else {
    msg +=
      `🏆 Tournaments: ${monthTournaments.length}\n` +
      `💸 Entry fees: ${fmtMoney(monthEntryFees)}\n` +
      `🏅 Winnings: ${fmtMoney(monthWinnings)}\n` +
      `📊 Net P/L: *${fmtProfit(monthProfit)}*\n`;
    if (monthCourtFees > 0) msg += `🏟️ Court fees: ${fmtMoney(monthCourtFees)}\n`;
  }

  // Career section
  msg +=
    `\n*Career totals:*\n` +
    `🏆 Tournaments: ${allTournaments.length}\n` +
    `💸 Total spent: ${fmtMoney(careerEntry)}\n` +
    `🏅 Total won: ${fmtMoney(careerWinnings)}\n` +
    `📊 Net P/L: *${fmtProfit(careerProfit)}*\n`;
  if (careerCourtFees > 0) msg += `🏟️ Court fees: ${fmtMoney(careerCourtFees)}\n`;

  msg += `\n─────────────────\n` + MENU_MSG;

  await send(waId, msg);
};

// ── Menu handler ───────────────────────────────────────────────────────────────

const handleMenu = async (session, text, waId) => {
  const t = text.trim().toLowerCase();

  if (t === '1' || t.includes('upcoming') || t.includes('tournament')) {
    await sendUpcomingTournaments(session, waId);
    return;
  }
  if (t === '2' || t.includes('performance') || t.includes('streak') || t.includes('session')) {
    await sendPerformanceAndStreak(session, waId);
    return;
  }
  if (t === '3' || t.includes('finance') || t.includes('summ') || t.includes('money') || t.includes('earn')) {
    await sendFinanceSummary(session, waId);
    return;
  }
  if (t === '4' || t.includes('help')) {
    await send(waId, HELP_MSG);
    return;
  }

  await send(waId, MENU_MSG);
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
      businessNumber: process.env.WHATSAPP_BUSINESS_NUMBER || null,
    });
  } catch (err) {
    next(err);
  }
};

exports.getDebug = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('_id email whatsappPhone').lean();
    const session = user?.whatsappPhone
      ? await WhatsAppSession.findOne({ waId: user.whatsappPhone }).select('waId userId state updatedAt').lean()
      : null;
    const phoneOwner = user?.whatsappPhone
      ? await User.findOne({ whatsappPhone: user.whatsappPhone }).select('_id email').lean()
      : null;

    res.json({
      success: true,
      config: {
        hasToken: Boolean(process.env.WHATSAPP_TOKEN),
        hasPhoneId: Boolean(process.env.WHATSAPP_PHONE_ID),
        hasVerifyToken: Boolean(process.env.WHATSAPP_VERIFY_TOKEN),
      },
      user: {
        id: user?._id || null,
        email: user?.email || null,
        whatsappPhoneMasked: maskPhone(user?.whatsappPhone),
      },
      session: session
        ? {
            waIdMasked: maskPhone(session.waId),
            userId: session.userId || null,
            state: session.state,
            updatedAt: session.updatedAt,
            linkedToCurrentUser: String(session.userId) === String(req.user.id),
          }
        : null,
      phoneOwner: phoneOwner
        ? { userId: phoneOwner._id, email: phoneOwner.email, isCurrentUser: String(phoneOwner._id) === String(req.user.id) }
        : null,
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

    await WhatsAppSession.deleteOne({ userId: req.user.id });
    await User.updateOne({ whatsappPhone: waId, _id: { $ne: req.user.id } }, { whatsappPhone: null });
    await User.findByIdAndUpdate(req.user.id, updateFields);

    await WhatsAppSession.findOneAndUpdate(
      { waId },
      { waId, userId: req.user.id, state: 'MENU', context: {}, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.json({ success: true, businessNumber: process.env.WHATSAPP_BUSINESS_NUMBER || null });
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

const sendTournamentReminders = async () => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = `${tomorrow.getFullYear()}-${pad(tomorrow.getMonth() + 1)}-${pad(tomorrow.getDate())}`;

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
        lines.push(`🏆 *${t.name}* — ${cat.categoryName}`);
        if (cat.entryFee > 0) lines.push(`   Entry fee: ${fmtMoney(cat.entryFee)}`);
      }
    }

    const msg =
      `🔔 *Tournament Tomorrow!*\n\n` +
      `Hi *${user.name}*! You have a tournament tomorrow (${fmtDate(tomorrowStr)}):\n\n` +
      lines.join('\n') +
      `\n\nGood luck! 🏆\nCheck your schedule at pickletracker.in`;

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

const sendWeeklyInsights = async () => {
  const now = new Date();
  const weekAgo = new Date(now);
  weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth() + 1)}-${pad(weekAgo.getDate())}`;

  const users = await User.find({ whatsappPhone: { $ne: null } }).select('_id whatsappPhone name').lean();

  let sent = 0;
  for (const user of users) {
    const sessions = await Session.find({ userId: user._id, date: { $gte: weekAgoStr } }).lean();
    if (sessions.length === 0) continue;

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
      `📈 *Weekly Pickleball Insights*\n\n` +
      `Hi *${user.name}*! Here's your last 7 days:\n\n` +
      `🎯 Sessions: ${sessions.length}  ·  ⭐ Avg: ${avgRating}/5\n`;
    if (courtFees > 0) msg += `🏟️ Court fees: ${fmtMoney(courtFees)}\n`;
    if (topStrengths.length > 0) msg += `\n✅ *Top strengths:*\n${topStrengths.map((s) => `• ${s}`).join('\n')}\n`;
    if (topFocus.length > 0) msg += `\n🔧 *Focus areas:*\n${topFocus.map((s) => `• ${s}`).join('\n')}\n`;
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
  console.log(`[WA] Incoming text from ${maskPhone(waId)}: "${text}"`);
  let session = await WhatsAppSession.findOne({ waId });

  if (!session) {
    const linkedUser = await User.findOne({ whatsappPhone: waId }).select('_id name').lean();
    if (linkedUser) {
      console.log(`[WA] No session found; auto-linking by whatsappPhone for user ${linkedUser._id}`);
      session = await WhatsAppSession.create({
        waId,
        userId: linkedUser._id,
        state: 'MENU',
        context: {},
      });
      const sendRes = await send(waId,
        `👋 Hi *${linkedUser.name}*! Welcome to PickleTracker on WhatsApp! 🏓\n\n` +
        MENU_MSG
      );
      console.log('[WA] Welcome message send result:', sendRes);
      return;
    }

    console.log('[WA] No session and no linked user found for incoming waId');
    const sendRes = await send(waId,
      `👋 Welcome to *PickleTracker*! 🏓\n\n` +
      `To connect WhatsApp, please visit your profile on pickletracker.in and enter your phone number there.`
    );
    console.log('[WA] Not-linked response send result:', sendRes);
    return;
  }

  session.updatedAt = new Date();
  const t = text.trim().toLowerCase();

  if (GLOBAL_COMMANDS.has(t)) {
    if (!session.userId) {
      await session.save();
      const sendRes = await send(waId, `Please connect your WhatsApp from the PickleTracker app at pickletracker.in`);
      console.log('[WA] Session without user; connect prompt send result:', sendRes);
      return;
    }
    session.state = 'MENU';
    session.context = {};
    await session.save();
    const sendRes = await send(waId, MENU_MSG);
    console.log('[WA] Global command menu send result:', sendRes);
    return;
  }

  if (!session.userId) {
    const sendRes = await send(waId, `Please connect your WhatsApp from the PickleTracker app at pickletracker.in`);
    console.log('[WA] Session user missing; connect prompt send result:', sendRes);
    return;
  }

  session.state = 'MENU';
  await session.save();
  await handleMenu(session, text, waId);
};

// ── Webhook controllers ────────────────────────────────────────────────────────

exports.verify = (req, res) => {
  const mode      = req.query['hub.mode'];
  const token     = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return res.status(200).send(challenge);
  }
  res.status(403).send('Forbidden');
};

exports.webhook = async (req, res) => {
  res.status(200).send('OK');

  try {
    const message = req.body?.entry?.[0]?.changes?.[0]?.value?.messages?.[0];
    if (!message) {
      console.log('[WA webhook] No message payload');
      return;
    }
    if (message.type !== 'text') {
      console.log(`[WA webhook] Ignored non-text message type: ${message.type}`);
      return;
    }

    const waId = message.from;
    const text = message.text?.body?.trim();
    if (!waId || !text) {
      console.log('[WA webhook] Missing sender id or text body');
      return;
    }

    await processMessage(waId, text);
  } catch (err) {
    console.error('[WhatsApp webhook] Unhandled error:', err);
  }
};
