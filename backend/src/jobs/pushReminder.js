const cron = require('node-cron');
const { runPushReminders } = require('../controllers/push.controller');

// Daily at 7:00 PM IST (13:30 UTC)
const startPushReminderJob = () => {
  cron.schedule('30 13 * * *', async () => {
    try {
      const sent = await runPushReminders();
      console.log(`[PushReminder] Sent ${sent} push notification(s)`);
    } catch (err) {
      console.error('[PushReminder] Error:', err);
    }
  });
};

module.exports = { startPushReminderJob };
