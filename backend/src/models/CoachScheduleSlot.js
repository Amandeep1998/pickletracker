const mongoose = require('mongoose');

const SLOT_STATUSES = ['pending', 'completed', 'cancelled'];
const SESSION_EXPENSE_CATS = ['travel', 'venue_court', 'materials', 'other'];

const sessionExpenseSchema = new mongoose.Schema(
  {
    category: { type: String, enum: SESSION_EXPENSE_CATS, required: true },
    amount: { type: Number, min: [0, 'Amount cannot be negative'], required: true },
    note: { type: String, maxlength: [200, 'Note too long'], default: '' },
  },
  { _id: true }
);

const coachScheduleSlotSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    studentNames: {
      type: [String],
      default: [],
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
      index: true,
    },
    startTime: {
      type: String,
      required: [true, 'Start time is required'],
      match: [/^\d{2}:\d{2}$/, 'Start time must be HH:MM'],
    },
    endTime: {
      type: String,
      required: [true, 'End time is required'],
      match: [/^\d{2}:\d{2}$/, 'End time must be HH:MM'],
    },
    feeAmount: {
      type: Number,
      required: [true, 'Fee amount is required'],
      min: [1, 'Fee must be at least 1'],
    },
    sessionExpenses: {
      type: [sessionExpenseSchema],
      default: [],
    },
    expensesTotal: {
      type: Number,
      min: [0, 'Expenses total cannot be negative'],
      default: 0,
    },
    notes: {
      type: String,
      maxlength: [500, 'Notes too long'],
      default: '',
    },
    status: {
      type: String,
      enum: SLOT_STATUSES,
      default: 'pending',
      index: true,
    },
    linkedIncomeId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'CoachingIncome',
      default: null,
    },
  },
  { timestamps: true }
);

coachScheduleSlotSchema.pre('save', function (next) {
  this.expensesTotal = (this.sessionExpenses || []).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  next();
});

module.exports = mongoose.model('CoachScheduleSlot', coachScheduleSlotSchema);
module.exports.SLOT_STATUSES = SLOT_STATUSES;
module.exports.SESSION_EXPENSE_CATS = SESSION_EXPENSE_CATS;
