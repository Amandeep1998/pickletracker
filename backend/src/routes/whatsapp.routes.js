const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { verify, webhook, getStatus, connect, disconnect } = require('../controllers/whatsapp.controller');

// Meta webhook — public (verified by WHATSAPP_VERIFY_TOKEN)
router.get('/webhook', verify);
router.post('/webhook', webhook);

// App-side connect / status — requires JWT
router.get('/status', protect, getStatus);
router.post('/connect', protect, connect);
router.delete('/connect', protect, disconnect);

module.exports = router;
