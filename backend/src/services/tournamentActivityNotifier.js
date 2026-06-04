const webpush = require('web-push');
const User = require('../models/User');
const PushSubscription = require('../models/PushSubscription');
const { sendNotificationEmail } = require('./email.service');

webpush.setVapidDetails(
  'mailto:' + (process.env.ADMIN_EMAIL || 'admin@pickletracker.in'),
  process.env.VAPID_PUBLIC_KEY,
  process.env.VAPID_PRIVATE_KEY
);

/**
 * Fired after any tournament is created. Sends one push + one email per user per day
 * to all other users, nudging them to log their own tournaments.
 *
 * @param {string|ObjectId} loggingUserId
 * @param {{ name: string, categories: Array<{ medal: string }> }} tournament
 */
async function notifyAllUsersOfTournamentActivity(loggingUserId, tournament) {
  try {
    const hasResult = tournament.categories?.some(
      (c) => c.medal && c.medal !== 'None'
    );

    const loggingUser = await User.findById(loggingUserId)
      .select('name shareTournamentsOnFeed')
      .lean();

    // Respect privacy: if the logger opted out of the public feed, don't nudge
    // others about their activity either.
    if (loggingUser?.shareTournamentsOnFeed === false) return;

    const playerName = loggingUser?.name || 'A player';
    const tournamentName = tournament.name;

    const pushTitle = hasResult ? 'Tournament Results Posted! 🏆' : 'New Tournament Alert! 🏆';
    const pushBody = hasResult
      ? `${playerName} just logged results for ${tournamentName} — how did yours go?`
      : `${playerName} is playing ${tournamentName} — are you entering?`;

    const emailSubject = hasResult
      ? `${playerName} logged tournament results — how did yours go?`
      : `${playerName} is competing in ${tournamentName}`;

    const startOfToday = new Date();
    startOfToday.setUTCHours(0, 0, 0, 0);

    const recipients = await User.find({
      _id: { $ne: loggingUserId },
      $or: [
        { lastTournamentNudgeReceivedAt: null },
        { lastTournamentNudgeReceivedAt: { $lt: startOfToday } },
      ],
    })
      .select('_id email name emailReminders')
      .lean();

    if (!recipients.length) return;

    const recipientIds = recipients.map((u) => u._id);
    const subs = await PushSubscription.find({ userId: { $in: recipientIds } }).lean();

    const subsByUser = {};
    for (const s of subs) {
      const uid = String(s.userId);
      if (!subsByUser[uid]) subsByUser[uid] = [];
      subsByUser[uid].push(s);
    }

    const pushPayload = JSON.stringify({
      title: pushTitle,
      body: pushBody,
      url: '/calendar',
      tag: `tournament-activity-${String(tournament._id || Date.now())}`,
    });

    const notifiedIds = [];

    for (const user of recipients) {
      const uid = String(user._id);
      let notified = false;

      // Push notification
      const userSubs = subsByUser[uid] || [];
      for (const sub of userSubs) {
        try {
          await webpush.sendNotification({ endpoint: sub.endpoint, keys: sub.keys }, pushPayload);
          notified = true;
        } catch (err) {
          if (err.statusCode === 410 || err.statusCode === 404) {
            await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
          }
        }
      }

      // Email
      if (user.emailReminders && user.email) {
        const result = await sendNotificationEmail({
          to: user.email,
          subject: emailSubject,
          html: buildEmailHtml({ playerName, tournamentName, hasResult, recipientName: user.name }),
        });
        if (result?.ok) notified = true;
      }

      if (notified) notifiedIds.push(uid);
    }

    if (notifiedIds.length) {
      await User.updateMany(
        { _id: { $in: notifiedIds } },
        { $set: { lastTournamentNudgeReceivedAt: new Date() } }
      );
      console.log(`[TournamentNotifier] Notified ${notifiedIds.length} users (${hasResult ? 'result' : 'upcoming'}: ${tournamentName})`);
    }
  } catch (err) {
    console.error('[TournamentNotifier] Error:', err.message);
  }
}

function buildEmailHtml({ playerName, tournamentName, hasResult, recipientName }) {
  const headline = hasResult
    ? `${playerName} just posted tournament results`
    : `${playerName} is competing in ${tournamentName}`;
  const body = hasResult
    ? `<strong style="color: #272702;">${playerName}</strong> logged their results for <strong>${tournamentName}</strong>. The community is growing — log your own results and keep your record up to date.`
    : `<strong style="color: #272702;">${playerName}</strong> just signed up for <strong>${tournamentName}</strong>. Are you competing too? Log your upcoming tournaments on PickleTracker to track your schedule, entry fees, and results.`;
  const ctaText = hasResult ? 'Log My Results' : 'Log My Tournament';

  return `
    <div style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; background: #ffffff;">
      <div style="text-align: center; margin-bottom: 24px;">
        <span style="font-size: 24px; font-weight: bold; color: #91BE4D;">Pickle</span><span style="font-size: 24px; font-weight: bold; color: #ec9937;">Tracker</span>
      </div>
      <h2 style="font-size: 20px; color: #272702; margin-bottom: 8px;">${headline}</h2>
      <p style="color: #6b7280; font-size: 14px; line-height: 1.6; margin-bottom: 24px;">
        Hi ${recipientName || 'there'},<br/><br/>
        ${body}
      </p>
      <a href="https://www.pickletracker.in/calendar" style="display: inline-block; background: #91BE4D; color: #ffffff; font-weight: bold; font-size: 14px; padding: 14px 28px; border-radius: 8px; text-decoration: none; margin-bottom: 24px;">
        ${ctaText}
      </a>
      <hr style="border: none; border-top: 1px solid #f3f4f6; margin: 24px 0;" />
      <p style="color: #d1d5db; font-size: 11px; text-align: center;">
        &copy; ${new Date().getFullYear()} PickleTracker. Built for the community.
      </p>
    </div>
  `;
}

module.exports = { notifyAllUsersOfTournamentActivity };
