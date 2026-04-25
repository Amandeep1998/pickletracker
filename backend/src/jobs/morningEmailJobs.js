const cron = require('node-cron');
const User = require('../models/User');
const { calendarDateInUserZone, inMorningEmailWindow } = require('../utils/userTimeZone');
const { sendTournamentReminderEmailForUser } = require('./tournamentReminder');
const { sendResultNudgeEmailForUser } = require('./resultNudge');

/**
 * ~8:00 in each user's IANA time zone (see Profile): "tomorrow" tournament email +
 * "yesterday" unlogged-results email. Deduped once per local calendar day.
 */
async function runMorningEmailJobs() {
  const users = await User.find({
    email: { $exists: true, $nin: [null, ''] },
    emailReminders: { $ne: false },
  })
    .select('name email timeZone emailMorningRemindersSentOn')
    .lean();

  let processed = 0;
  for (const user of users) {
    if (!inMorningEmailWindow(user)) continue;
    const todayTag = calendarDateInUserZone(user);
    if (user.emailMorningRemindersSentOn === todayTag) continue;

    try {
      await sendTournamentReminderEmailForUser(user);
      await sendResultNudgeEmailForUser(user);
    } catch (err) {
      console.error('[MorningEmail] Error for user', user._id, err);
    }
    await User.updateOne({ _id: user._id }, { $set: { emailMorningRemindersSentOn: todayTag } }).catch(() => {});
    processed++;
  }
  if (processed) {
    console.log(`[MorningEmail] Processed ${processed} user(s) in morning window`);
  }
}

function startMorningEmailJobs() {
  cron.schedule('8,23,38,53 * * * *', runMorningEmailJobs);
  console.log('[MorningEmail] Cron every ~15m — per-user ~08:00 local (tournament + result emails)');
}

module.exports = { startMorningEmailJobs, runMorningEmailJobs };
