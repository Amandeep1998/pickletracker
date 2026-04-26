const CoachOverheadExpense = require('../models/CoachOverheadExpense');
const { OVERHEAD_CATEGORIES } = CoachOverheadExpense;

const getOverheads = async (req, res, next) => {
  try {
    const { month } = req.query; // YYYY-MM optional filter
    const filter = { userId: req.user.id };
    if (month && /^\d{4}-\d{2}$/.test(month)) filter.yearMonth = month;
    const items = await CoachOverheadExpense.find(filter).sort({ yearMonth: -1, createdAt: -1 });
    res.status(200).json({ success: true, data: items });
  } catch (err) {
    next(err);
  }
};

const createOverhead = async (req, res, next) => {
  try {
    const { yearMonth, category, amount, note } = req.body;
    if (!yearMonth || !/^\d{4}-\d{2}$/.test(yearMonth)) {
      return res.status(400).json({ success: false, message: 'yearMonth must be YYYY-MM' });
    }
    if (!category || !OVERHEAD_CATEGORIES.includes(category)) {
      return res.status(400).json({ success: false, message: 'Invalid category' });
    }
    const amt = Math.floor(Number(amount) || 0);
    if (amt < 1) {
      return res.status(400).json({ success: false, message: 'Amount must be at least 1' });
    }
    const item = await CoachOverheadExpense.create({
      userId: req.user.id,
      yearMonth,
      category,
      amount: amt,
      note: String(note || '').trim().slice(0, 300),
    });
    res.status(201).json({ success: true, data: item });
  } catch (err) {
    next(err);
  }
};

const updateOverhead = async (req, res, next) => {
  try {
    const { category, amount, note } = req.body;
    const update = {};
    if (category !== undefined) {
      if (!OVERHEAD_CATEGORIES.includes(category)) {
        return res.status(400).json({ success: false, message: 'Invalid category' });
      }
      update.category = category;
    }
    if (amount !== undefined) {
      const amt = Math.floor(Number(amount) || 0);
      if (amt < 1) return res.status(400).json({ success: false, message: 'Amount must be at least 1' });
      update.amount = amt;
    }
    if (note !== undefined) update.note = String(note).trim().slice(0, 300);

    const item = await CoachOverheadExpense.findOneAndUpdate(
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

const deleteOverhead = async (req, res, next) => {
  try {
    const item = await CoachOverheadExpense.findOneAndDelete({ _id: req.params.id, userId: req.user.id });
    if (!item) return res.status(404).json({ success: false, message: 'Entry not found' });
    res.status(200).json({ success: true, message: 'Entry deleted' });
  } catch (err) {
    next(err);
  }
};

module.exports = { getOverheads, createOverhead, updateOverhead, deleteOverhead };
