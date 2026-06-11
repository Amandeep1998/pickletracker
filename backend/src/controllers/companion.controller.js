const Tournament = require('../models/Tournament');
const User = require('../models/User');
const Expense = require('../models/Expense');
const llm = require('../services/llm.service');
const { runTournamentParse } = require('./ai.controller');
const { DEFAULT_SPORT } = require('../config/sports');
const { CATEGORIES, parsePhraseToFacets, nextNarrowing } = require('../config/categories');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const today = () => new Date().toISOString().split('T')[0];

/** "2026-05-24" → "May 24". Bad/empty input → null. */
const fmtDate = (iso) => {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [, m, d] = iso.split('-');
  return `${MONTHS[parseInt(m, 10) - 1]} ${parseInt(d, 10)}`;
};

/** Collapse a set of category dates into one human label, e.g. "May 10–11". */
const fmtDateRange = (dates) => {
  const valid = [...new Set(dates.filter(Boolean))].sort();
  if (valid.length === 0) return null;
  if (valid.length === 1) return fmtDate(valid[0]);
  const lo = fmtDate(valid[0]);
  const hi = fmtDate(valid[valid.length - 1]);
  // Same month → "May 10–11", else "May 10 – Jun 2"
  const [loMon] = (lo || '').split(' ');
  const [hiMon, hiDay] = (hi || '').split(' ');
  return loMon === hiMon ? `${lo}–${hiDay}` : `${lo} – ${hi}`;
};

/**
 * Shape the raw LLM parse into:
 *   preview  — TournamentPreviewCard data (display only)
 *   payload  — body for POST /api/tournaments (the confirm writes this verbatim)
 *
 * Missing fields are passed through as-is (null), so the existing Joi validator
 * on /api/tournaments is the single source of truth for what's loggable —
 * a confirm that's missing a date / prize comes back 400 and the chat re-asks.
 */
const buildFromParse = (parsed) => {
  const cats = parsed.categories || [];
  const anyResult = cats.some((c) => c.medal && c.medal !== 'None');
  const hasFuture = cats.some((c) => c.date && c.date > today());
  const status = anyResult ? 'completed' : hasFuture ? 'upcoming' : 'completed';

  // Travel costs (optional) — one block per trip, mirrors the form's separate
  // 'travel' Expense doc. Sum the line items; only surface when > 0.
  const te = parsed.travelExpense;
  const travelTotal = te
    ? te.transport + te.localCommute + te.accommodation + te.food +
      te.equipment + te.others + te.visaDocs + te.travelInsurance
    : 0;
  const travel = te && travelTotal > 0 ? { ...te, total: travelTotal } : null;

  const preview = {
    name: parsed.name || null,
    dates: fmtDateRange(cats.map((c) => c.date)),
    venue: parsed.locationQuery || null,
    status,
    travelTotal: travel ? travelTotal : 0,
    categories: cats.map((c) => ({
      format: c.categoryName || '(needs detail)',
      level: null,
      partner: c.partnerName || null,
      date: c.date || null,
      entryFee: c.entryFee != null ? c.entryFee : null,
      prizeAmount: c.prizeAmount != null ? c.prizeAmount : null,
      result: c.medal != null ? { type: 'medal', value: c.medal === 'None' ? null : c.medal } : null,
    })),
  };

  const payload = {
    name: parsed.name || '',
    sport: DEFAULT_SPORT,
    location: parsed.locationQuery ? { name: parsed.locationQuery } : undefined,
    categories: cats.map((c) => {
      const medal = c.medal || 'None';
      const won = medal !== 'None';
      return {
        categoryName: c.categoryName || null,
        date: c.date || null,
        medal,
        entryFee: c.entryFee != null ? c.entryFee : 0,
        prizeAmount: won ? (c.prizeAmount != null ? c.prizeAmount : null) : 0,
        partnerName: '',
      };
    }),
  };

  // Turn each LLM ambiguity into a deterministic hybrid category-picker step,
  // driven by the canonical list (NOT the LLM's capped option guess). The
  // user's raw words ("doubles", "men's doubles", "50+") → facets → either the
  // full set of matching categories (flat) or the next narrowing question.
  const ambiguities = (parsed.ambiguities || []).map((a) => {
    const facets = parsePhraseToFacets(a.partial || a.question || '');
    const step = nextNarrowing(facets);
    return {
      categoryIndex: typeof a.categoryIndex === 'number' ? a.categoryIndex : 0,
      facets,
      done: step.done,
      question: step.question,
      options: step.options,
    };
  });

  return { preview, payload, travel, ambiguities };
};

/**
 * POST /api/companion/parse  { transcript, currentForm }
 * Free-text → preview card + ready-to-confirm payload + any ambiguities.
 */
exports.parse = async (req, res, next) => {
  try {
    const { transcript, currentForm } = req.body;
    const parsed = await runTournamentParse(transcript, currentForm);
    return res.json({ success: true, data: { ...buildFromParse(parsed), raw: parsed } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    if (err.code && err.code.startsWith('LLM_')) {
      return res.status(502).json({ success: false, message: 'AI service failed to respond' });
    }
    next(err);
  }
};

// Gear-expense categories — mirrors the form's GEAR_CATEGORIES.
const GEAR_CATEGORIES = ['Paddle', 'Shoes', 'Balls', 'Bag', 'Grip tape', 'Apparel', 'Accessories', 'Other'];

const buildGearPrompt = (today) => `
You extract a single pickleball GEAR purchase from a player's message into JSON only.
Today is ${today}.

Valid categories: ${GEAR_CATEGORIES.map((c) => `"${c}"`).join(', ')}.

Return JSON:
{ "title": string|null, "amount": number|null, "date": "YYYY-MM-DD"|null, "category": string|null }

Rules:
- "title": the item bought, short and human (e.g. "Selkirk paddle", "court shoes"). If none stated, null.
- "amount": price in INR as a number, no symbols ("4.5k" → 4500, "₹4,500" → 4500). If none stated, null.
- "date": resolve relative dates against today; if none stated, null.
- "category": the closest match from the valid list, else "Other"; null only if no item at all.
- Never invent a price. Output JSON only.
`.trim();

/**
 * POST /api/companion/parse-gear  { transcript }
 * Free-text → gear-expense preview + ready-to-confirm createExpense payload.
 * The write still goes through the authed POST /api/expenses, which the Joi
 * validator gates (title + amount + date required), so missing fields come back
 * as null here and the chat asks for them before confirming.
 */
exports.parseGear = async (req, res, next) => {
  try {
    const transcript = typeof req.body?.transcript === 'string' ? req.body.transcript.trim() : '';
    if (!transcript) return res.status(400).json({ success: false, message: 'Message is required' });
    if (transcript.length > 2000) return res.status(400).json({ success: false, message: 'Message too long' });
    if (!llm.isConfigured()) return res.status(503).json({ success: false, message: 'AI service is not configured' });

    const t0 = today();
    const { data: r } = await llm.chatJSON({ system: buildGearPrompt(t0), user: transcript, maxTokens: 200 });

    const title = typeof r?.title === 'string' && r.title.trim() ? r.title.trim().slice(0, 100) : null;
    const amount = Number.isFinite(r?.amount) && r.amount > 0 ? Math.round(r.amount) : null;
    const date = typeof r?.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(r.date) ? r.date : t0;
    const category = GEAR_CATEGORIES.includes(r?.category) ? r.category : (title ? 'Other' : null);

    const preview = { title, amount, date, dateLabel: fmtDate(date), category };
    const payload = { type: 'gear', title: title || '', amount: amount || 0, date };
    return res.json({ success: true, data: { preview, payload } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    if (err.code && err.code.startsWith('LLM_')) {
      return res.status(502).json({ success: false, message: 'AI service failed to respond' });
    }
    next(err);
  }
};

/**
 * POST /api/companion/category-options  { facets }
 * Stateless next step for the progressive category picker. The chat UI sends
 * the facets gathered so far (after each chip tap) and gets back either the
 * final category chips or the next narrowing question. Deterministic, no LLM.
 */
exports.categoryOptions = (req, res) => {
  const f = req.body?.facets;
  const facets = f && typeof f === 'object' && !Array.isArray(f) ? f : {};
  const step = nextNarrowing(facets);
  return res.json({ success: true, data: step });
};

/**
 * GET /api/companion/categories
 * The full canonical category enum — used by the editor's category dropdown.
 */
exports.categoryList = (req, res) => res.json({ success: true, data: CATEGORIES });

/**
 * GET /api/companion/me/card
 * Real PlayerCardPeek data for the logged-in user (logged tournaments +
 * manual achievements, mirroring the players directory tally).
 */
exports.myCard = async (req, res, next) => {
  try {
    const [user, tournaments] = await Promise.all([
      User.findById(req.user.id).select('name profilePhoto manualAchievements').lean(),
      Tournament.find({ userId: req.user.id }).select('name location categories').lean(),
    ]);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    const medals = { gold: 0, silver: 0, bronze: 0 };
    const bump = (m) => {
      if (m === 'Gold') medals.gold++;
      else if (m === 'Silver') medals.silver++;
      else if (m === 'Bronze') medals.bronze++;
    };

    // Tournament history: only categories where a medal was won. One row per
    // medal-winning category, newest first. Manual achievements fold in too.
    const history = [];
    for (const t of tournaments) {
      (t.categories || []).forEach((c, categoryIndex) => {
        if (c.medal && c.medal !== 'None') {
          bump(c.medal);
          history.push({
            tournament: t.name || 'Tournament',
            category: c.categoryName || '',
            medal: c.medal,
            date: c.date || null,
            venue: t.location?.name || null,
            source: 'tournament',
            tournamentId: String(t._id),
            categoryIndex,
          });
        }
      });
    }
    (user.manualAchievements || []).forEach((a, manualIndex) => {
      bump(a.medal);
      history.push({
        tournament: a.tournamentName || 'Tournament',
        category: a.categoryName || '',
        medal: a.medal,
        date: a.date || null,
        venue: null,
        source: 'manual',
        manualIndex,
      });
    });
    history.sort((x, y) => (String(y.date || '') > String(x.date || '') ? 1 : -1));

    const totalMedals = medals.gold + medals.silver + medals.bronze;
    const player = {
      name: user.name || 'You',
      profilePhoto: user.profilePhoto || null,
      medals,
      totalMedals,
      tournaments: tournaments.length,
      history,
    };
    return res.json({ success: true, data: player });
  } catch (err) {
    next(err);
  }
};

const MEDAL_VALUES = ['None', 'Gold', 'Silver', 'Bronze'];
const isISODate = (d) => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d);

/**
 * PATCH /api/companion/me/medals
 * Update a single medal entry from the player card, in place. The card history
 * mixes two sources, so the body must name which one:
 *
 *   { source: 'tournament', tournamentId, categoryIndex, medal?, categoryName?, date? }
 *   { source: 'manual', manualIndex, medal?, categoryName?, tournamentName?, date? }
 *
 * Only the provided fields are changed. Setting a tournament category's medal to
 * 'None' drops it from the card (it's no longer a win) but keeps the category.
 * Manual achievements have no 'None' — clearing one means deleting the row, which
 * this endpoint does not do (use the manual-achievement delete path for that).
 */
exports.updateMedal = async (req, res, next) => {
  try {
    const b = req.body || {};
    const source = b.source;

    if (b.medal != null && !MEDAL_VALUES.includes(b.medal)) {
      return res.status(400).json({ success: false, message: 'Invalid medal' });
    }
    if (b.date != null && b.date !== '' && !isISODate(b.date)) {
      return res.status(400).json({ success: false, message: 'Date must be YYYY-MM-DD' });
    }

    if (source === 'tournament') {
      const idx = Number(b.categoryIndex);
      if (!b.tournamentId || !Number.isInteger(idx) || idx < 0) {
        return res.status(400).json({ success: false, message: 'tournamentId and categoryIndex are required' });
      }
      const t = await Tournament.findOne({ _id: b.tournamentId, userId: req.user.id });
      if (!t) return res.status(404).json({ success: false, message: 'Tournament not found' });
      const cat = t.categories?.[idx];
      if (!cat) return res.status(404).json({ success: false, message: 'Category not found' });

      if (b.medal != null) cat.medal = b.medal;
      if (b.date != null && b.date !== '') cat.date = b.date;
      if (b.categoryName != null) {
        if (!CATEGORIES.includes(b.categoryName)) {
          return res.status(400).json({ success: false, message: 'Invalid category' });
        }
        cat.categoryName = b.categoryName;
      }
      await t.save();
      return res.json({ success: true });
    }

    if (source === 'manual') {
      const idx = Number(b.manualIndex);
      if (!Number.isInteger(idx) || idx < 0) {
        return res.status(400).json({ success: false, message: 'manualIndex is required' });
      }
      const user = await User.findById(req.user.id);
      if (!user) return res.status(404).json({ success: false, message: 'User not found' });
      const a = user.manualAchievements?.[idx];
      if (!a) return res.status(404).json({ success: false, message: 'Achievement not found' });

      // Manual medals are strictly podium — 'None' is not a valid value here.
      if (b.medal != null) {
        if (b.medal === 'None') {
          return res.status(400).json({ success: false, message: 'Manual achievement medal cannot be None' });
        }
        a.medal = b.medal;
      }
      if (b.date != null && b.date !== '') a.date = b.date;
      if (b.categoryName != null) a.categoryName = b.categoryName;
      if (b.tournamentName != null) a.tournamentName = b.tournamentName;
      await user.save();
      return res.json({ success: true });
    }

    return res.status(400).json({ success: false, message: "source must be 'tournament' or 'manual'" });
  } catch (err) {
    next(err);
  }
};

// Canonical shot/skill tags — mirrors SKILL_TAGS in the frontend forms + card.
const SKILL_TAGS = [
  'Serve', 'Return of serve', 'Third shot drop', 'Third shot drive',
  'Dinking', 'Backhand', 'Forehand', 'Volleys', 'Lob', 'Reset',
  'Poaching', 'Speed-up', 'Erne', 'Drop shot', 'Kitchen play',
  'Transition zone', 'Movement', 'Stamina', 'Communication',
  'Patience', 'Aggression', 'Mental focus', 'Stacking',
];
const SKILL_TAG_SET = new Set(SKILL_TAGS);

/**
 * PATCH /api/companion/me/tournaments/:id/feedback  { wentWell:[], wentWrong:[] }
 * Save the post-result shot review for one tournament. Scoped + validated for
 * just these two arrays — the main PUT /tournaments validator requires a full
 * tournament body and strips unknown fields, so feedback can't go through it.
 */
exports.updateTournamentFeedback = async (req, res, next) => {
  try {
    const clean = (arr) =>
      Array.isArray(arr) ? [...new Set(arr.filter((t) => SKILL_TAG_SET.has(t)))] : null;

    const wentWell = clean(req.body?.wentWell);
    const wentWrong = clean(req.body?.wentWrong);
    if (wentWell === null && wentWrong === null) {
      return res.status(400).json({ success: false, message: 'wentWell or wentWrong is required' });
    }

    const update = {};
    if (wentWell !== null) update.wentWell = wentWell;
    if (wentWrong !== null) update.wentWrong = wentWrong;

    const t = await Tournament.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update,
      { new: true }
    );
    if (!t) return res.status(404).json({ success: false, message: 'Tournament not found' });

    return res.json({ success: true, data: { wentWell: t.wentWell, wentWrong: t.wentWrong } });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/companion/me/spend?period=month|year|all
 * Spending summary for the user: tournament entry fees + travel + gear
 * expenses, with winnings (prize money) and net, scoped to a time window.
 * Date matching is string-prefix on YYYY-MM-DD (entry-fee dates + expense dates).
 */
exports.mySpend = async (req, res, next) => {
  try {
    const q = { ...req.query, ...(req.body || {}) };
    const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const now = new Date();

    // Selection model: explicit { year, month } takes priority over the legacy
    // relative `period`. month 1-12 = a specific month; month absent/0 = whole
    // year. No selection at all → current month (the default view).
    const selYear = Number.isInteger(+q.year) && +q.year >= 2000 && +q.year <= 2999 ? +q.year : null;
    const selMonthRaw = +q.month;
    const selMonth = selYear && Number.isInteger(selMonthRaw) && selMonthRaw >= 1 && selMonthRaw <= 12 ? selMonthRaw : null;
    const period = ['month', 'year', 'all'].includes(q.period) ? q.period : 'month';

    const yyyy = String(now.getFullYear());
    const mm = String(now.getMonth() + 1).padStart(2, '0');

    // Window predicate + human label + the active selection echoed back so the
    // UI selector can stay in sync.
    let inWindow;
    let label;
    let selection;
    if (selYear) {
      if (selMonth) {
        const m2 = String(selMonth).padStart(2, '0');
        inWindow = (d) => typeof d === 'string' && d.startsWith(`${selYear}-${m2}`);
        label = `${MONTHS[selMonth - 1]} ${selYear}`;
        selection = { year: selYear, month: selMonth };
      } else {
        inWindow = (d) => typeof d === 'string' && d.startsWith(`${selYear}-`);
        label = String(selYear);
        selection = { year: selYear, month: null };
      }
    } else if (period === 'all') {
      inWindow = () => true;
      label = 'All time';
      selection = { year: null, month: null };
    } else if (period === 'year') {
      inWindow = (d) => typeof d === 'string' && d.startsWith(`${yyyy}-`);
      label = yyyy;
      selection = { year: now.getFullYear(), month: null };
    } else {
      inWindow = (d) => typeof d === 'string' && d.startsWith(`${yyyy}-${mm}`);
      label = `${MONTHS[now.getMonth()]} ${yyyy}`;
      selection = { year: now.getFullYear(), month: now.getMonth() + 1 };
    }

    const [user, tournaments, expenses] = await Promise.all([
      User.findById(req.user.id).select('currency').lean(),
      Tournament.find({ userId: req.user.id }).select('name categories').lean(),
      Expense.find({ userId: req.user.id }).select('type amount date tournamentId title').lean(),
    ]);

    // Per-tournament rollup: entry fees + winnings (prize) from in-window
    // categories, travel from linked travel expenses in window.
    const per = new Map(); // tid -> { name, entry, prize, travel, date }
    const row = (tid, name) => {
      const key = String(tid);
      if (!per.has(key)) per.set(key, { name: name || 'Tournament', entry: 0, prize: 0, travel: 0, date: null });
      return per.get(key);
    };

    let entry = 0;
    let winnings = 0;
    for (const t of tournaments) {
      let touched = false;
      const r = row(t._id, t.name);
      for (const c of t.categories || []) {
        if (!inWindow(c.date)) continue;
        touched = true;
        r.entry += c.entryFee || 0;
        r.prize += c.prizeAmount || 0;
        entry += c.entryFee || 0;
        winnings += c.prizeAmount || 0;
        if (!r.date || c.date < r.date) r.date = c.date;
      }
      if (!touched && r.entry === 0 && r.prize === 0 && r.travel === 0) per.delete(String(t._id));
    }

    let travel = 0;
    let gear = 0;
    const gearItems = []; // standalone gear expenses (not tied to a tournament)
    for (const e of expenses) {
      if (!inWindow(e.date)) continue;
      if (e.type === 'travel') {
        travel += e.amount || 0;
        if (e.tournamentId) {
          const r = per.get(String(e.tournamentId));
          if (r) r.travel += e.amount || 0;
        }
      } else if (e.type === 'gear') {
        gear += e.amount || 0;
        gearItems.push({ id: String(e._id), title: e.title || 'Gear', amount: e.amount || 0, date: e.date || null });
      }
    }
    gearItems.sort((a, b) => (String(b.date || '') > String(a.date || '') ? 1 : -1));

    const list = [...per.values()]
      .filter((r) => r.entry + r.travel + r.prize > 0)
      .sort((a, b) => (String(b.date || '') > String(a.date || '') ? 1 : -1));

    // Every year that has spend/winnings data — drives the selector options.
    // Always include the current year so the default view is selectable.
    const yearSet = new Set([now.getFullYear()]);
    const noteYear = (d) => {
      if (typeof d === 'string' && /^\d{4}-/.test(d)) yearSet.add(+d.slice(0, 4));
    };
    for (const t of tournaments) for (const c of t.categories || []) noteYear(c.date);
    for (const e of expenses) noteYear(e.date);
    const availableYears = [...yearSet].sort((a, b) => b - a);

    const total = entry + travel + gear;
    return res.json({
      success: true,
      data: {
        period,
        label,
        selection,
        availableYears,
        currency: user?.currency || 'INR',
        entry,
        travel,
        gear,
        total,
        winnings,
        net: winnings - total,
        tournaments: list,
        gearItems,
        // Nothing recorded in this window → the card shows add-actions.
        isEmpty: total === 0 && winnings === 0,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/companion/me/tournaments
 * Every logged tournament shaped for the chat editor: { id, preview, payload,
 * raw }. preview drives the list/confirm card; payload is the ready PUT body;
 * raw is the merge base (currentForm) so a free-text correction edits in place.
 */
exports.myTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .lean();

    const data = tournaments.map((t) => {
      const cats = (t.categories || []).map((c) => ({
        categoryName: c.categoryName || null,
        date: c.date || null,
        medal: c.medal || 'None',
        entryFee: c.entryFee != null ? c.entryFee : null,
        prizeAmount: c.prizeAmount != null ? c.prizeAmount : null,
      }));
      const { preview, payload } = buildFromParse({
        name: t.name,
        locationQuery: t.location?.name || null,
        categories: cats,
        travelExpense: null,
      });
      // Preserve partner names (buildFromParse blanks them).
      payload.categories.forEach((pc, i) => {
        pc.partnerName = t.categories?.[i]?.partnerName || '';
      });
      preview.categories.forEach((pc, i) => {
        pc.partner = t.categories?.[i]?.partnerName || null;
      });
      return {
        id: String(t._id),
        preview,
        payload,
        raw: { name: t.name || null, locationQuery: t.location?.name || null, categories: cats },
      };
    });

    return res.json({ success: true, data });
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/companion/me/upcoming
 * Future-dated tournaments with no result yet → UpcomingList items.
 */
exports.myUpcoming = async (req, res, next) => {
  try {
    const t0 = today();
    const tournaments = await Tournament.find({ userId: req.user.id })
      .select('name location categories')
      .lean();

    const items = [];
    for (const t of tournaments) {
      const futureCats = (t.categories || []).filter(
        (c) => c.date && c.date > t0 && (!c.medal || c.medal === 'None')
      );
      if (futureCats.length === 0) continue;
      const futureDates = futureCats.map((c) => c.date);

      // Edit/delete on the in-chat card act on the WHOLE record, so attach the
      // same { id, preview, payload, raw } bundle the editor/confirm flow uses.
      const rawCats = toRawCats(t);
      const { preview, payload } = buildFromParse({
        name: t.name,
        locationQuery: t.location?.name || null,
        categories: rawCats,
        travelExpense: null,
      });
      payload.categories.forEach((pc, i) => { pc.partnerName = t.categories?.[i]?.partnerName || ''; });
      preview.categories.forEach((pc, i) => { pc.partner = t.categories?.[i]?.partnerName || null; });

      items.push({
        id: String(t._id),
        name: t.name,
        dates: fmtDateRange(futureDates),
        venue: t.location?.name || null,
        categories: futureCats.map((c) => ({
          category: c.categoryName || '',
          date: c.date || null,
          entryFee: c.entryFee != null ? c.entryFee : null,
          partner: c.partnerName || null,
        })),
        preview,
        payload,
        raw: { name: t.name || null, locationQuery: t.location?.name || null, categories: rawCats },
        _sort: futureDates.sort()[0],
      });
    }
    items.sort((a, b) => (a._sort > b._sort ? 1 : -1));
    return res.json({ success: true, data: items.map(({ _sort, ...rest }) => rest) });
  } catch (err) {
    next(err);
  }
};

// ---------------------------------------------------------------------------
// Conversational assistant: one LLM call routes a free-text message over the
// user's own tournament data into an intent, then we act deterministically.
//   query   → text answer composed by the LLM from the data
//   spend   → hand back to the existing spend card (period only)
//   edit    → resolve the tournament, apply the change, return a confirm payload
//   delete  → resolve the tournament, return target for an explicit confirm
//   log     → hand back to the new-tournament parse flow
//   clarify → ambiguous target / unknown change; ask back with candidates
// ---------------------------------------------------------------------------

const MEDAL_SET = ['None', 'Gold', 'Silver', 'Bronze'];

/** A tournament doc → the editable raw-cat shape buildFromParse consumes. */
const toRawCats = (t) =>
  (t.categories || []).map((c) => ({
    categoryName: c.categoryName || null,
    date: c.date || null,
    medal: c.medal || 'None',
    entryFee: c.entryFee != null ? c.entryFee : null,
    prizeAmount: c.prizeAmount != null ? c.prizeAmount : null,
    partnerName: c.partnerName || '',
  }));

const buildAssistPrompt = (today, tournaments) => `
You are Rallyora, a warm, concise pickleball assistant chatting with a player about THEIR OWN data.
Today is ${today}.

The player's tournaments (JSON; dates are YYYY-MM-DD, medal is one of None/Gold/Silver/Bronze).
Each tournament may carry self-assessment tags: "wentWell" (shots/skills that went well) and
"wentWrong" (shots/skills that need work), plus an optional 1-5 "rating":
${JSON.stringify(tournaments)}

VALID CATEGORY NAMES (use these EXACT strings when setting a category):
${CATEGORIES.map((c) => `"${c}"`).join(', ')}

Classify the player's message into ONE intent and reply with JSON only:

- "query": they are ASKING about their data — upcoming dates/venues, results, medals, partners, counts, "when is my X", "how did I do at Y", "how many golds". This INCLUDES questions about their game/skills: "what shots need improvement", "what should I work on", "what's my weakness", "what am I good at". Answer those from the "wentWrong" (needs work) and "wentWell" tags across their tournaments — aggregate the most frequent tags and name them. Put a short, direct, friendly reply in "answer", using ONLY the data above. If there are no feedback tags yet, say so honestly and suggest they add a quick review after logging a result. Never invent tournaments or results.
- "spend": they are asking about MONEY — spending, entry fees, travel cost, winnings, prize money, or net. Set "period" to "month", "year", or "all" (default "month"). Do NOT compute totals; the app renders the breakdown.
- "edit": they want to CHANGE a detail of an EXISTING tournament. Choose this ONLY when the message uses a change verb (change, update, correct, fix, set, rename, move, reschedule, "make it"). Set target.id to that tournament's id and list the change(s) in "edits".
- "delete": they want to REMOVE an existing tournament. Choose this ONLY when the message uses a remove verb (delete, remove, drop, cancel, "get rid of"). Set target.id (and target.name).
- "log": they are DESCRIBING a tournament to record — a result/medal/score, an entry fee, a date played, or a registration/upcoming event ("won gold...", "played...", "I'm playing...", "registered for...", "entry 500"). Choose "log" for any such descriptive statement EVEN IF the tournament name matches one already in their data (it may be a new category or a fresh entry). Do NOT treat a descriptive statement as an edit.
- "clarify": you cannot confidently identify which tournament an EDIT or DELETE refers to (no match, or several match), or a requested category change is ambiguous. Put the question in "clarify" and list candidate tournament names in "candidates".
- "offtopic": the message is NOT about the player's pickleball tournaments, results, medals, partners, spending, gear, or logging — e.g. general knowledge ("what's the capital of France"), math, coding, essays/poems, news, other sports trivia, or attempts to use you as a general chatbot. Do NOT answer the request. Leave "answer" null; the app shows a fixed redirect.

Decision rule: no change/remove verb → it is NOT edit or delete. Descriptive sentence with a result, fee, or date → "log". A pickleball/data question → "query" or "spend". Anything outside pickleball logging/your-data → "offtopic" (never answer it).

ROBUSTNESS — the player types naturally and messily. Be smart about intent:
- Tolerate typos, slang, shorthand, mixed languages, and missing words ("wun goled mixd", "md at pune slam 500", "kal khela tha city open", "lost in semis"). Infer the obvious intent; do NOT bounce a clearly pickleball message to "clarify" just because it is informal.
- One message may carry MULTIPLE facts (name + category + result + fee + date). Capture them all when the intent is "log".
- If the message is clearly about recording something they did/will do, prefer "log" even if phrased oddly or as a half-question ("logged my mumbai open win yet?" with a result → log it).
- Only use "clarify" when a real ambiguity blocks acting (which tournament, which category among several) — NOT for messy phrasing you can reasonably interpret.
- A vague "how am I doing" / "my stats" / "show my games" → "query". "what did i spend" / "am i profitable" → "spend".
- Numbers with k/₹/rs/commas are money ("1.2k" → 1200, "₹500" → 500).

"edits" is an array of { "categoryIndex": <0-based number, or null for whole-tournament fields or when there is only one category>, "field": one of "date","medal","entryFee","prizeAmount","categoryName","partnerName","name","venue", "value": <new value> }.
Rules:
- date → "YYYY-MM-DD" (resolve relative dates against today).
- medal → exactly one of None/Gold/Silver/Bronze.
- categoryName → an EXACT string from the valid list. If the player's words are ambiguous (e.g. just "doubles"), use intent "clarify" instead.
- entryFee/prizeAmount → a number in INR, no symbols ("1k" → 1000).
- "name"/"venue" are whole-tournament fields → categoryIndex must be null.
- If a category-level change is requested, the tournament has MORE THAN ONE category, and the player did not say which, use intent "clarify".

Output JSON shape (include only the fields relevant to the intent; use null/empty otherwise):
{ "intent": "query|spend|edit|delete|log|clarify|offtopic", "answer": string|null, "period": "month"|"year"|"all"|null, "target": { "id": string|null, "name": string|null }|null, "edits": [ { "categoryIndex": number|null, "field": string, "value": any } ]|null, "clarify": string|null, "candidates": string[]|null }
`.trim();

/** Apply one validated edit onto a {name, locationQuery, categories[]} draft. */
const applyEdit = (draft, edit) => {
  const { field, value } = edit;
  if (field === 'name') {
    draft.name = String(value || '').trim();
    return null;
  }
  if (field === 'venue') {
    draft.locationQuery = String(value || '').trim() || null;
    return null;
  }
  const cats = draft.categories;
  if (cats.length === 0) return 'There are no categories on that tournament to change.';
  let idx = typeof edit.categoryIndex === 'number' ? edit.categoryIndex : cats.length === 1 ? 0 : -1;
  if (idx < 0 || idx >= cats.length) return 'Which category did you mean?';
  const c = cats[idx];
  if (field === 'date') {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return 'I need a specific date (e.g. June 10).';
    c.date = value;
  } else if (field === 'medal') {
    if (!MEDAL_SET.includes(value)) return 'Medal must be Gold, Silver, Bronze, or None.';
    c.medal = value;
    if (value === 'None') c.prizeAmount = 0;
  } else if (field === 'categoryName') {
    if (!CATEGORIES.includes(value)) return `I don't recognise "${value}" as a category.`;
    c.categoryName = value;
  } else if (field === 'entryFee' || field === 'prizeAmount') {
    const n = Number(value);
    if (!Number.isFinite(n) || n < 0) return 'That amount needs to be a number.';
    c[field] = Math.round(n);
  } else if (field === 'partnerName') {
    c.partnerName = String(value || '').trim();
  } else {
    return `I can't change "${field}".`;
  }
  return null;
};

/** Shape an edited draft into the { id, preview, payload, raw } confirm bundle. */
const shapeConfirm = (id, draft) => {
  const { preview, payload } = buildFromParse({
    name: draft.name,
    locationQuery: draft.locationQuery,
    categories: draft.categories,
    travelExpense: null,
  });
  payload.categories.forEach((pc, i) => {
    pc.partnerName = draft.categories?.[i]?.partnerName || '';
  });
  preview.categories.forEach((pc, i) => {
    pc.partner = draft.categories?.[i]?.partnerName || null;
  });
  return {
    id,
    preview,
    payload,
    raw: { name: draft.name || null, locationQuery: draft.locationQuery || null, categories: draft.categories },
  };
};

/**
 * POST /api/companion/assist  { message }
 * Conversational router over the signed-in user's tournament data.
 */
exports.assist = async (req, res, next) => {
  try {
    const message = typeof req.body?.message === 'string' ? req.body.message.trim() : '';
    if (!message) return res.status(400).json({ success: false, message: 'Message is required' });
    if (message.length > 2000) return res.status(400).json({ success: false, message: 'Message too long' });
    if (!llm.isConfigured()) return res.status(503).json({ success: false, message: 'AI service is not configured' });

    const tournaments = await Tournament.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(80)
      .select('name location categories wentWell wentWrong rating')
      .lean();

    // Compact context the model reasons over (and matches edit/delete targets in).
    // wentWell/wentWrong are the per-tournament shot/skill self-assessment tags so
    // the model can answer "what shots need improvement" from real data.
    const ctx = tournaments.map((t) => ({
      id: String(t._id),
      name: t.name || 'Tournament',
      venue: t.location?.name || null,
      rating: t.rating != null ? t.rating : null,
      wentWell: Array.isArray(t.wentWell) ? t.wentWell : [],
      wentWrong: Array.isArray(t.wentWrong) ? t.wentWrong : [],
      categories: (t.categories || []).map((c) => ({
        categoryName: c.categoryName || null,
        date: c.date || null,
        medal: c.medal || 'None',
        entryFee: c.entryFee != null ? c.entryFee : null,
        prizeAmount: c.prizeAmount != null ? c.prizeAmount : null,
        partnerName: c.partnerName || null,
      })),
    }));

    const today = new Date().toISOString().split('T')[0];
    const { data: r } = await llm.chatJSON({
      system: buildAssistPrompt(today, ctx),
      user: message,
      maxTokens: 800,
    });

    const intent = ['query', 'spend', 'edit', 'delete', 'log', 'clarify', 'offtopic'].includes(r?.intent) ? r.intent : 'query';

    if (intent === 'log') return res.json({ success: true, data: { intent: 'log' } });

    // Off-topic → hard short-circuit with a fixed redirect (ignore any model
    // text), so the assistant can't be used as a free general-purpose chatbot.
    if (intent === 'offtopic') {
      return res.json({
        success: true,
        data: {
          intent: 'query',
          answer: "I'm your pickleball buddy — I can log tournaments, track medals and spending, and answer questions about your own games. Ask me about that!",
          candidates: [],
        },
      });
    }

    if (intent === 'spend') {
      const period = ['month', 'year', 'all'].includes(r.period) ? r.period : 'month';
      return res.json({ success: true, data: { intent: 'spend', period } });
    }

    if (intent === 'query' || intent === 'clarify') {
      const answer = typeof r.answer === 'string' && r.answer.trim() ? r.answer.trim() : null;
      const clarify = typeof r.clarify === 'string' && r.clarify.trim() ? r.clarify.trim() : null;
      const candidates = Array.isArray(r.candidates) ? r.candidates.filter((c) => typeof c === 'string').slice(0, 6) : [];
      return res.json({
        success: true,
        data: {
          intent,
          answer: answer || clarify || "I'm not sure I have that — try rephrasing?",
          candidates,
        },
      });
    }

    // edit / delete both need a resolved, owned tournament.
    const id = r.target?.id ? String(r.target.id) : null;
    const doc = id ? tournaments.find((t) => String(t._id) === id) : null;
    if (!doc) {
      return res.json({
        success: true,
        data: {
          intent: 'clarify',
          answer: typeof r.clarify === 'string' && r.clarify.trim() ? r.clarify.trim() : "Which tournament did you mean?",
          candidates: tournaments.slice(0, 6).map((t) => t.name || 'Tournament'),
        },
      });
    }

    if (intent === 'delete') {
      return res.json({ success: true, data: { intent: 'delete', target: { id, name: doc.name || 'this tournament' } } });
    }

    // edit: apply the changes onto a draft, surface a confirm bundle.
    const draft = { name: doc.name || '', locationQuery: doc.location?.name || null, categories: toRawCats(doc) };
    const edits = Array.isArray(r.edits) ? r.edits : [];
    if (edits.length === 0) {
      return res.json({ success: true, data: { intent: 'clarify', answer: "What would you like to change?", candidates: [] } });
    }
    for (const e of edits) {
      const problem = applyEdit(draft, e);
      if (problem) return res.json({ success: true, data: { intent: 'clarify', answer: problem, candidates: [] } });
    }
    return res.json({ success: true, data: { intent: 'edit', confirm: shapeConfirm(id, draft) } });
  } catch (err) {
    if (err.status) return res.status(err.status).json({ success: false, message: err.message });
    if (err.code && err.code.startsWith('LLM_')) {
      return res.status(502).json({ success: false, message: 'AI service failed to respond' });
    }
    next(err);
  }
};
