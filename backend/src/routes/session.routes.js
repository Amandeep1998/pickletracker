const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { getSessions, createSession, updateSession, deleteSession } = require('../controllers/session.controller');

router.use(protect);

router.get('/', getSessions);
router.post('/', createSession);
router.put('/:id', updateSession);
router.delete('/:id', deleteSession);

module.exports = router;
