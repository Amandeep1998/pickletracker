const mongoose = require('mongoose');

const COACHING_TYPES = [
  'private_lesson',
  'group_session',
  'workshop',
  'bootcamp',
  'monthly_package',
];

/** How gross revenue for this line is determined */
const INCOME_MODES = ['per_head', 'lump'];

/** For lump lines: what kind of package (optional, for labels/filters) */
const LUMP_CONTEXTS = ['', 'monthly', 'prepaid', 'revenue_split', 'other'];

const EXPENSE_CATS = [
  'travel',
  'venue_court',
  'materials',
  'parking',
  'software',
  'insurance',
  'membership',
  'assistant_split',
  'other',
];

const coachingExpenseItemSchema = new mongoose.Schema(
  {
    category: {
      type: String,
      enum: EXPENSE_CATS,
      required: true,
    },
    amount: {
      type: Number,
      min: [0, 'Amount cannot be negative'],
      required: true,
    },
    note: {
      type: String,
      maxlength: [200, 'Note is too long'],
      default: '',
    },
  },
  { _id: true }
);

function sumExpenseItems(items) {
  if (!Array.isArray(items) || !items.length) return 0;
  return items.reduce((s, e) => s + (Number(e.amount) || 0), 0);
}

const coachingIncomeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: COACHING_TYPES,
      required: [true, 'Session type is required'],
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
    },
    studentNames: {
      type: [String],
      default: [],
    },
    students: {
      type: Number,
      min: [1, 'Must have at least 1 student'],
      required: [true, 'Student count is required'],
    },
    feePerStudent: {
      type: Number,
      min: [0, 'Fee cannot be negative'],
      required: [true, 'Fee per student is required'],
    },
    /**
     * per_head — totalEarned = students × feePerStudent (per-session, drop-in, group rate).
     * lump — totalEarned = lumpAmount (monthly packages, 10-packs, revenue splits, one-off flat fees).
     */
    incomeInputMode: {
      type: String,
      enum: INCOME_MODES,
      default: 'per_head',
    },
    /** Gross for this line when incomeInputMode is lump (e.g. monthly retainer, prepaid pack allocation) */
    lumpAmount: {
      type: Number,
      min: [0, 'Lump amount cannot be negative'],
    },
    /** Short line shown in lists, e.g. "April retainer", "8-pack: session 2/8" */
    lumpLabel: {
      type: String,
      maxlength: [200, 'Label is too long'],
      default: '',
    },
    /** Optional: monthly vs prepaid-visit share vs club split (UI hint only) */
    lumpContext: {
      type: String,
      enum: LUMP_CONTEXTS,
      default: '',
    },
    totalEarned: {
      type: Number,
      min: [0, 'Total cannot be negative'],
    },
    /** Optional costs for this session (travel, court share, etc.) */
    expenseItems: {
      type: [coachingExpenseItemSchema],
      default: [],
    },
    expensesTotal: {
      type: Number,
      min: [0, 'Expenses total cannot be negative'],
      default: 0,
    },
    paid: {
      type: Boolean,
      default: true,
    },
    notes: {
      type: String,
      maxlength: [1000, 'Notes cannot exceed 1000 characters'],
      default: '',
    },
  },
  { timestamps: true }
);

// Auto-compute totalEarned and expensesTotal before save
coachingIncomeSchema.pre('save', function (next) {
  if (this.incomeInputMode === 'lump') {
    this.totalEarned = Math.max(0, Number(this.lumpAmount) || 0);
  } else {
    this.totalEarned = (Number(this.students) || 0) * (Number(this.feePerStudent) || 0);
  }
  this.expensesTotal = sumExpenseItems(this.expenseItems);
  next();
});

module.exports = mongoose.model('CoachingIncome', coachingIncomeSchema);
module.exports.COACHING_TYPES = COACHING_TYPES;
module.exports.EXPENSE_CATS = EXPENSE_CATS;
module.exports.INCOME_MODES = INCOME_MODES;
module.exports.LUMP_CONTEXTS = LUMP_CONTEXTS;
module.exports.sumExpenseItems = sumExpenseItems;
