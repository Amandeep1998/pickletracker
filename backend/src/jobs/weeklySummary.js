const cron = require('node-cron');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const { sendNotificationEmail } = require('../services/email.service');

/** Returns { startStr, endStr } for the previous 7 days in IST (YYYY-MM-DD) */
function getLastWeekRangeIST() {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const todayIST = new Date(Date.now() + istOffsetMs);
  // endStr = yesterday
  const end = new Date(todayIST);
  end.setUTCDate(end.getUTCDate() - 1);
  // startStr = 7 days ago
  const start = new Date(todayIST);
  start.setUTCDate(start.getUTCDate() - 7);

  const fmt = (d) => {
    const y = d.getUTCFullYear();
    const m = String(d.getUTCMonth() + 1).padStart(2, '0');
    const day = String(d.getUTCDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  };
  return { startStr: fmt(start), endStr: fmt(end) };
}

function formatDisplayDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  return new Date(y, m - 1, d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

function medalEmoji(medal) {
  if (medal === 'Gold') return '🥇';
  if (medal === 'Silver') return '🥈';
  if (medal === 'Bronze') return '🥉';
  return '';
}

function buildEmailHtml({ userName, startStr, endStr, stats, rows }) {
  const firstName = userName?.split(' ')[0] || 'Player';
  const appUrl = process.env.APP_PUBLIC_URL || 'https://pickletracker.in';
  const period = `${formatDisplayDate(startStr)} – ${formatDisplayDate(endStr)}`;

  const profitColor = stats.netProfit >= 0 ? '#16a34a' : '#dc2626';
  const profitSign = stats.netProfit >= 0 ? '+' : '';

  const tournamentRows = rows
    .map(({ name, categoryName, medal, entryFee, prizeAmount }) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
          <strong style="color:#1a2e05;font-size:13px;">${name}</strong><br/>
          <span style="color:#6b7280;font-size:12px;">${categoryName} ${medalEmoji(medal)}</span>
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;text-align:right;white-space:nowrap;vertical-align:top;">
          <span style="color:#dc2626;font-size:12px;">-₹${entryFee}</span><br/>
          ${prizeAmount > 0 ? `<span style="color:#16a34a;font-size:12px;">+₹${prizeAmount}</span>` : ''}
        </td>
      </tr>`)
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
            <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${period}</p>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;line-height:1.3;">
              Your weekly summary 📊
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
              Hey ${firstName}, here's how your week looked on the court.
            </p>
          </td>
        </tr>

        <!-- Stat cards -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="33%" style="padding-right:6px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
                    <tr><td>
                      <p style="margin:0 0 4px;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;">Tournaments</p>
                      <p style="margin:0;color:#1a2e05;font-size:22px;font-weight:900;">${stats.tournamentCount}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="33%" style="padding:0 3px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
                    <tr><td>
                      <p style="margin:0 0 4px;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;">Spent</p>
                      <p style="margin:0;color:#dc2626;font-size:22px;font-weight:900;">₹${stats.totalSpent}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="33%" style="padding-left:6px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:14px 16px;">
                    <tr><td>
                      <p style="margin:0 0 4px;color:#6b7280;font-size:11px;font-weight:700;text-transform:uppercase;">Net P&amp;L</p>
                      <p style="margin:0;color:${profitColor};font-size:22px;font-weight:900;">${profitSign}₹${Math.abs(stats.netProfit)}</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- Tournament rows -->
        <tr>
          <td style="padding:16px 32px 8px;">
            <p style="margin:0 0 12px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
              Breakdown
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e5e7eb;border-radius:10px;overflow:hidden;">
              ${tournamentRows}
            </table>
          </td>
        </tr>

        <!-- CTA -->
        <tr>
          <td style="padding:20px 32px 28px;">
            <a href="${appUrl}"
               style="display:inline-block;background:linear-gradient(to right,#2d7005,#91BE4D);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">
              View Full Stats →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
              Weekly summary from <a href="${appUrl}" style="color:#4a6e10;">pickletracker.in</a>.
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

async function runWeeklySummary() {
  const { startStr, endStr } = getLastWeekRangeIST();
  console.log(`[WeeklySummary] Running for ${startStr} → ${endStr}`);

  try {
    const users = await User.find({ emailReminders: { $ne: false } }, 'name email');
    if (!users.length) return;

    await Promise.allSettled(
      users.map(async (user) => {
        const tournaments = await Tournament.find({ userId: user._id });

        // Collect categories that fall in the date range
        const rows = [];
        for (const t of tournaments) {
          for (const cat of t.categories) {
            if (cat.date >= startStr && cat.date <= endStr) {
              rows.push({
                name: t.name,
                categoryName: cat.categoryName || 'Open',
                medal: cat.medal,
                entryFee: cat.entryFee || 0,
                prizeAmount: cat.prizeAmount || 0,
              });
            }
          }
        }

        if (!rows.length) return; // user had no tournaments this week

        const stats = rows.reduce(
          (acc, r) => ({
            tournamentCount: acc.tournamentCount + 1,
            totalSpent: acc.totalSpent + r.entryFee,
            totalEarned: acc.totalEarned + r.prizeAmount,
            netProfit: acc.netProfit + (r.prizeAmount - r.entryFee),
          }),
          { tournamentCount: 0, totalSpent: 0, totalEarned: 0, netProfit: 0 }
        );

        await sendNotificationEmail({
          to: user.email,
          subject: `Your weekly pickleball summary — PickleTracker`,
          html: buildEmailHtml({ userName: user.name, startStr, endStr, stats, rows }),
        });
      })
    );

    console.log('[WeeklySummary] Done');
  } catch (err) {
    console.error('[WeeklySummary] Error:', err);
  }
}

function startWeeklySummaryJob() {
  // Every Monday at 8 AM IST = Monday 02:30 UTC
  cron.schedule('30 2 * * 1', runWeeklySummary, { timezone: 'UTC' });
  console.log('[WeeklySummary] Cron job scheduled — every Monday at 08:00 IST');
}

module.exports = { startWeeklySummaryJob, runWeeklySummary };
