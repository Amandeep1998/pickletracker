const express = require('express');
const router = express.Router();
const { verify, webhook } = require('../controllers/whatsapp.controller');

// Meta webhook verification (GET) — no auth, public
router.get('/webhook', verify);

// Incoming messages from WhatsApp users (POST) — no auth, verified by WHATSAPP_VERIFY_TOKEN
router.post('/webhook', webhook);

module.exports = router;
