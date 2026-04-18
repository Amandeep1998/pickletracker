const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      required: [true, 'Expense type is required'],
      enum: ['gear', 'travel'],
    },
    title: {
      type: String,
      required: [true, 'Title is required'],
      trim: true,
    },
    amount: {
      type: Number,
      required: [true, 'Amount is required'],
      min: [0.01, 'Amount must be greater than 0'],
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },

    // Travel-only fields
    tournamentId:    { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
    fromCity:        { type: String, trim: true, default: '' },
    toCity:          { type: String, trim: true, default: '' },
    isInternational: { type: Boolean, default: false },
    transport:       { type: Number, default: 0 }, // flight / train / bus / fuel
    localCommute:    { type: Number, default: 0 }, // cabs, auto, metro
    accommodation:   { type: Number, default: 0 }, // hotel / hostel
    food:            { type: Number, default: 0 }, // all meals
    equipment:       { type: Number, default: 0 }, // baggage fees, gear transport
    visaDocs:        { type: Number, default: 0 }, // visa + passport (international)
    travelInsurance: { type: Number, default: 0 }, // sports coverage (international)
  },
  { timestamps: true }
);

module.exports = mongoose.model('Expense', expenseSchema);
