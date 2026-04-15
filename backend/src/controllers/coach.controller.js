const { OpenAI } = require('openai');
const Tournament = require('../models/Tournament');
const Session = require('../models/Session');
const User = require('../models/User');

let _openai = null;
function getClient() {
  if (!_openai) _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  return _openai;
}

// ── Format session data for the prompt ───────────────────────────────────────

function formatSessions(sessions) {
  if (!sessions.length) return 'No sessions logged yet.';
  return sessions.map((s) => {
    const well  = s.wentWell?.length  ? s.wentWell.join(', ')  : '—';
    const wrong = s.wentWrong?.length ? s.wentWrong.join(', ') : '—';
    const notes = s.notes ? ` | Notes: "${s.notes}"` : '';
    return `${s.date} | ${s.type} | Rating ${s.rating}/5 | Went well: ${well} | Needs work: ${wrong}${notes}`;
  }).join('\n');
}

// ── Format tournament data for the prompt ────────────────────────────────────

function formatTournaments(tournaments) {
  if (!tournaments.length) return 'No tournaments logged yet.';
  return tournaments.map((t) => {
    const dates  = (t.categories || []).map((c) => c.date).filter(Boolean).sort();
    const date   = dates[0] || 'unknown';
    const cats   = (t.categories || []).map((c) => `${c.categoryName}→${c.medal}`).join(', ');
    const profit = (t.totalProfit ?? 0) >= 0 ? `+₹${t.totalProfit ?? 0}` : `-₹${Math.abs(t.totalProfit ?? 0)}`;
    const well   = t.wentWell?.length  ? ` | Went well: ${t.wentWell.join(', ')}`  : '';
    const wrong  = t.wentWrong?.length ? ` | Needs work: ${t.wentWrong.join(', ')}` : '';
    const rating = t.rating ? ` | Rating ${t.rating}/5` : '';
    const notes  = t.notes  ? ` | Notes: "${t.notes}"` : '';
    return `${date} | ${t.name} | ${cats} | Net: ${profit}${rating}${well}${wrong}${notes}`;
  }).join('\n');
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(user, sessions, tournaments) {
  const name = user?.name || 'Player';
  const city = user?.city || 'India';

  // Derive a quick stats summary
  const totalSessions    = sessions.length;
  const totalTournaments = tournaments.length;
  const avgRating = totalSessions
    ? (sessions.reduce((s, x) => s + (x.rating || 0), 0) / totalSessions).toFixed(1)
    : null;
  const medals = tournaments.flatMap((t) => (t.categories || []).map((c) => c.medal));
  const goldCount   = medals.filter((m) => m === 'Gold').length;
  const silverCount = medals.filter((m) => m === 'Silver').length;
  const bronzeCount = medals.filter((m) => m === 'Bronze').length;

  return `You are the personal pickleball coach AI for ${name} (${city}). \
You are a world-class coach — warm, specific, encouraging, and data-driven. \
Always speak directly to the player as "you". Reference their actual data whenever possible.

QUICK STATS:
- Sessions logged: ${totalSessions}${avgRating ? ` | Avg session rating: ${avgRating}/5` : ''}
- Tournaments logged: ${totalTournaments} | Medals: 🥇${goldCount} 🥈${silverCount} 🥉${bronzeCount}

RECENT SESSIONS (newest first, up to 30):
${formatSessions(sessions)}

RECENT TOURNAMENTS (newest first, up to 20):
${formatTournaments(tournaments)}

COACHING GUIDELINES:
- For the initial report use this structure (plain markdown, no HTML):
  **📊 Recent Activity**  (2–3 sentences on volume, consistency, session types)
  **💪 Your Strengths**   (2–4 bullet points referencing recurring "went well" skills)
  **🎯 Focus Areas**      (2–3 bullet points on recurring "needs work" skills)
  **💡 This Week's Drills** (3 specific, practical drills tied to their weak areas)
  **📈 Trend**            (1–2 sentences on whether ratings/medals are improving)
- Keep each section tight — quality over quantity.
- If data is sparse (< 3 sessions or < 2 tournaments) acknowledge it and give general beginner advice.
- For follow-up questions: answer concisely and practically in 3–6 sentences max.
- Always end with one short motivating line.`;
}

// ── Controller ────────────────────────────────────────────────────────────────

const getCoachInsight = async (req, res, next) => {
  try {
    if (!process.env.OPENAI_API_KEY) {
      return res.status(503).json({ success: false, message: 'AI coach is not available.' });
    }

    const userId          = req.user.id;
    const { messages = [] } = req.body;

    // Validate messages shape (keep last 10 to avoid token overflow)
    const history = Array.isArray(messages) ? messages.slice(-10) : [];

    // Fetch player data
    const [user, sessions, tournaments] = await Promise.all([
      User.findById(userId).select('name city').lean(),
      Session.find({ userId }).sort({ date: -1 }).limit(30).lean(),
      Tournament.find({ userId }).sort({ updatedAt: -1 }).limit(20).lean(),
    ]);

    const systemPrompt = buildSystemPrompt(user, sessions, tournaments);

    // First call → generate the initial report
    const chatMessages = [
      { role: 'system', content: systemPrompt },
      ...(history.length === 0
        ? [{ role: 'user', content: 'Generate my coaching report.' }]
        : history),
    ];

    const completion = await getClient().chat.completions.create({
      model      : 'gpt-4o',
      messages   : chatMessages,
      temperature: 0.7,
      max_tokens : 900,
    }, { timeout: 15000 });

    const reply = completion.choices[0]?.message?.content?.trim() || 'Could not generate a response.';
    res.json({ success: true, data: { reply } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCoachInsight };
