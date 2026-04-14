const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const {
  getEmailPrefs, updateEmailPrefs,
  sendTestEmail,
  triggerReminders, triggerDigest,
} = require('../controllers/notifications.controller');

// User preferences (JWT protected)
router.get('/prefs', protect, getEmailPrefs);
router.put('/prefs', protect, updateEmailPrefs);
router.post('/test', protect, sendTestEmail);

// Cron endpoints (secured by x-cron-secret header)
router.post('/trigger-reminders', triggerReminders);
router.post('/trigger-digest', triggerDigest);

module.exports = router;
