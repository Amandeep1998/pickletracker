const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const optionalAuth = require('../middleware/optionalAuth.middleware');
const companionRateLimit = require('../middleware/companionRateLimit');
const { parse, parseGear, assist, categoryOptions, categoryList, myCard, updateMedal, updateTournamentFeedback, myTournaments, myUpcoming, mySpend } = require('../controllers/companion.controller');

// Free-text → tournament preview + confirm payload. Anonymously accessible
// (try-before-auth log-first); optionalAuth raises the rate-limit caps for
// signed-in users. Writing the log still requires auth via /api/tournaments.
router.post('/parse', optionalAuth, companionRateLimit, parse);

// Progressive category picker — deterministic, no LLM. Each chip tap re-queries
// with the facets gathered so far. Anonymously accessible (mid-log, pre-auth).
router.post('/category-options', optionalAuth, categoryOptions);

// Full canonical category enum for the editor dropdown.
router.get('/categories', optionalAuth, categoryList);

// Conversational router over the user's own data (query/spend/edit/delete/log).
// Authed: it reads and proposes writes against the signed-in player's records.
router.post('/assist', protect, companionRateLimit, assist);

// Free-text → gear-expense preview + confirm payload. Authed (the write goes
// through POST /api/expenses); rate-limited like other LLM calls.
router.post('/parse-gear', protect, companionRateLimit, parseGear);

// Real player-card + upcoming + spend data — authed only.
router.get('/me/card', protect, myCard);
// Update a single medal entry from the card (tournament category or manual win).
router.patch('/me/medals', protect, updateMedal);
// Save the post-result shot review (wentWell/wentWrong) for one tournament.
router.patch('/me/tournaments/:id/feedback', protect, updateTournamentFeedback);
router.get('/me/tournaments', protect, myTournaments);
router.get('/me/upcoming', protect, myUpcoming);
router.get('/me/spend', protect, mySpend);

module.exports = router;
