const cron = require('node-cron');
const Tournament = require('../models/Tournament');
const User = require('../models/User');
const { sendNotificationEmail } = require('../services/email.service');

/** Returns { startStr, endStr, monthLabel } for the previous calendar month in IST */
function getLastMonthRangeIST() {
  const istOffsetMs = 5.5 * 60 * 60 * 1000;
  const nowIST = new Date(Date.now() + istOffsetMs);
  const year = nowIST.getUTCMonth() === 0 ? nowIST.getUTCFullYear() - 1 : nowIST.getUTCFullYear();
  const month = nowIST.getUTCMonth() === 0 ? 12 : nowIST.getUTCMonth(); // 1-indexed

  const startStr = `${year}-${String(month).padStart(2, '0')}-01`;
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate();
  const endStr = `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`;
  const monthLabel = new Date(year, month - 1, 1).toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });

  return { startStr, endStr, monthLabel };
}

function medalEmoji(medal) {
  if (medal === 'Gold') return '🥇';
  if (medal === 'Silver') return '🥈';
  if (medal === 'Bronze') return '🥉';
  return '—';
}

function buildEmailHtml({ userName, monthLabel, stats, rows }) {
  const firstName = userName?.split(' ')[0] || 'Player';
  const appUrl = process.env.APP_PUBLIC_URL || 'https://pickletracker.in';

  const profitColor = stats.netProfit >= 0 ? '#16a34a' : '#dc2626';
  const profitSign = stats.netProfit >= 0 ? '+' : '';
  const profitMessage = stats.netProfit >= 0
    ? `You finished the month <strong style="color:#16a34a;">₹${stats.netProfit} in profit</strong>. Keep it up!`
    : `You spent <strong style="color:#dc2626;">₹${Math.abs(stats.netProfit)} more</strong> than you won this month. Every match is a learning opportunity.`;

  const medalCounts = rows.reduce((acc, r) => {
    if (r.medal !== 'None') acc[r.medal] = (acc[r.medal] || 0) + 1;
    return acc;
  }, {});
  const medalSummary = ['Gold', 'Silver', 'Bronze']
    .filter(m => medalCounts[m])
    .map(m => `${medalEmoji(m)} ${medalCounts[m]} ${m}`)
    .join('&nbsp;&nbsp;');

  const tournamentRows = rows
    .map(({ name, categoryName, medal, entryFee, prizeAmount }) => `
      <tr>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;">
          <strong style="color:#1a2e05;font-size:13px;">${name}</strong><br/>
          <span style="color:#6b7280;font-size:12px;">${categoryName}</span>
        </td>
        <td style="padding:10px 16px;border-bottom:1px solid #e5e7eb;text-align:center;vertical-align:middle;font-size:16px;">${medalEmoji(medal)}</td>
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
            <p style="margin:0 0 4px;color:rgba(255,255,255,0.6);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.1em;">${monthLabel}</p>
            <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:900;line-height:1.3;">
              Your monthly P&amp;L report 📈
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
              Hey ${firstName}, here's your full financial breakdown for the month.
            </p>
          </td>
        </tr>

        <!-- Stat cards -->
        <tr>
          <td style="padding:24px 32px 8px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td width="25%" style="padding-right:5px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;">
                    <tr><td>
                      <p style="margin:0 0 4px;color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;">Played</p>
                      <p style="margin:0;color:#1a2e05;font-size:20px;font-weight:900;">${stats.tournamentCount}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="25%" style="padding:0 2px 0 3px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;">
                    <tr><td>
                      <p style="margin:0 0 4px;color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;">Spent</p>
                      <p style="margin:0;color:#dc2626;font-size:20px;font-weight:900;">₹${stats.totalSpent}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="25%" style="padding:0 3px 0 2px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;">
                    <tr><td>
                      <p style="margin:0 0 4px;color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;">Earned</p>
                      <p style="margin:0;color:#16a34a;font-size:20px;font-weight:900;">₹${stats.totalEarned}</p>
                    </td></tr>
                  </table>
                </td>
                <td width="25%" style="padding-left:5px;">
                  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:10px;padding:12px 14px;">
                    <tr><td>
                      <p style="margin:0 0 4px;color:#6b7280;font-size:10px;font-weight:700;text-transform:uppercase;">Net P&amp;L</p>
                      <p style="margin:0;color:${profitColor};font-size:20px;font-weight:900;">${profitSign}₹${Math.abs(stats.netProfit)}</p>
                    </td></tr>
                  </table>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        ${medalSummary ? `
        <!-- Medal row -->
        <tr>
          <td style="padding:12px 32px 4px;">
            <p style="margin:0;color:#374151;font-size:13px;">${medalSummary}</p>
          </td>
        </tr>` : ''}

        <!-- Summary line -->
        <tr>
          <td style="padding:12px 32px 8px;">
            <p style="margin:0;color:#374151;font-size:14px;line-height:1.6;">${profitMessage}</p>
          </td>
        </tr>

        <!-- Tournament table -->
        <tr>
          <td style="padding:8px 32px 8px;">
            <p style="margin:0 0 12px;color:#6b7280;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;">
              All Tournaments
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
              View Full Report →
            </a>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
              Monthly report from <a href="${appUrl}" style="color:#4a6e10;">pickletracker.in</a>.
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

async function runMonthlyPnl() {
  const { startStr, endStr, monthLabel } = getLastMonthRangeIST();
  console.log(`[MonthlyPnl] Running for ${monthLabel} (${startStr} → ${endStr})`);

  try {
    const users = await User.find({ emailReminders: { $ne: false } }, 'name email');
    if (!users.length) return;

    await Promise.allSettled(
      users.map(async (user) => {
        const tournaments = await Tournament.find({ userId: user._id });

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

        if (!rows.length) return; // user had no tournaments this month

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
          subject: `Your ${monthLabel} pickleball P&L — PickleTracker`,
          html: buildEmailHtml({ userName: user.name, monthLabel, stats, rows }),
        });
      })
    );

    console.log('[MonthlyPnl] Done');
  } catch (err) {
    console.error('[MonthlyPnl] Error:', err);
  }
}

function startMonthlyPnlJob() {
  // 1st of every month at 8 AM IST = 02:30 UTC
  cron.schedule('30 2 1 * *', runMonthlyPnl, { timezone: 'UTC' });
  console.log('[MonthlyPnl] Cron job scheduled — 1st of every month at 08:00 IST');
}

module.exports = { startMonthlyPnlJob, runMonthlyPnl };
