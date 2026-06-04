/**
 * In-memory rate limit for the chat companion parse endpoint.
 *
 * Single-instance (Render) so an in-memory Map is enough; counters reset on
 * deploy, which is acceptable for an abuse guard. Caps both a short window
 * (bursts) and a daily window (cost ceiling). Every log is preceded by a
 * parse, so capping parses also caps writes.
 *
 * Parse is now anonymously accessible (try-before-auth log-first). Logged-in
 * users are keyed by userId with generous caps; anonymous visitors are keyed
 * by IP with a tight cap — enough to try the product once or twice, not enough
 * to use it as a free LLM.
 */

const HOUR = 60 * 60 * 1000;
const DAY = 24 * HOUR;

const PER_HOUR = parseInt(process.env.COMPANION_PARSE_PER_HOUR || '60', 10);
const PER_DAY = parseInt(process.env.COMPANION_PARSE_PER_DAY || '80', 10);
const ANON_PER_HOUR = parseInt(process.env.COMPANION_ANON_PARSE_PER_HOUR || '4', 10);
const ANON_PER_DAY = parseInt(process.env.COMPANION_ANON_PARSE_PER_DAY || '8', 10);

// key → { hour: [timestamps], day: [timestamps] }
const hits = new Map();

const prune = (arr, now, window) => arr.filter((t) => now - t < window);

// With `app.set('trust proxy', 1)`, Express resolves req.ip to the real client
// (the entry the trusted proxy appended), NOT a client-supplied X-Forwarded-For
// value — so the anon cap can't be evaded by forging that header.
const clientIp = (req) => req.ip || req.connection?.remoteAddress || 'unknown';

const companionRateLimit = (req, res, next) => {
  const userId = req.user?.id;
  const key = userId ? `u:${userId}` : `ip:${clientIp(req)}`;
  const hourCap = userId ? PER_HOUR : ANON_PER_HOUR;
  const dayCap = userId ? PER_DAY : ANON_PER_DAY;

  const now = Date.now();
  const rec = hits.get(key) || { hour: [], day: [] };
  rec.hour = prune(rec.hour, now, HOUR);
  rec.day = prune(rec.day, now, DAY);

  if (rec.hour.length >= hourCap || rec.day.length >= dayCap) {
    hits.set(key, rec);
    const message = userId
      ? "You've hit the chat limit for now — try again a bit later."
      : 'Sign in to keep logging — you have reached the free trial limit.';
    return res.status(429).json({ success: false, message });
  }

  rec.hour.push(now);
  rec.day.push(now);
  hits.set(key, rec);
  next();
};

module.exports = companionRateLimit;
