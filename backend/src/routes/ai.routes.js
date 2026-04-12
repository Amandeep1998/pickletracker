const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { parseTournamentVoice } = require('../controllers/ai.controller');

router.use(protect);

router.post('/parse-voice', parseTournamentVoice);

module.exports = router;
