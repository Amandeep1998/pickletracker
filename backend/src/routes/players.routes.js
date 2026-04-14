const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { getPlayers, getPlayer } = require('../controllers/players.controller');

router.get('/', protect, getPlayers);
router.get('/:id', protect, getPlayer);

module.exports = router;
