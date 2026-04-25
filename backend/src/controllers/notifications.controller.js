const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Session = require('../models/Session');
const { sendNotificationEmail } = require('../services/email.service');
const { sendTournamentReminderEmailForUser } = require('../jobs/tournamentReminder');

// ── Helpers ────────────────────────────────────────────────────────────────────

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const pad = (n) => String(n).padStart(2, '0');
const todayStr = () => { const d = new Date(); return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`; };
const fmtDate  = (s) => { if (!s) return '—'; const [y,m,d] = s.split('-'); return `${parseInt(d)} ${MONTH_NAMES[parseInt(m)-1]} ${y}`; };
const fmtMoney = (n) => `₹${new Intl.NumberFormat('en-IN').format(Math.abs(n || 0))}`;
const fmtProfit = (n) => ((n||0) >= 0 ? `+${fmtMoney(n)}` : `-${fmtMoney(n)}`);

const headerHtml = (title, subtitle) => `
  <div style="background:linear-gradient(135deg,#1c350a 0%,#2d6e05 50%,#a86010 100%);padding:32px 28px;border-radius:12px 12px 0 0;">
    <p style="color:#91BE4D;font-size:11px;font-weight:700;letter-spacing:0.15em;text-transform:uppercase;margin:0 0 6px;">PickleTracker</p>
    <h1 style="color:#ffffff;margin:0;font-size:22px;font-weight:900;line-height:1.2;">${title}</h1>
    ${subtitle ? `<p style="color:rgba(255,255,255,0.5);margin:6px 0 0;font-size:13px;">${subtitle}</p>` : ''}
  </div>`;

const footerHtml = () => `
  <div style="padding:20px 28px;border-top:1px solid #f3f4f6;text-align:center;">
    <p style="color:#d1d5db;font-size:11px;margin:0 0 6px;">
      You're receiving this because you have email reminders turned on in PickleTracker.
    </p>
    <p style="color:#d1d5db;font-size:11px;margin:0;">
      © ${new Date().getFullYear()} PickleTracker · pickletracker.in
    </p>
  </div>`;

const wrapHtml = (inner) => `
<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:24px 16px;background:#f3f4f6;font-family:Arial,sans-serif;">
  <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.08);">
    ${inner}
  </div>
</body></html>`;

// ── Weekly digest email ────────────────────────────────────────────────────────

const calcStreak = (sessions) => {
  if (!sessions.length) return 0;
  const today = todayStr();
  const dates = [...new Set(sessions.map((s) => s.date))].sort().reverse();
  let streak = 0; let cursor = today;
  for (const d of dates) {
    if (d === cursor) {
      streak++;
      const prev = new Date(cursor); prev.setDate(prev.getDate() - 1);
      cursor = `${prev.getFullYear()}-${pad(prev.getMonth()+1)}-${pad(prev.getDate())}`;
    } else if (d < cursor) break;
  }
  return streak;
};

const buildDigestHtml = (user, recentSessions, allSessions, allTournaments) => {
  const streak = calcStreak(allSessions);
  const medals = { Gold: 0, Silver: 0, Bronze: 0 };
  allTournaments.forEach((t) => t.categories.forEach((c) => { if (medals[c.medal] !== undefined) medals[c.medal]++; }));
  const totalMedals = medals.Gold + medals.Silver + medals.Bronze;

  let perfSection = '';
  if (recentSessions.length > 0) {
    const avgRating = (recentSessions.reduce((s, x) => s + (x.rating || 0), 0) / recentSessions.length).toFixed(1);
    const wellCount = {}; const wrongCount = {};
    recentSessions.forEach((s) => {
      (s.wentWell  || []).forEach((sk) => { wellCount[sk]  = (wellCount[sk]  || 0) + 1; });
      (s.wentWrong || []).forEach((sk) => { wrongCount[sk] = (wrongCount[sk] || 0) + 1; });
    });
    const strengths = Object.entries(wellCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([s])=>s);
    const focus     = Object.entries(wrongCount).sort((a,b)=>b[1]-a[1]).slice(0,3).map(([s])=>s);

    perfSection = `
      <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:16px;">
        <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Last 7 Days</p>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div style="text-align:center;min-width:60px;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#111827;">${recentSessions.length}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">Sessions</p>
          </div>
          <div style="text-align:center;min-width:60px;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#111827;">${avgRating}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">Avg Rating</p>
          </div>
          <div style="text-align:center;min-width:60px;">
            <p style="margin:0;font-size:22px;font-weight:900;color:#111827;">${streak}</p>
            <p style="margin:2px 0 0;font-size:11px;color:#6b7280;">Day Streak 🔥</p>
          </div>
        </div>
        ${strengths.length ? `<p style="margin:14px 0 4px;font-size:12px;font-weight:700;color:#4a6e10;">✅ Top strengths</p><p style="margin:0;font-size:13px;color:#374151;">${strengths.join(' · ')}</p>` : ''}
        ${focus.length ? `<p style="margin:10px 0 4px;font-size:12px;font-weight:700;color:#b45309;">🔧 Focus areas</p><p style="margin:0;font-size:13px;color:#374151;">${focus.join(' · ')}</p>` : ''}
      </div>`;
  } else {
    perfSection = `<p style="color:#6b7280;font-size:13px;margin:0 0 16px;">No sessions logged in the last 7 days. Log one today to start your streak!</p>`;
  }

  const medalSection = totalMedals > 0 ? `
    <div style="background:#f9fafb;border-radius:10px;padding:16px;margin-bottom:16px;">
      <p style="margin:0 0 12px;font-size:12px;font-weight:700;color:#9ca3af;text-transform:uppercase;letter-spacing:0.08em;">Career Medals</p>
      <div style="display:flex;gap:20px;">
        ${[['Gold','🥇'],['Silver','🥈'],['Bronze','🥉']].map(([m,e])=>`
        <div style="text-align:center;">
          <p style="margin:0;font-size:22px;">${e}</p>
          <p style="margin:2px 0 0;font-size:18px;font-weight:900;color:#111827;">${medals[m]}</p>
          <p style="margin:1px 0 0;font-size:10px;color:#9ca3af;text-transform:uppercase;">${m}</p>
        </div>`).join('')}
      </div>
    </div>` : '';

  return wrapHtml(`
    ${headerHtml('Weekly Digest 📊', 'Your pickleball stats for the week')}
    <div style="padding:28px 28px 8px;">
      <p style="margin:0 0 20px;font-size:15px;color:#374151;">Hi <strong>${user.name}</strong>, here's how your week looked:</p>
      ${perfSection}
      ${medalSection}
      <div style="text-align:center;margin:24px 0 20px;">
        <a href="https://pickletracker.in/sessions" style="background:linear-gradient(to right,#2d7005,#91BE4D 45%,#ec9937);color:#ffffff;font-weight:700;font-size:14px;padding:13px 28px;border-radius:10px;text-decoration:none;display:inline-block;">Open PickleTracker</a>
      </div>
    </div>
    ${footerHtml()}`);
};

// ── Cron: Tournament reminders ─────────────────────────────────────────────────

const runTournamentReminders = async () => {
  const users = await User.find({ emailReminders: { $ne: false }, email: { $exists: true, $nin: [null, ''] } })
    .select('_id name email timeZone emailReminders')
    .lean();
  let sent = 0;

  for (const user of users) {
    try {
      if (await sendTournamentReminderEmailForUser(user)) sent++;
    } catch (err) {
      console.error(`[Notifications] Reminder failed for ${user.email}:`, err);
    }
  }
  return sent;
};

// ── Cron: Weekly digest ────────────────────────────────────────────────────────

const runWeeklyDigest = async () => {
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7);
  const weekAgoStr = `${weekAgo.getFullYear()}-${pad(weekAgo.getMonth()+1)}-${pad(weekAgo.getDate())}`;

  const users = await User.find({ emailReminders: true }).select('_id name email').lean();
  let sent = 0;

  for (const user of users) {
    const [allSessions, allTournaments] = await Promise.all([
      Session.find({ userId: user._id }).lean(),
      Tournament.find({ userId: user._id }).lean(),
    ]);
    const recentSessions = allSessions.filter((s) => s.date >= weekAgoStr);
    if (!recentSessions.length && !allTournaments.length) continue;

    const html = buildDigestHtml(user, recentSessions, allSessions, allTournaments);
    const result = await sendNotificationEmail({
      to: user.email,
      subject: `Your weekly pickleball digest 🏓`,
      html,
    });
    if (result.ok) sent++;
    else console.error(`[Notifications] Digest failed for ${user.email}:`, result.error);
  }
  return sent;
};

// ── Exported cron endpoints ────────────────────────────────────────────────────

exports.triggerReminders = async (req, res, next) => {
  if (!process.env.CRON_SECRET || req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const sent = await runTournamentReminders();
    res.json({ success: true, sent });
  } catch (err) { next(err); }
};

exports.triggerDigest = async (req, res, next) => {
  if (!process.env.CRON_SECRET || req.headers['x-cron-secret'] !== process.env.CRON_SECRET) {
    return res.status(403).json({ message: 'Forbidden' });
  }
  try {
    const sent = await runWeeklyDigest();
    res.json({ success: true, sent });
  } catch (err) { next(err); }
};

// ── User preferences ──────────────────────────────────────────────────────────

exports.getEmailPrefs = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('email emailReminders').lean();
    res.json({ success: true, data: { email: user.email, emailReminders: user.emailReminders !== false } });
  } catch (err) { next(err); }
};

exports.updateEmailPrefs = async (req, res, next) => {
  try {
    const { emailReminders } = req.body;
    await User.findByIdAndUpdate(req.user.id, { emailReminders: Boolean(emailReminders) });
    res.json({ success: true });
  } catch (err) { next(err); }
};

// ── Send test email ────────────────────────────────────────────────────────────

exports.sendTestEmail = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select('name email').lean();
    const html = wrapHtml(`
      ${headerHtml('Test Email 🏓', 'Confirming your notifications are working')}
      <div style="padding:28px;">
        <p style="margin:0 0 16px;font-size:15px;color:#374151;">Hi <strong>${user.name}</strong>!</p>
        <p style="margin:0;font-size:14px;color:#6b7280;line-height:1.6;">
          This is a test email from PickleTracker. If you can read this, your email notifications are set up correctly.
          You'll receive tournament reminders the day before your events, and a weekly digest every Monday.
        </p>
        <div style="text-align:center;margin:28px 0 8px;">
          <a href="https://pickletracker.in" style="background:linear-gradient(to right,#2d7005,#91BE4D 45%,#ec9937);color:#ffffff;font-weight:700;font-size:14px;padding:13px 28px;border-radius:10px;text-decoration:none;display:inline-block;">Go to PickleTracker</a>
        </div>
      </div>
      ${footerHtml()}`);

    const result = await sendNotificationEmail({
      to: user.email,
      subject: 'PickleTracker — test notification email',
      html,
    });
    res.json(result);
  } catch (err) { next(err); }
};
