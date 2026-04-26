const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { getSlots, createSlot, updateSlot, deleteSlot } = require('../controllers/coachSchedule.controller');

router.use(protect);

router.get('/', getSlots);
router.post('/', createSlot);
router.put('/:id', updateSlot);
router.delete('/:id', deleteSlot);

module.exports = router;
