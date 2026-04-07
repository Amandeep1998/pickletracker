const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { tournamentSchema, validate } = require('../validators/tournament.validator');
const {
  getTournaments,
  createTournament,
  updateTournament,
  deleteTournament,
} = require('../controllers/tournament.controller');

router.use(protect);

router.get('/', getTournaments);
router.post('/', validate(tournamentSchema), createTournament);
router.put('/:id', validate(tournamentSchema), updateTournament);
router.delete('/:id', deleteTournament);

module.exports = router;
