const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const {
  subscribe,
  unsubscribe,
  triggerPushReminders,
  triggerPushResultReminders,
} = require('../controllers/push.controller');

router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);
router.post('/trigger-reminders', triggerPushReminders);
router.post('/trigger-result-reminders', triggerPushResultReminders);

module.exports = router;
