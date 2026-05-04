const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { createTicket, listMyTickets, deleteTicket } = require('../controllers/support.controller');

router.use(protect);

router.post('/', createTicket);
router.get('/', listMyTickets);
router.delete('/:id', deleteTicket);

module.exports = router;
