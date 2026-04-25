const CoachingIncome = require('../models/CoachingIncome');
const { sumExpenseItems, LUMP_CONTEXTS } = CoachingIncome;

const normalizeCoachingBody = (body) => {
  const role = body.entryRole === 'player' ? 'player' : 'coach';
  body.entryRole = role;

  if (role === 'player') {
    body.coachName = String(body.coachName || '').trim().slice(0, 200);
    body.playerAmountPaid = Math.max(0, Math.floor(Number(body.playerAmountPaid) || 0));
    body.studentNames = Array.isArray(body.studentNames) ? body.studentNames : [];
    body.students = 1;
    body.feePerStudent = 0;
    body.incomeInputMode = 'lump';
    body.lumpAmount = 0;
    body.lumpLabel = '';
    body.lumpContext = '';
    body.expenseItems = [];
    body.expensesTotal = 0;
    body.totalEarned = 0;
    const t = body.type;
    body.type = t === 'monthly_package' ? 'monthly_package' : 'private_lesson';
    body.paid = body.paid !== false;
    if (body.notes) body.notes = String(body.notes).trim().slice(0, 1000);
    return body;
  }

  body.coachName = '';
  body.playerAmountPaid = 0;

  if (Array.isArray(body.expenseItems)) {
    body.expensesTotal = sumExpenseItems(body.expenseItems);
  } else {
    body.expenseItems = [];
    body.expensesTotal = 0;
  }
  if (body.incomeInputMode === 'lump') {
    body.lumpContext =
      LUMP_CONTEXTS && LUMP_CONTEXTS.includes(body.lumpContext) ? body.lumpContext : '';
    if (body.lumpLabel) body.lumpLabel = String(body.lumpLabel).trim().slice(0, 200);
    body.totalEarned = Math.max(0, Number(body.lumpAmount) || 0);
  } else {
    body.incomeInputMode = 'per_head';
    const s = Number(body.students) || 0;
    const f = Number(body.feePerStudent) || 0;
    body.totalEarned = s * f;
  }
  return body;
};

const getCoachingIncomes = async (req, res, next) => {
  try {
    const items = await CoachingIncome.find({ userId: req.user.id }).sort({ date: -1, createdAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

const createCoachingIncome = async (req, res, next) => {
  try {
    const body = normalizeCoachingBody({ ...req.body, userId: req.user.id });
    if (body.entryRole === 'player' && (!body.playerAmountPaid || body.playerAmountPaid <= 0)) {
      return res.status(400).json({ success: false, message: 'Enter the amount you paid for coaching' });
    }
    const item = await CoachingIncome.create(body);
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const updateCoachingIncome = async (req, res, next) => {
  try {
    const update = normalizeCoachingBody({ ...req.body });
    if (update.entryRole === 'player' && (!update.playerAmountPaid || update.playerAmountPaid <= 0)) {
      return res.status(400).json({ success: false, message: 'Enter the amount you paid for coaching' });
    }
    const item = await CoachingIncome.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update,
      { new: true, runValidators: true }
    );
    if (!item) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.status(200).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const deleteCoachingIncome = async (req, res, next) => {
  try {
    const item = await CoachingIncome.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!item) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.status(200).json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getCoachingIncomes, createCoachingIncome, updateCoachingIncome, deleteCoachingIncome };
