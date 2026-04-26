const mongoose = require('mongoose');

const OVERHEAD_CATEGORIES = [
  'venue_court',
  'travel',
  'materials',
  'software',
  'food',
  'other',
];

const coachOverheadExpenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    /** YYYY-MM — the month this overhead belongs to */
    yearMonth: {
      type: String,
      required: [true, 'Month is required'],
      match: [/^\d{4}-\d{2}$/, 'yearMonth must be YYYY-MM'],
      index: true,
    },
    category: {
      type: String,
      enum: OVERHEAD_CATEGORIES,
      required: [true, 'Category is required'],
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [1, 'Amount must be at least 1'],
    },
    note: {
      type: String,
      maxlength: [300, 'Note too long'],
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('CoachOverheadExpense', coachOverheadExpenseSchema);
module.exports.OVERHEAD_CATEGORIES = OVERHEAD_CATEGORIES;
