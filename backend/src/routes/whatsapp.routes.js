const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { webhook, getStatus, getDebug, connect, disconnect, triggerReminders, triggerInsights, testSend } = require('../controllers/whatsapp.controller');

// Twilio webhook — public, Twilio POSTs form data here
router.post('/webhook', webhook);

// App-side connect / status — requires JWT
router.get('/status', protect, getStatus);
router.get('/debug', protect, getDebug);
router.post('/test-send', protect, testSend);
router.post('/connect', protect, connect);
router.delete('/connect', protect, disconnect);

// Cron-triggered push messages (secured with x-cron-secret header)
router.post('/trigger-reminders', triggerReminders);
router.post('/trigger-insights', triggerInsights);

module.exports = router;
