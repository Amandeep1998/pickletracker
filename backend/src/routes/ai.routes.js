const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { parseTournamentVoice } = require('../controllers/ai.controller');
const { getCoachInsight } = require('../controllers/coach.controller');

router.use(protect);

router.post('/parse-voice', parseTournamentVoice);
router.post('/coach', getCoachInsight);

module.exports = router;
