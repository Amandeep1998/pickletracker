const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const {
  getCoachingIncomes,
  createCoachingIncome,
  updateCoachingIncome,
  deleteCoachingIncome,
} = require('../controllers/coachingIncome.controller');

router.use(protect);

router.get('/', getCoachingIncomes);
router.post('/', createCoachingIncome);
router.put('/:id', updateCoachingIncome);
router.delete('/:id', deleteCoachingIncome);

module.exports = router;
