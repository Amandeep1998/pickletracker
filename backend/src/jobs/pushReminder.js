const cron = require('node-cron');
const { runPushReminders, runPushResultReminders } = require('../controllers/push.controller');

// Every ~15 minutes UTC — each subscriber is only messaged when their local clock
// is in the day-before window (~7 PM) or evening result window (~11:30 PM).
const startPushReminderJob = () => {
  cron.schedule('3,18,33,48 * * * *', async () => {
    try {
      const dayBefore = await runPushReminders();
      const evening = await runPushResultReminders();
      if (dayBefore || evening) {
        console.log(`[PushReminder] day-before: ${dayBefore}, evening result: ${evening}`);
      }
    } catch (err) {
      console.error('[PushReminder] Error:', err);
    }
  });
  console.log('[PushReminder] Cron scheduled every ~15m (per-user local 7 PM / 11:30 PM)');
};

module.exports = { startPushReminderJob };
