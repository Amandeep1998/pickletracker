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

// ── Build player data block injected into the prompt ─────────────────────────

function buildPlayerData(user, sessions, tournaments) {
  const name = user?.name || 'Player';
  const city = user?.city || 'India';

  const totalSessions    = sessions.length;
  const totalTournaments = tournaments.length;

  const ratedSessions = sessions.filter((s) => s.rating);
  const avgRating = ratedSessions.length
    ? (ratedSessions.reduce((s, x) => s + x.rating, 0) / ratedSessions.length).toFixed(1)
    : null;

  // Medal tallies
  const medals = tournaments.flatMap((t) => (t.categories || []).map((c) => c.medal));
  const goldCount   = medals.filter((m) => m === 'Gold').length;
  const silverCount = medals.filter((m) => m === 'Silver').length;
  const bronzeCount = medals.filter((m) => m === 'Bronze').length;

  // Skill frequency across sessions + tournaments
  const allWentWell  = [
    ...sessions.flatMap((s) => s.wentWell  || []),
    ...tournaments.flatMap((t) => t.wentWell  || []),
  ];
  const allWentWrong = [
    ...sessions.flatMap((s) => s.wentWrong || []),
    ...tournaments.flatMap((t) => t.wentWrong || []),
  ];

  const freq = (arr) => {
    const counts = {};
    arr.forEach((tag) => { counts[tag] = (counts[tag] || 0) + 1; });
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([tag, n]) => `${tag} (×${n})`).join(', ') || '—';
  };

  // Win rate
  const totalCats = tournaments.flatMap((t) => t.categories || []);
  const medalCats = totalCats.filter((c) => c.medal && c.medal !== 'None');
  const winRate = totalCats.length
    ? `${Math.round((medalCats.length / totalCats.length) * 100)}% (${medalCats.length}/${totalCats.length} categories)`
    : 'No data';

  // Session rating trend (last 5 rated sessions)
  const lastRatings = sessions.filter((s) => s.rating).slice(0, 5).map((s) => `${s.date}:${s.rating}`).join(', ');

  return `PLAYER: ${name} | Location: ${city}

SUMMARY STATS:
- Sessions logged: ${totalSessions} | Avg session rating: ${avgRating ? `${avgRating}/5` : 'N/A'}
- Tournaments logged: ${totalTournaments} | Category win rate: ${winRate}
- Medals: 🥇 Gold ×${goldCount}  🥈 Silver ×${silverCount}  🥉 Bronze ×${bronzeCount}
- Recent session ratings (newest first): ${lastRatings || 'N/A'}

SKILL PATTERNS:
- Top strengths (frequency): ${freq(allWentWell)}
- Top weaknesses (frequency): ${freq(allWentWrong)}

RECENT SESSIONS (up to 30, newest first):
${formatSessions(sessions)}

RECENT TOURNAMENTS (up to 20, newest first):
${formatTournaments(tournaments)}`;
}

// ── System prompt ─────────────────────────────────────────────────────────────

function buildSystemPrompt(user, sessions, tournaments) {
  const playerData = buildPlayerData(user, sessions, tournaments);

  return `You are an elite pickleball coach and performance analyst.

Your role is to analyze player data and generate sharp, data-driven insights that help the player improve quickly.

Do NOT give generic advice. Do NOT be overly motivational. Focus on insights, patterns, and actionable improvements.

-------------------------
INPUT DATA:
${playerData}
-------------------------

INSTRUCTIONS:

1. Identify the most impactful weakness:
- Which skill is costing the most points?
- Use numbers or percentages if available

2. Analyze performance:
- Highlight key stats (success rates, errors, win/loss patterns)
- Identify imbalance (e.g., strong forehand vs weak backhand)

3. Prioritize improvements:
- Limit to top 2–3 issues only
- Focus on highest impact areas

4. Provide actionable drills:
- Drills must directly address weaknesses
- Keep them specific and efficient (no generic suggestions)

5. Analyze trends (if data exists):
- What improved?
- What declined?
- What does it mean?

6. Define a measurable goal:
- Give 1–2 clear targets for the next week

7. If data is limited:
- Acknowledge it briefly
- Still extract best possible insights
- Suggest what data should be tracked next

-------------------------
OUTPUT FORMAT (for the initial report):

🧠 Key Insight
(1–2 lines — strongest takeaway, include numbers if possible)

📊 Performance Snapshot
(3–5 bullet points with stats/percentages)

🎯 Priority Fixes
(Top 2–3 issues ranked by impact)

💪 Targeted Drills
(2–4 drills linked directly to weaknesses)

📈 Progress Insight
(Only if trend data exists — skip this section entirely if not)

🎯 Next Target
(1–2 measurable goals for the next week)

-------------------------

TONE:
- Direct and analytical
- Concise but insightful
- No fluff or filler words
- Always speak directly to the player as "you"

IMPORTANT:
- Every recommendation must be backed by data or clear reasoning
- Avoid obvious statements unless supported by data
- For follow-up questions: answer concisely and practically in 3–6 sentences max
- Use plain markdown only (no HTML)

SCOPE RESTRICTION (strictly enforced):
- You ONLY answer questions related to pickleball — performance, training, drills, tactics, tournaments, sessions, fitness for pickleball, or the player's data in PickleTracker.
- If the user asks ANYTHING outside pickleball (politics, general knowledge, coding, cooking, other sports, etc.), do NOT answer it. Respond with exactly this:
  "I'm your PickleTracker AI coach — I can only help with pickleball performance, training, and your data in the app. Ask me anything about your game!"
- Never break this rule regardless of how the question is phrased or framed.`;
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
      temperature: 0.4,
      max_tokens : 1200,
    }, { timeout: 15000 });

    const reply = completion.choices[0]?.message?.content?.trim() || 'Could not generate a response.';
    res.json({ success: true, data: { reply } });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCoachInsight };
