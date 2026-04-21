const cron = require('node-cron');
const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Session = require('../models/Session');
const { sendNotificationEmail } = require('../services/email.service');

const APP_URL = process.env.APP_PUBLIC_URL || 'https://pickletracker.in';

/** Returns the YYYY-MM-DD date string that is `daysAgo` days before today in IST */
function getDateIST(daysAgo = 0) {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const d = new Date(Date.now() + istOffsetMs - daysAgo * 24 * 60 * 60 * 1000);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function buildDay3Email(firstName) {
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
              Your stats are waiting, ${firstName} 🏆
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
              You signed up a few days ago — here's what you can track right now.
            </p>
          </td>
        </tr>

        <!-- What you can do -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              PickleTracker helps you stop guessing and start knowing exactly how your pickleball game and money are performing:
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 14px;background:#f4f8e8;border-radius:10px;margin-bottom:8px;border-left:3px solid #91BE4D;">
                  <p style="margin:0;color:#1a2e05;font-size:13px;font-weight:700;">🏆 Log your tournaments</p>
                  <p style="margin:4px 0 0;color:#4a6e10;font-size:12px;">Track entry fees, medals, and prize money. See your exact P&amp;L every month.</p>
                </td>
              </tr>
              <tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:10px 14px;background:#f4f8e8;border-radius:10px;border-left:3px solid #91BE4D;">
                  <p style="margin:0;color:#1a2e05;font-size:13px;font-weight:700;">📓 Journal your sessions</p>
                  <p style="margin:4px 0 0;color:#4a6e10;font-size:12px;">Log drills and practice sessions, track court fees, and spot patterns in your game.</p>
                </td>
              </tr>
              <tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:10px 14px;background:#f4f8e8;border-radius:10px;border-left:3px solid #91BE4D;">
                  <p style="margin:0;color:#1a2e05;font-size:13px;font-weight:700;">✈️ Track travel &amp; gear costs</p>
                  <p style="margin:4px 0 0;color:#4a6e10;font-size:12px;">Log every trip and gear purchase so you always know your true cost of playing.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:20px 32px 28px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              It takes under 2 minutes to add your first tournament. Your dashboard, P&amp;L charts, and monthly reports will start filling in automatically from there.
            </p>
            <a href="${APP_URL}/tournaments"
               style="display:inline-block;background:linear-gradient(to right,#2d7005,#91BE4D);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">
              Add your first tournament →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
              You're receiving this because you recently signed up at
              <a href="${APP_URL}" style="color:#4a6e10;">pickletracker.in</a>.
              To stop these emails, go to Profile → Notifications in the app.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

function buildDay7Email(firstName) {
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
              Got a tournament coming up, ${firstName}?
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
              A week in — log it now and let PickleTracker do the rest.
            </p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              Most pickleball players never know if they're making or losing money on tournaments. Entry fees, travel, gear — it all adds up quietly.
            </p>
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              PickleTracker gives you a clear number at the end of every month: exactly how much you spent, what you won, and where your money went.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8e8;border-radius:12px;padding:16px 20px;border:1px solid #d6e89a;">
              <tr>
                <td>
                  <p style="margin:0;color:#1a2e05;font-size:13px;font-weight:700;">Just 3 things to start:</p>
                  <p style="margin:8px 0 0;color:#374151;font-size:13px;line-height:1.7;">
                    1. Add your next tournament<br/>
                    2. Log the entry fee<br/>
                    3. Fill in your result after you play
                  </p>
                  <p style="margin:8px 0 0;color:#4a6e10;font-size:12px;">That's it. Your dashboard updates automatically.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:20px 32px 28px;">
            <a href="${APP_URL}/tournaments"
               style="display:inline-block;background:linear-gradient(to right,#2d7005,#91BE4D);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">
              Add a tournament now →
            </a>
            <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
              Or <a href="${APP_URL}/sessions" style="color:#4a6e10;">log a practice session</a> if you don't have a tournament lined up yet.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
              You're receiving this because you recently signed up at
              <a href="${APP_URL}" style="color:#4a6e10;">pickletracker.in</a>.
              To stop these emails, go to Profile → Notifications in the app.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function runInactiveUserNudge() {
  const day3 = getDateIST(3);
  const day7 = getDateIST(7);
  console.log(`[InactiveNudge] Checking signups on ${day3} (3-day) and ${day7} (7-day)`);

  try {
    // Find users who signed up on day3 or day7 (by createdAt date in IST)
    const istOffset = 5.5 * 60 * 60 * 1000;

    const startOf = (dateStr) => new Date(new Date(dateStr).getTime() - istOffset);
    const endOf   = (dateStr) => new Date(new Date(dateStr).getTime() - istOffset + 24 * 60 * 60 * 1000 - 1);

    const [day3Users, day7Users] = await Promise.all([
      User.find({
        emailReminders: { $ne: false },
        createdAt: { $gte: startOf(day3), $lte: endOf(day3) },
      }, 'name email').lean(),
      User.find({
        emailReminders: { $ne: false },
        createdAt: { $gte: startOf(day7), $lte: endOf(day7) },
      }, 'name email').lean(),
    ]);

    console.log(`[InactiveNudge] Candidates — 3-day: ${day3Users.length}, 7-day: ${day7Users.length}`);

    const sendIfInactive = async (user, dayLabel, buildHtml) => {
      const firstName = user.name?.split(' ')[0] || 'Player';
      const [tCount, sCount] = await Promise.all([
        Tournament.countDocuments({ userId: user._id }),
        Session.countDocuments({ userId: user._id }),
      ]);
      if (tCount > 0 || sCount > 0) return; // already active — skip

      await sendNotificationEmail({
        to: user.email,
        subject: dayLabel === 3
          ? `Your PickleTracker dashboard is empty — here's how to fix that 🏆`
          : `Still haven't logged anything? We've got you, ${firstName} 🏆`,
        html: buildHtml(firstName),
      });
      console.log(`[InactiveNudge] Sent day-${dayLabel} nudge to ${user.email}`);
    };

    const tasks = [
      ...day3Users.map((u) => sendIfInactive(u, 3, buildDay3Email)),
      ...day7Users.map((u) => sendIfInactive(u, 7, buildDay7Email)),
    ];

    const results = await Promise.allSettled(tasks);
    const sent   = results.filter((r) => r.status === 'fulfilled').length;
    const failed = results.filter((r) => r.status === 'rejected').length;
    console.log(`[InactiveNudge] Done — processed: ${tasks.length}, failed: ${failed}`);
  } catch (err) {
    console.error('[InactiveNudge] Error:', err);
  }
}

function startInactiveUserNudgeJob() {
  // Run daily at 10 AM IST = 04:30 UTC (distinct from the 08:00 IST jobs)
  cron.schedule('30 4 * * *', runInactiveUserNudge, { timezone: 'UTC' });
  console.log('[InactiveNudge] Cron job scheduled — daily at 10:00 IST');
}

module.exports = { startInactiveUserNudgeJob, runInactiveUserNudge };
