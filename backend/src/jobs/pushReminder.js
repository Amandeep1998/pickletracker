const cron = require('node-cron');
const { runPushReminders } = require('../controllers/push.controller');

// TEMP: 9:50 PM IST for testing (16:20 UTC) — change back to '30 2 * * *' (8:00 AM IST) after
const startPushReminderJob = () => {
  cron.schedule('20 16 * * *', async () => {
    try {
      const sent = await runPushReminders();
      console.log(`[PushReminder] Sent ${sent} push notification(s)`);
    } catch (err) {
      console.error('[PushReminder] Error:', err);
    }
  });
};

module.exports = { startPushReminderJob };
