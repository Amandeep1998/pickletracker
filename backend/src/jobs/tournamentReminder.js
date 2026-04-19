const cron = require('node-cron');
const Tournament = require('../models/Tournament');
const { sendNotificationEmail } = require('../services/email.service');

/** Returns tomorrow's date string in IST (YYYY-MM-DD) */
function getTomorrowIST() {
  const nowUTC = Date.now();
  const istOffsetMs = 5.5 * 60 * 60 * 1000; // IST = UTC+5:30
  const tomorrowIST = new Date(nowUTC + istOffsetMs + 24 * 60 * 60 * 1000);
  const y = tomorrowIST.getUTCFullYear();
  const m = String(tomorrowIST.getUTCMonth() + 1).padStart(2, '0');
  const d = String(tomorrowIST.getUTCDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function buildEmailHtml({ userName, tournaments }) {
  const firstName = userName?.split(' ')[0] || 'Player';
  const tournamentRows = tournaments
    .map(
      ({ name, categoryName, location, entryFee }) => {
        const mapsUrl = location
          ? `https://maps.google.com/?q=${encodeURIComponent(location)}`
          : null;
        return `
      <tr>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;">
          <strong style="color:#1a2e05;font-size:14px;">${name}</strong><br/>
          <span style="color:#6b7280;font-size:12px;">${categoryName}</span>${location ? `<br/><a href="${mapsUrl}" style="color:#4a6e10;font-size:12px;text-decoration:none;">📍 ${location}</a>` : ''}
        </td>
        <td style="padding:12px 16px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;vertical-align:top;">
          ${entryFee ? `<span style="color:#4a6e10;font-size:13px;font-weight:600;">₹${entryFee}</span>` : ''}
        </td>
      </tr>`;
      }
    )
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
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
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
                    You're playing tomorrow! 🏆
                  </h1>
                  <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
                    Hey ${firstName}, here's a reminder about your upcoming tournament${tournaments.length > 1 ? 's' : ''}.
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Tournament table -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0 0 12px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
              Tomorrow's Events
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              ${tournamentRows}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:20px 32px 28px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              Champions aren't made on the day of the match — they're made in every session, every rep, every early morning. Tomorrow is your moment to show what you're built for. Go out there and own the court. 🏆
            </p>
            <a href="${process.env.APP_PUBLIC_URL || 'https://pickletracker.in'}"
               style="display:inline-block;background:linear-gradient(to right,#2d7005,#91BE4D);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">
              View on PickleTracker →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
              You're receiving this because you have email reminders enabled on
              <a href="${process.env.APP_PUBLIC_URL || 'https://pickletracker.in'}" style="color:#4a6e10;">pickletracker.in</a>.
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

async function runTournamentReminders() {
  const tomorrowStr = getTomorrowIST();
  console.log(`[TournamentReminder] Checking for tournaments on ${tomorrowStr}`);

  try {
    // Find all tournaments that have a category with tomorrow's date
    const tournaments = await Tournament.find({
      'categories.date': tomorrowStr,
    }).populate('userId', 'name email emailReminders');

    if (!tournaments.length) {
      console.log('[TournamentReminder] No tournaments tomorrow — nothing to send.');
      return;
    }

    // Group by user
    const byUser = new Map();
    for (const t of tournaments) {
      const user = t.userId;
      if (!user?.email) continue;
      if (user.emailReminders === false) continue; // opt-out

      const tomorrowCategories = t.categories.filter(c => c.date === tomorrowStr);
      if (!tomorrowCategories.length) continue;

      if (!byUser.has(user._id.toString())) {
        byUser.set(user._id.toString(), { user, items: [] });
      }
      for (const cat of tomorrowCategories) {
        byUser.get(user._id.toString()).items.push({
          name: t.name,
          categoryName: cat.categoryName || 'Open',
          location: t.location?.name || null,
          entryFee: cat.entryFee || null,
        });
      }
    }

    console.log(`[TournamentReminder] Sending reminders to ${byUser.size} user(s)`);

    const results = await Promise.allSettled(
      [...byUser.values()].map(({ user, items }) =>
        sendNotificationEmail({
          to: user.email,
          subject: `Your tournament${items.length > 1 ? 's are' : ' is'} tomorrow! 🏆 — PickleTracker`,
          html: buildEmailHtml({ userName: user.name, tournaments: items }),
        })
      )
    );

    const sent = results.filter(r => r.status === 'fulfilled').length;
    const failed = results.filter(r => r.status === 'rejected').length;
    console.log(`[TournamentReminder] Done — sent: ${sent}, failed: ${failed}`);
  } catch (err) {
    console.error('[TournamentReminder] Error running reminders:', err);
  }
}

function startTournamentReminderJob() {
  // TEMP: 1:45 PM IST = 08:15 UTC (for testing — change back to '30 2 * * *' for 8 AM IST)
  cron.schedule('15 8 * * *', runTournamentReminders, { timezone: 'UTC' });
  console.log('[TournamentReminder] Cron job scheduled — daily at 13:45 IST (testing)');
}

module.exports = { startTournamentReminderJob, runTournamentReminders };
