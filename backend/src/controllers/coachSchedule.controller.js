const CoachScheduleSlot = require('../models/CoachScheduleSlot');
const { SESSION_EXPENSE_CATS } = CoachScheduleSlot;

function normalizeExpenses(items) {
  if (!Array.isArray(items)) return [];
  return items
    .map((e) => ({
      category: SESSION_EXPENSE_CATS.includes(e.category) ? e.category : 'other',
      amount: Math.max(0, Math.floor(Number(e.amount) || 0)),
      note: String(e.note || '').trim().slice(0, 200),
    }))
    .filter((e) => e.amount > 0);
}

const getSlots = async (req, res, next) => {
  try {
    const { month } = req.query; // YYYY-MM optional filter
    const filter = { userId: req.user.id };
    if (month && /^\d{4}-\d{2}$/.test(month)) {
      filter.date = { $regex: `^${month}` };
    }
    const slots = await CoachScheduleSlot.find(filter).sort({ date: 1, startTime: 1 });
    res.status(200).json({ success: true, data: slots });
  } catch (err) {
    next(err);
  }
};

const createSlot = async (req, res, next) => {
  try {
    const { studentNames, date, startTime, endTime, feeAmount, sessionExpenses, notes } = req.body;
    if (!date || !startTime || !endTime) {
      return res.status(400).json({ success: false, message: 'date, startTime, and endTime are required' });
    }
    const fee = Math.floor(Number(feeAmount) || 0);
    if (fee < 1) {
      return res.status(400).json({ success: false, message: 'Fee amount is required and must be at least 1' });
    }
    const slot = await CoachScheduleSlot.create({
      userId: req.user.id,
      studentNames: Array.isArray(studentNames)
        ? studentNames.map((n) => String(n).trim()).filter(Boolean)
        : [],
      date,
      startTime,
      endTime,
      feeAmount: fee,
      sessionExpenses: normalizeExpenses(sessionExpenses),
      notes: String(notes || '').trim().slice(0, 500),
      status: 'pending',
    });
    res.status(201).json({ success: true, data: slot });
  } catch (err) {
    next(err);
  }
};

const updateSlot = async (req, res, next) => {
  try {
    const { studentNames, date, startTime, endTime, feeAmount, sessionExpenses, notes, status, linkedIncomeId } = req.body;
    const update = {};
    if (studentNames !== undefined) {
      update.studentNames = Array.isArray(studentNames)
        ? studentNames.map((n) => String(n).trim()).filter(Boolean)
        : [];
    }
    if (date !== undefined) update.date = date;
    if (startTime !== undefined) update.startTime = startTime;
    if (endTime !== undefined) update.endTime = endTime;
    if (feeAmount !== undefined) {
      const fee = Math.floor(Number(feeAmount) || 0);
      if (fee < 1) return res.status(400).json({ success: false, message: 'Fee must be at least 1' });
      update.feeAmount = fee;
    }
    if (sessionExpenses !== undefined) {
      const expenses = normalizeExpenses(sessionExpenses);
      update.sessionExpenses = expenses;
      update.expensesTotal = expenses.reduce((s, e) => s + e.amount, 0);
    }
    if (notes !== undefined) update.notes = String(notes).trim().slice(0, 500);
    if (status !== undefined) update.status = status;
    if (linkedIncomeId !== undefined) update.linkedIncomeId = linkedIncomeId || null;

    const slot = await CoachScheduleSlot.findOneAndUpdate(
      { _id: req.params.id, userId: req.user.id },
      update,
      { new: true, runValidators: true }
    );
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    res.status(200).json({ success: true, data: slot });
  } catch (err) {
    next(err);
  }
};

const deleteSlot = async (req, res, next) => {
  try {
    const slot = await CoachScheduleSlot.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!slot) return res.status(404).json({ success: false, message: 'Slot not found' });
    res.status(200).json({ success: true, message: 'Slot deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getSlots, createSlot, updateSlot, deleteSlot };
