const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { subscribe, unsubscribe, triggerPushReminders } = require('../controllers/push.controller');

router.post('/subscribe', protect, subscribe);
router.post('/unsubscribe', protect, unsubscribe);
router.post('/trigger-reminders', triggerPushReminders);

module.exports = router;
