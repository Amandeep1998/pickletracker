const User = require('../models/User');
const Tournament = require('../models/Tournament');
const Expense = require('../models/Expense');
const WhatsAppSession = require('../models/WhatsAppSession');
const Session = require('../models/Session');
const Friendship = require('../models/Friendship');
const { sendNotificationEmail } = require('../services/email.service');

const APP_URL = process.env.APP_PUBLIC_URL || 'https://pickletracker.in';

// ── Broadcast email HTML builders ────────────────────────────────────────────

function buildTournamentReminderHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
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
              Got a tournament coming up, ${firstName}? 🏆
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
              Log it now — takes under 2 minutes.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              Hi ${firstName}, pickleball season is in full swing. If you've got a tournament on the calendar, now's the time to log it on PickleTracker so you can track your entry fees, results, and prize money — all in one place.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8e8;border-radius:12px;padding:16px 20px;border:1px solid #d6e89a;">
              <tr>
                <td>
                  <p style="margin:0;color:#1a2e05;font-size:13px;font-weight:700;">Here's what you get instantly:</p>
                  <p style="margin:8px 0 0;color:#374151;font-size:13px;line-height:1.8;">
                    📊 Monthly P&amp;L — exactly how much you've won vs. spent<br/>
                    🏆 Medal tracker — Gold, Silver, Bronze across all events<br/>
                    ✈️ Travel &amp; gear costs — your true cost of playing<br/>
                    📓 Session journal — track practice and spot patterns
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;">
            <a href="${APP_URL}/tournaments"
               style="display:inline-block;background:linear-gradient(to right,#2d7005,#91BE4D);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">
              Log a tournament now →
            </a>
            <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
              Or <a href="${APP_URL}/sessions" style="color:#4a6e10;">log a practice session</a> if no tournament is lined up yet.
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
              You're receiving this because you signed up at <a href="${APP_URL}" style="color:#4a6e10;">pickletracker.in</a>.
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

function buildFirstEntryHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
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
              Your dashboard is empty, ${firstName} — let's fix that
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
              Start tracking in under 2 minutes.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              You signed up for PickleTracker but haven't logged anything yet. Most players never know if they're making or losing money on the sport — entry fees, travel, gear all add up quietly.
            </p>
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              Log just one tournament and your dashboard, P&amp;L chart, and monthly report start filling in automatically.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:10px 14px;background:#f4f8e8;border-radius:10px;margin-bottom:8px;border-left:3px solid #91BE4D;">
                  <p style="margin:0;color:#1a2e05;font-size:13px;font-weight:700;">Step 1 — Add a tournament</p>
                  <p style="margin:4px 0 0;color:#4a6e10;font-size:12px;">Enter the name, date, entry fee, and which category you played.</p>
                </td>
              </tr>
              <tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:10px 14px;background:#f4f8e8;border-radius:10px;border-left:3px solid #91BE4D;">
                  <p style="margin:0;color:#1a2e05;font-size:13px;font-weight:700;">Step 2 — Fill in your result</p>
                  <p style="margin:4px 0 0;color:#4a6e10;font-size:12px;">Add your medal and prize money (or leave blank if you're still playing).</p>
                </td>
              </tr>
              <tr><td style="height:8px;"></td></tr>
              <tr>
                <td style="padding:10px 14px;background:#f4f8e8;border-radius:10px;border-left:3px solid #91BE4D;">
                  <p style="margin:0;color:#1a2e05;font-size:13px;font-weight:700;">Step 3 — Watch your stats update</p>
                  <p style="margin:4px 0 0;color:#4a6e10;font-size:12px;">Your P&amp;L, medals, and trends update automatically from there.</p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;">
            <a href="${APP_URL}/tournaments"
               style="display:inline-block;background:linear-gradient(to right,#2d7005,#91BE4D);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">
              Add your first tournament →
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
              You're receiving this because you signed up at <a href="${APP_URL}" style="color:#4a6e10;">pickletracker.in</a>.
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

function buildMonthlyCheckInHtml(firstName) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1"/></head>
<body style="margin:0;padding:0;background:#f3f4f6;font-family:system-ui,-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f3f4f6;padding:32px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
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
              How's your pickleball going, ${firstName}?
            </h1>
            <p style="margin:8px 0 0;color:rgba(255,255,255,0.7);font-size:14px;">
              Check your stats and keep the streak going.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 32px 8px;">
            <p style="margin:0 0 16px;color:#374151;font-size:14px;line-height:1.6;">
              Hi ${firstName}, just a friendly nudge to log any recent tournaments or practice sessions you haven't captured yet. The more you log, the clearer your P&amp;L and progress trends become.
            </p>
            <table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f8e8;border-radius:12px;padding:16px 20px;border:1px solid #d6e89a;">
              <tr>
                <td>
                  <p style="margin:0;color:#1a2e05;font-size:13px;font-weight:700;">What's waiting for you on your dashboard:</p>
                  <p style="margin:8px 0 0;color:#374151;font-size:13px;line-height:1.8;">
                    📊 Monthly P&amp;L — how much you've earned vs. spent this month<br/>
                    🏆 Medal count — your Gold, Silver &amp; Bronze tally<br/>
                    📓 Session log — your practice history and ratings<br/>
                    ✈️ Travel &amp; gear — your real cost of playing
                  </p>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 32px 28px;">
            <a href="${APP_URL}/dashboard"
               style="display:inline-block;background:linear-gradient(to right,#2d7005,#91BE4D);color:#ffffff;font-size:14px;font-weight:700;text-decoration:none;padding:12px 24px;border-radius:10px;">
              View my dashboard →
            </a>
            <p style="margin:16px 0 0;color:#9ca3af;font-size:12px;">
              Or <a href="${APP_URL}/tournaments" style="color:#4a6e10;">log a tournament</a> · <a href="${APP_URL}/sessions" style="color:#4a6e10;">log a session</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="background:#f9fafb;padding:16px 32px;border-top:1px solid #e5e7eb;">
            <p style="margin:0;color:#9ca3af;font-size:11px;line-height:1.5;">
              You're receiving this because you signed up at <a href="${APP_URL}" style="color:#4a6e10;">pickletracker.in</a>.
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

const BROADCAST_TEMPLATES = {
  tournament_reminder: {
    subject: (firstName) => `Got a tournament coming up, ${firstName}? Log it on PickleTracker 🏆`,
    buildHtml: buildTournamentReminderHtml,
  },
  first_entry: {
    subject: (firstName) => `Your PickleTracker dashboard is empty — start in 2 minutes`,
    buildHtml: buildFirstEntryHtml,
  },
  monthly_checkin: {
    subject: (firstName) => `How's your pickleball going, ${firstName}? Check your stats`,
    buildHtml: buildMonthlyCheckInHtml,
  },
};

const getUsers = async (req, res, next) => {
  try {
  const users = await User.find({}).lean().sort({ createdAt: -1 });

  const now = new Date();
  const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);
  const todayStr = now.toISOString().split('T')[0];

  const enriched = await Promise.all(
    users.map(async (user) => {
      const [tournaments, expenses, sessions] = await Promise.all([
        Tournament.find({ userId: user._id }).lean(),
        Expense.find({ userId: user._id }).lean(),
        Session.find({ userId: user._id }).lean(),
      ]);

      const allCats = tournaments.flatMap((t) => t.categories);

      // Last active = most recent tournament, expense, or session update
      const activityDates = [
        ...tournaments.map((t) => new Date(t.updatedAt)),
        ...expenses.map((e) => new Date(e.updatedAt)),
        ...sessions.map((s) => new Date(s.updatedAt)),
      ].sort((a, b) => b - a);
      const lastActive = activityDates[0] || new Date(user.createdAt);

      // Activity status
      let activityStatus = 'inactive';
      if (lastActive >= sevenDaysAgo) activityStatus = 'active';
      else if (lastActive >= thirtyDaysAgo) activityStatus = 'recent';

      // Financials
      const totalEarnings = allCats.reduce((s, c) => s + (c.prizeAmount || 0), 0);
      const totalExpenses = allCats.reduce((s, c) => s + (c.entryFee || 0), 0);

      // Medals
      const medals = {
        Gold: allCats.filter((c) => c.medal === 'Gold').length,
        Silver: allCats.filter((c) => c.medal === 'Silver').length,
        Bronze: allCats.filter((c) => c.medal === 'Bronze').length,
      };

      // Most played category
      const catCounts = {};
      for (const cat of allCats) {
        catCounts[cat.categoryName] = (catCounts[cat.categoryName] || 0) + 1;
      }
      const topCategory =
        Object.entries(catCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || null;

      // Upcoming tournaments count
      const upcomingCount = tournaments.filter((t) =>
        t.categories.some((c) => c.date >= todayStr)
      ).length;

      // Recent tournaments (last 3 by created date)
      const recentTournaments = [...tournaments]
        .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
        .slice(0, 3)
        .map((t) => ({
          name: t.name,
          categoryCount: t.categories.length,
          createdAt: t.createdAt,
          profit: t.categories.reduce((s, c) => s + (c.prizeAmount - c.entryFee), 0),
        }));

      // Monthly activity (tournaments created per month, last 6 months)
      const monthlyActivity = Array.from({ length: 6 }, (_, i) => {
        const d = new Date(now);
        d.setMonth(d.getMonth() - (5 - i));
        const ym = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const count = tournaments.filter((t) =>
          t.createdAt.toISOString().startsWith(ym)
        ).length;
        return {
          month: d.toLocaleString('en-IN', { month: 'short', year: '2-digit' }),
          count,
        };
      });

      // Sessions
      const sessionCount = sessions.length;
      const sessionTypes = {
        tournament: sessions.filter((s) => s.type === 'tournament').length,
        casual: sessions.filter((s) => s.type === 'casual').length,
        practice: sessions.filter((s) => s.type === 'practice').length,
      };
      const totalCourtFees = sessions.reduce((s, sess) => s + (sess.courtFee || 0), 0);
      const avgSessionRating = sessionCount > 0
        ? Math.round((sessions.reduce((s, sess) => s + (sess.rating || 0), 0) / sessionCount) * 10) / 10
        : null;
      const skillCounts = {};
      for (const sess of sessions) {
        for (const tag of [...(sess.wentWell || []), ...(sess.drillFocus || [])]) {
          skillCounts[tag] = (skillCounts[tag] || 0) + 1;
        }
      }
      const topSkills = Object.entries(skillCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 3)
        .map(([tag]) => tag);

      // Gear & travel expenses
      const gearExpenses = expenses.filter((e) => e.type === 'gear');
      const travelExpenses = expenses.filter((e) => e.type === 'travel');
      const gearExpenseCount = gearExpenses.length;
      const totalGearSpend = gearExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const travelExpenseCount = travelExpenses.length;
      const totalTravelSpend = travelExpenses.reduce((s, e) => s + (e.amount || 0), 0);
      const internationalTripCount = travelExpenses.filter((e) => e.isInternational).length;

      return {
        _id: user._id,
        name: user.name,
        email: user.email,
        isGoogleUser: user.isGoogleUser,
        whatsappEnabled: user.whatsappEnabled || false,
        createdAt: user.createdAt,
        lastActive,
        activityStatus,
        tournamentCount: tournaments.length,
        totalCategories: allCats.length,
        totalEarnings,
        totalExpenses,
        totalProfit: totalEarnings - totalExpenses,
        medals,
        topCategory,
        upcomingCount,
        expenseCount: expenses.length,
        recentTournaments,
        monthlyActivity,
        sessionCount,
        sessionTypes,
        totalCourtFees,
        avgSessionRating,
        topSkills,
        gearExpenseCount,
        totalGearSpend,
        travelExpenseCount,
        totalTravelSpend,
        internationalTripCount,
      };
    })
  );

  const stats = {
    totalUsers: users.length,
    activeThisWeek: enriched.filter((u) => u.activityStatus === 'active').length,
    activeThisMonth: enriched.filter(
      (u) => u.activityStatus === 'active' || u.activityStatus === 'recent'
    ).length,
    totalTournaments: enriched.reduce((s, u) => s + u.tournamentCount, 0),
    totalRevenueTracked: enriched.reduce((s, u) => s + u.totalEarnings, 0),
    googleUsers: users.filter((u) => u.isGoogleUser).length,
    totalSessions: enriched.reduce((s, u) => s + u.sessionCount, 0),
    totalGearSpend: enriched.reduce((s, u) => s + u.totalGearSpend, 0),
    totalTravelSpend: enriched.reduce((s, u) => s + u.totalTravelSpend, 0),
  };

    res.json({ success: true, data: { users: enriched, stats } });
  } catch (err) {
    next(err);
  }
};

const getUserTournaments = async (req, res, next) => {
  try {
    const tournaments = await Tournament.find({ userId: req.params.id })
      .sort({ createdAt: -1 })
      .lean();
    res.json({ success: true, data: tournaments });
  } catch (err) {
    next(err);
  }
};

const toggleWhatsAppAccess = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select('whatsappEnabled');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    user.whatsappEnabled = !user.whatsappEnabled;
    await user.save();

    res.json({ success: true, whatsappEnabled: user.whatsappEnabled });
  } catch (err) {
    next(err);
  }
};

const deleteUser = async (req, res, next) => {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    // Cascade-delete everything belonging to this user
    await Promise.all([
      Tournament.deleteMany({ userId: id }),
      Session.deleteMany({ userId: id }),
      Expense.deleteMany({ userId: id }),
      WhatsAppSession.deleteMany({ userId: id }),
      // Remove friendships where the user is either side of the relationship
      Friendship.deleteMany({ $or: [{ requesterId: id }, { recipientId: id }] }),
    ]);

    await User.findByIdAndDelete(id);

    res.json({ success: true });
  } catch (err) {
    next(err);
  }
};

const broadcastEmail = async (req, res, next) => {
  try {
    const { template, target } = req.body;

    if (!BROADCAST_TEMPLATES[template]) {
      return res.status(400).json({ success: false, message: 'Invalid template' });
    }
    if (!['all', 'inactive', 'active'].includes(target)) {
      return res.status(400).json({ success: false, message: 'Invalid target' });
    }

    const { buildHtml, subject } = BROADCAST_TEMPLATES[template];

    // Fetch all opted-in users
    const users = await User.find({ emailReminders: { $ne: false } }, 'name email').lean();

    let candidates = users;

    if (target !== 'all') {
      // Determine active/inactive by checking tournament + session counts
      const activityChecks = await Promise.all(
        users.map(async (u) => {
          const [tCount, sCount] = await Promise.all([
            Tournament.countDocuments({ userId: u._id }),
            Session.countDocuments({ userId: u._id }),
          ]);
          return { user: u, hasActivity: tCount > 0 || sCount > 0 };
        })
      );
      candidates = activityChecks
        .filter((x) => target === 'inactive' ? !x.hasActivity : x.hasActivity)
        .map((x) => x.user);
    }

    console.log(`[BroadcastEmail] template=${template} target=${target} candidates=${candidates.length}`);

    let sent = 0;
    let failed = 0;
    for (const u of candidates) {
      const firstName = u.name?.split(' ')[0] || 'Player';
      const result = await sendNotificationEmail({
        to: u.email,
        subject: subject(firstName),
        html: buildHtml(firstName),
      });
      if (result?.ok) sent++;
      else failed++;
    }

    console.log(`[BroadcastEmail] Done — sent: ${sent}, failed: ${failed}`);
    res.json({ success: true, sent, failed, total: candidates.length });
  } catch (err) {
    next(err);
  }
};

module.exports = { getUsers, getUserTournaments, toggleWhatsAppAccess, deleteUser, broadcastEmail };
