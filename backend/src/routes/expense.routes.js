const express = require('express');
const router = express.Router();
const protect = require('../middleware/auth.middleware');
const { expenseSchema, validate } = require('../validators/expense.validator');
const {
  getExpenses,
  createExpense,
  updateExpense,
  deleteExpense,
} = require('../controllers/expense.controller');

router.use(protect);

router.get('/', getExpenses);
router.post('/', validate(expenseSchema), createExpense);
router.put('/:id', validate(expenseSchema), updateExpense);
router.delete('/:id', deleteExpense);

module.exports = router;
