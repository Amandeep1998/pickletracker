const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { getOverheads, createOverhead, updateOverhead, deleteOverhead } = require('../controllers/coachOverhead.controller');

router.use(protect);

router.get('/', getOverheads);
router.post('/', createOverhead);
router.put('/:id', updateOverhead);
router.delete('/:id', deleteOverhead);

module.exports = router;
