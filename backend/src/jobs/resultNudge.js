const Tournament = require('../models/Tournament');
const User = require('../models/User');
const { sendNotificationEmail } = require('../services/email.service');
const { calendarDatePlusDaysInUserZone } = require('../utils/userTimeZone');

function buildEmailHtml({ userName, tournaments }) {
  const firstName = userName?.split(' ')[0] || 'Player';
  const appUrl = process.env.APP_PUBLIC_URL || 'https://pickletracker.in';

  const rows = tournaments
    .map(({ name, categoryName, location }) => {
      const mapsUrl = location
        ? `https://maps.google.com/?q=${encodeURIComponent(location)}`
        : null;
      return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
          <strong style="color:#1a2e05;font-size:14px;">${name}</strong><br/>
          <span style="color:#6b7280;font-size:12px;">${categoryName}</span>
          ${location ? `<br/><a href="${mapsUrl}" style="color:#4a6e10;font-size:12px;text-decoration:none;">📍 ${location}</a>` : ''}
        </td>
      </tr>`;
    })
    .join('');

  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1c350a 0%,#2d6e05 50%,#a86010 100%);padding:28px 32px;">
            <table cellpadding="0" cellspacing="0" style="margin-bottom:16px;">
              <tr>
                <td style="width:32px;height:32px;border-radius:8px;background:rgba(145,190,77,0.2);border:1px solid rgba(145,190,77,0.4);text-align:center;vertical-align:middle;">
                  <span style="color:#c8e875;font-size:12px;font-weight:900;letter-spacing:-0.5px;line-height:32px;">PT</span>
                </td>
                <td style="padding-left:8px;vertical-align:middle;">
                  <span style="color:#91BE4D;font-size:11px;font-weight:800;letter-spacing:0.18em;text-transform:uppercase;">PickleTracker</span>
                </td>
              </tr>
            </table>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;line-height:1.3;">
              How did yesterday go? 🏆
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
              Hey ${firstName}, you played yesterday — log your results so your stats stay accurate.
            </p>
          </td>
        </tr>

        <!-- Tournament list -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0 0 12px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
              Yesterday's Tournaments
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              ${rows}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:20px 32px 28px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              Log your medal, winnings, and what went well. Every result you track builds a clearer picture of your game and your finances.
            </p>
            <a href="${appUrl}"
               style="display:inline-block;background:linear-gradient(to right,#2d7005,#91BE4D);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">
              Log Results →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
              You're receiving this because you have email reminders enabled on
              <a href="${appUrl}" style="color:#4a6e10;">pickletracker.in</a>.
              To turn these off, go to Settings → Notifications in the app.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

/** Email nudge for categories on the user's *previous local calendar day* that are still unlogged. */
async function sendResultNudgeEmailForUser(user) {
  if (!user?.email || user.emailReminders === false) return false;

  const yesterdayStr = calendarDatePlusDaysInUserZone(user, -1);
  const tournaments = await Tournament.find({
    userId: user._id,
    'categories.date': yesterdayStr,
  }).lean();

  if (!tournaments.length) return false;

  const items = [];
  for (const t of tournaments) {
    const yesterdayCats = t.categories.filter((c) => c.date === yesterdayStr);
    const allUnlogged = yesterdayCats.length && yesterdayCats.every((c) => c.medal === 'None');
    if (!allUnlogged) continue;
    for (const cat of yesterdayCats) {
      items.push({
        name: t.name,
        categoryName: cat.categoryName || 'Open',
        location: t.location?.name || null,
      });
    }
  }
  if (!items.length) return false;

  const result = await sendNotificationEmail({
    to: user.email,
    subject: `Log your tournament results from yesterday 🏆 — PickleTracker`,
    html: buildEmailHtml({ userName: user.name, tournaments: items }),
  });
  return Boolean(result?.ok);
}

/** Manual / test: run result nudge for all opted-in users (ignores 8 AM window). */
async function runResultNudge() {
  const users = await User.find({
    email: { $exists: true, $nin: [null, ''] },
    emailReminders: { $ne: false },
  })
    .select('name email timeZone emailReminders')
    .lean();

  let sent = 0;
  for (const user of users) {
    try {
      if (await sendResultNudgeEmailForUser(user)) sent++;
    } catch (err) {
      console.error('[ResultNudge] Error:', err);
    }
  }
  console.log(`[ResultNudge] Manual run — emails ok: ${sent}`);
  return sent;
}

module.exports = {
  sendResultNudgeEmailForUser,
  runResultNudge,
  buildEmailHtml,
};
