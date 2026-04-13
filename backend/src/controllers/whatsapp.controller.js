const WhatsAppSession = require('../models/WhatsAppSession');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const { CATEGORIES } = require('../models/Tournament');
const { send } = require('../services/whatsapp.service');

// ── Category helpers ───────────────────────────────────────────────────────────

// Numbered list shown to users (most common categories)
const MENU_CATEGORIES = [
  "Men's Singles Open",
  "Women's Singles",
  "Men's Doubles Open",
  "Women's Doubles",
  "Mixed Doubles",
  "Beginner Men's Singles",
  "Beginner Women's Singles",
  "Beginner Mixed Doubles",
  "Intermediate Men's Singles",
  "Intermediate Women's Singles",
  "Intermediate Mixed Doubles",
  "Advanced Men's Singles",
];

const CATEGORY_MENU_MSG =
  `Choose a category:\n` +
  MENU_CATEGORIES.map((c, i) => `${i + 1}. ${c}`).join('\n') +
  `\n\nOr type a name to search (e.g. "beginner mixed", "50+ singles").`;

/**
 * Match user input to a category.
 * Returns { exact, choices } — one of them will be non-null.
 */
const matchCategory = (input) => {
  const t = input.trim().toLowerCase();

  // Number from the MENU_CATEGORIES list
  const num = parseInt(t);
  if (!isNaN(num) && num >= 1 && num <= MENU_CATEGORIES.length) {
    return { exact: MENU_CATEGORIES[num - 1], choices: null };
  }

  // Text search across all 68 categories
  const matches = CATEGORIES.filter((c) => c.toLowerCase().includes(t));
  if (matches.length === 1) return { exact: matches[0], choices: null };
  if (matches.length > 1) return { exact: null, choices: matches.slice(0, 8) };
  return { exact: null, choices: null };
};

// ── Date helpers ───────────────────────────────────────────────────────────────

const MONTHS = {
  jan: 1, january: 1, feb: 2, february: 2, mar: 3, march: 3,
  apr: 4, april: 4, may: 5, jun: 6, june: 6, jul: 7, july: 7,
  aug: 8, august: 8, sep: 9, september: 9, oct: 10, october: 10,
  nov: 11, november: 11, dec: 12, december: 12,
};

const pad = (n) => String(n).padStart(2, '0');

const parseDate = (text) => {
  const t = text.trim().toLowerCase();
  const now = new Date();
  const year = now.getFullYear();

  if (t === 'today') return `${year}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  if (t === 'yesterday') {
    const d = new Date(now); d.setDate(d.getDate() - 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }
  if (t === 'tomorrow') {
    const d = new Date(now); d.setDate(d.getDate() + 1);
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
  }

  // Already ISO: 2026-04-12
  if (/^\d{4}-\d{2}-\d{2}$/.test(t)) return t;

  // "12 apr" / "12 april 2026"
  const m1 = t.match(/^(\d{1,2})\s+([a-z]+)(?:\s+(\d{4}))?$/);
  if (m1) {
    const day = parseInt(m1[1]);
    const month = MONTHS[m1[2]];
    const y = m1[3] ? parseInt(m1[3]) : year;
    if (month && day >= 1 && day <= 31) return `${y}-${pad(month)}-${pad(day)}`;
  }

  // "apr 12" / "april 12 2026"
  const m2 = t.match(/^([a-z]+)\s+(\d{1,2})(?:\s+(\d{4}))?$/);
  if (m2) {
    const month = MONTHS[m2[1]];
    const day = parseInt(m2[2]);
    const y = m2[3] ? parseInt(m2[3]) : year;
    if (month && day >= 1 && day <= 31) return `${y}-${pad(month)}-${pad(day)}`;
  }

  return null;
};

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
  `1️⃣ Add Tournament\n` +
  `2️⃣ View Summary\n` +
  `3️⃣ Help\n\n` +
  `Reply with a number.`;

const HELP_MSG =
  `*PickleTracker Help* 🏓\n\n` +
  `*Commands (any time):*\n` +
  `• *menu* or *cancel* — go back to main menu\n\n` +
  `*Adding a tournament:*\n` +
  `I'll ask you step by step:\n` +
  `1. Tournament name\n` +
  `2. Category (e.g. Men's Singles, Mixed Doubles)\n` +
  `3. Date you played\n` +
  `4. Your entry fee\n` +
  `5. Medal won (if any)\n` +
  `6. Prize amount (if you won)\n\n` +
  `You can add multiple categories per tournament.\n\n` +
  `Type *1* from the menu to get started.`;

// ── Conversation helpers ───────────────────────────────────────────────────────

const emptyCategory = () => ({
  categoryName: null,
  date: null,
  entryFee: null,
  medal: null,
  prizeAmount: 0,
});

const emptyTournamentContext = () => ({
  tournament: { name: '', categories: [] },
  currentCat: emptyCategory(),
  categoryChoices: null,
});

// ── State handlers ─────────────────────────────────────────────────────────────

const handleLinkEmail = async (session, text, waId) => {
  const email = text.trim().toLowerCase();
  if (!email.includes('@') || !email.includes('.')) {
    await send(waId, `Please send your PickleTracker account email address.\n\nExample: _you@gmail.com_`);
    return;
  }

  const user = await User.findOne({ email });
  if (!user) {
    await send(waId, `❌ No account found for *${email}*.\n\nPlease check the email and try again, or sign up at pickletracker.app first.`);
    return;
  }

  session.userId = user._id;
  session.state = 'MENU';
  session.context = {};
  await session.save();

  await send(waId, `✅ Account linked! Welcome, *${user.name}*! 🎉\n\n${MENU_MSG}`);
};

const handleMenu = async (session, text, waId) => {
  const t = text.trim().toLowerCase();

  if (t === '1' || t.includes('add') || t.includes('tournament')) {
    session.state = 'ADD_NAME';
    session.context = emptyTournamentContext();
    await session.save();
    await send(waId, `🏆 *Add Tournament*\n\nWhat is the tournament name?`);
    return;
  }

  if (t === '2' || t.includes('summ') || t.includes('view') || t.includes('stat')) {
    await sendSummary(session, waId);
    return;
  }

  if (t === '3' || t.includes('help')) {
    await send(waId, HELP_MSG);
    return;
  }

  await send(waId, MENU_MSG);
};

const handleAddName = async (session, text, waId) => {
  const name = text.trim();
  if (name.length < 2) {
    await send(waId, `Please enter a valid tournament name (e.g. _Hyderabad Open_).`);
    return;
  }

  session.context.tournament.name = name;
  session.state = 'ADD_CATEGORY';
  session.context.categoryChoices = null;
  await session.save();

  await send(waId, `🏆 *${name}*\n\n${CATEGORY_MENU_MSG}`);
};

const handleAddCategory = async (session, text, waId) => {
  const t = text.trim();

  // If showing a narrowed-down choices list, handle number from that list
  if (session.context.categoryChoices?.length > 0) {
    const num = parseInt(t);
    if (!isNaN(num) && num >= 1 && num <= session.context.categoryChoices.length) {
      const chosen = session.context.categoryChoices[num - 1];
      session.context.currentCat.categoryName = chosen;
      session.context.categoryChoices = null;
      session.state = 'ADD_DATE';
      await session.save();
      await send(waId, `✅ *${chosen}*\n\nWhat date did you play?\n\nExamples: _12 Apr_, _April 12_, _today_, _yesterday_`);
      return;
    }
    // Fall through to fresh search if not a valid number
  }

  const { exact, choices } = matchCategory(t);

  if (exact) {
    session.context.currentCat.categoryName = exact;
    session.context.categoryChoices = null;
    session.state = 'ADD_DATE';
    await session.save();
    await send(waId, `✅ *${exact}*\n\nWhat date did you play?\n\nExamples: _12 Apr_, _April 12_, _today_, _yesterday_`);
    return;
  }

  if (choices?.length > 0) {
    session.context.categoryChoices = choices;
    await session.save();
    const list = choices.map((c, i) => `${i + 1}. ${c}`).join('\n');
    await send(waId, `Found multiple matches:\n${list}\n\nReply with the number.`);
    return;
  }

  await send(waId, `Couldn't find that category. Please try again.\n\n${CATEGORY_MENU_MSG}`);
};

const handleAddDate = async (session, text, waId) => {
  const date = parseDate(text);
  if (!date) {
    await send(waId,
      `Could not understand that date. Please try again.\n\n` +
      `Examples: _12 Apr_, _April 12_, _2026-04-12_, _today_, _yesterday_`
    );
    return;
  }

  session.context.currentCat.date = date;
  session.state = 'ADD_ENTRY_FEE';
  await session.save();

  await send(waId, `📅 *${fmtDate(date)}*\n\nWhat was your entry fee? (₹)\n\nType _0_ if it was free.`);
};

const handleAddEntryFee = async (session, text, waId) => {
  const fee = parseInt(text.replace(/[₹,\s]/g, ''));
  if (isNaN(fee) || fee < 0) {
    await send(waId, `Please enter a valid entry fee (e.g. _700_). Type _0_ for free entry.`);
    return;
  }

  session.context.currentCat.entryFee = fee;
  session.state = 'ADD_MEDAL';
  await session.save();

  await send(waId, `Did you win a medal?\n\n1. 🥇 Gold\n2. 🥈 Silver\n3. 🥉 Bronze\n4. No medal`);
};

const handleAddMedal = async (session, text, waId) => {
  const t = text.trim().toLowerCase();
  let medal = null;

  if (t === '1' || t === 'gold') medal = 'Gold';
  else if (t === '2' || t === 'silver') medal = 'Silver';
  else if (t === '3' || t === 'bronze') medal = 'Bronze';
  else if (t === '4' || t.includes('no') || t === 'none' || t === '0') medal = 'None';

  if (!medal) {
    await send(waId, `Please reply with:\n1 for Gold\n2 for Silver\n3 for Bronze\n4 for No medal`);
    return;
  }

  session.context.currentCat.medal = medal;

  if (medal === 'None') {
    session.context.currentCat.prizeAmount = 0;
    await finishCategory(session, waId);
  } else {
    const emoji = medal === 'Gold' ? '🥇' : medal === 'Silver' ? '🥈' : '🥉';
    session.state = 'ADD_PRIZE';
    await session.save();
    await send(waId, `${emoji} *${medal}!* Congratulations!\n\nHow much prize money did you win? (₹)`);
  }
};

const handleAddPrize = async (session, text, waId) => {
  const prize = parseInt(text.replace(/[₹,\s]/g, ''));
  if (isNaN(prize) || prize <= 0) {
    await send(waId, `Please enter the prize amount (e.g. _3000_).`);
    return;
  }

  session.context.currentCat.prizeAmount = prize;
  await finishCategory(session, waId);
};

const finishCategory = async (session, waId) => {
  const cat = { ...session.context.currentCat };
  session.context.tournament.categories.push(cat);
  session.context.currentCat = emptyCategory();
  session.context.categoryChoices = null;
  session.state = 'ADD_ANOTHER';
  await session.save();

  const profit = cat.prizeAmount - cat.entryFee;
  const medalStr = cat.medal !== 'None' ? ` 🏅 ${cat.medal}` : '';

  await send(waId,
    `✅ *Category added:*\n` +
    `${cat.categoryName}${medalStr}\n` +
    `📅 ${fmtDate(cat.date)}\n` +
    `💰 Entry: ${fmtMoney(cat.entryFee)} | Won: ${fmtMoney(cat.prizeAmount)} | P/L: ${fmtProfit(profit)}\n\n` +
    `Add another category for *${session.context.tournament.name}*?\n\n` +
    `1. Yes, add another category\n` +
    `2. No, save tournament`
  );
};

const handleAddAnother = async (session, text, waId) => {
  const t = text.trim().toLowerCase();

  if (t === '1' || t === 'yes' || t === 'y') {
    session.state = 'ADD_CATEGORY';
    session.context.categoryChoices = null;
    await session.save();
    await send(waId, `Adding another category for *${session.context.tournament.name}*.\n\n${CATEGORY_MENU_MSG}`);
    return;
  }

  if (t === '2' || t === 'no' || t === 'n') {
    await saveTournament(session, waId);
    return;
  }

  await send(waId, `Please reply *1* to add another category, or *2* to save the tournament.`);
};

// ── Tournament save & summary ──────────────────────────────────────────────────

const saveTournament = async (session, waId) => {
  const { tournament } = session.context;

  try {
    const doc = await Tournament.create({
      userId: session.userId,
      name: tournament.name,
      categories: tournament.categories.map((c) => ({
        categoryName: c.categoryName,
        date: c.date,
        medal: c.medal,
        entryFee: c.entryFee,
        prizeAmount: c.prizeAmount,
      })),
    });

    const totalProfit = doc.categories.reduce((s, c) => s + (c.prizeAmount - c.entryFee), 0);

    const catLines = doc.categories.map((c) => {
      const p = c.prizeAmount - c.entryFee;
      const medal = c.medal !== 'None' ? ` 🏅 ${c.medal}` : '';
      return `• ${c.categoryName}${medal} — ${fmtDate(c.date)} — ${fmtProfit(p)}`;
    }).join('\n');

    session.state = 'MENU';
    session.context = {};
    await session.save();

    await send(waId,
      `✅ *Tournament Saved!*\n\n` +
      `🏆 *${tournament.name}*\n` +
      `${catLines}\n\n` +
      `📊 Total P/L: *${fmtProfit(totalProfit)}*\n\n` +
      `─────────────────\n` +
      MENU_MSG
    );
  } catch (err) {
    console.error('[WhatsApp] Save tournament error:', err.message);
    await send(waId,
      `❌ Something went wrong saving the tournament.\n\n` +
      `Please try again or type *cancel* to go back to the menu.`
    );
  }
};

const sendSummary = async (session, waId) => {
  const [recent, all] = await Promise.all([
    Tournament.find({ userId: session.userId }).sort({ createdAt: -1 }).limit(5).lean(),
    Tournament.find({ userId: session.userId }).lean(),
  ]);

  if (all.length === 0) {
    await send(waId,
      `📊 *Your Summary*\n\nNo tournaments yet.\n\nType *1* to add your first tournament!\n\n${MENU_MSG}`
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

/**
 * Normalise an Indian mobile number to 12-digit waId format (91XXXXXXXXXX).
 * Returns null if the input is not a valid Indian mobile number.
 */
const normalisePhone = (input) => {
  const digits = input.replace(/\D/g, '');
  if (digits.length === 10 && /^[6-9]/.test(digits)) return `91${digits}`;
  if (digits.length === 12 && /^91[6-9]/.test(digits)) return digits;
  return null;
};

// ── App-side connect / disconnect / status ─────────────────────────────────────

exports.getStatus = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('whatsappPhone').lean();
    res.json({ connected: !!user?.whatsappPhone, phone: user?.whatsappPhone || null });
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

    // Remove any existing session for this user (changing number)
    await WhatsAppSession.deleteOne({ userId: req.user.id });

    // If another user already linked this number, unlink them first
    await User.updateOne({ whatsappPhone: waId, _id: { $ne: req.user.id } }, { whatsappPhone: null });

    // Link number on the User record (persistent — survives session expiry)
    await User.findByIdAndUpdate(req.user.id, { whatsappPhone: waId });

    // Create fresh session so the user lands straight on the menu
    await WhatsAppSession.findOneAndUpdate(
      { waId },
      { waId, userId: req.user.id, state: 'MENU', context: {}, updatedAt: new Date() },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    // Send welcome message
    const user = await User.findById(req.user.id).select('name').lean();
    await send(waId,
      `👋 Hi *${user.name}*! Welcome to PickleTracker! 🏓\n\n` +
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

// ── Main message processor ─────────────────────────────────────────────────────

const GLOBAL_COMMANDS = new Set(['menu', 'cancel', 'hi', 'hello', 'start', '/start']);

const processMessage = async (waId, text) => {
  let session = await WhatsAppSession.findOne({ waId });

  // No session — check if this number is linked via the app (session may have expired)
  if (!session) {
    const linkedUser = await User.findOne({ whatsappPhone: waId }).select('_id name').lean();
    if (linkedUser) {
      // Auto-restore session — user connected via app, greet and show menu
      session = await WhatsAppSession.create({
        waId,
        userId: linkedUser._id,
        state: 'MENU',
        context: {},
      });
      await send(waId,
        `👋 Hi *${linkedUser.name}*! Welcome to PickleTracker! 🏓\n\n` +
        MENU_MSG
      );
      return;
    }

    // Truly unknown — ask for email (fallback for users who haven't used the app)
    await WhatsAppSession.create({ waId, state: 'LINK_EMAIL' });
    await send(waId,
      `👋 Welcome to *PickleTracker*! 🏓\n\n` +
      `Track your pickleball tournaments and earnings right from WhatsApp.\n\n` +
      `To get started, please send the email address linked to your PickleTracker account.`
    );
    return;
  }

  // Update TTL timestamp on every interaction
  session.updatedAt = new Date();

  const t = text.trim().toLowerCase();

  // Global commands — reset to menu (or prompt re-link if not linked)
  if (GLOBAL_COMMANDS.has(t)) {
    if (!session.userId) {
      await session.save();
      await send(waId, `Please send your PickleTracker account email address to link your account.`);
      return;
    }
    const wasCancelling = session.state !== 'MENU';
    session.state = 'MENU';
    session.context = {};
    await session.save();
    await send(waId, wasCancelling && t === 'cancel' ? `❌ Action cancelled.\n\n${MENU_MSG}` : MENU_MSG);
    return;
  }

  // Account not linked yet — try to link with provided text as email
  if (!session.userId) {
    await handleLinkEmail(session, text, waId);
    return;
  }

  // Route to state handler
  switch (session.state) {
    case 'MENU':          return handleMenu(session, text, waId);
    case 'ADD_NAME':      return handleAddName(session, text, waId);
    case 'ADD_CATEGORY':  return handleAddCategory(session, text, waId);
    case 'ADD_DATE':      return handleAddDate(session, text, waId);
    case 'ADD_ENTRY_FEE': return handleAddEntryFee(session, text, waId);
    case 'ADD_MEDAL':     return handleAddMedal(session, text, waId);
    case 'ADD_PRIZE':     return handleAddPrize(session, text, waId);
    case 'ADD_ANOTHER':   return handleAddAnother(session, text, waId);
    default:
      session.state = 'MENU';
      await session.save();
      await send(waId, MENU_MSG);
  }
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
