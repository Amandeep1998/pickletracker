const mongoose = require('mongoose');

const CATEGORIES = [
  "Men's Singles",
  "Women's Singles",
  "Men's Doubles",
  "Women's Doubles",
  'Mixed Doubles',
  'Beginner Singles',
  'Beginner Doubles',
  'Intermediate Singles',
  'Intermediate Doubles',
  'Open Category',
  'Senior (35+, 50+)',
  'Team Event',
];

const categorySchema = new mongoose.Schema(
  {
    _id: false,
    categoryName: {
      type: String,
      required: [true, 'Category name is required'],
      enum: CATEGORIES,
    },
    medal: {
      type: String,
      required: [true, 'Medal is required'],
      enum: ['None', 'Gold', 'Silver', 'Bronze'],
    },
    entryFee: {
      type: Number,
      required: [true, 'Entry fee is required'],
      min: [0, 'Entry fee cannot be negative'],
    },
    prizeAmount: {
      type: Number,
      required: true,
      default: 0,
      min: [0, 'Prize amount cannot be negative'],
    },
  },
  { _id: false }
);

const tournamentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
    },
    categories: {
      type: [categorySchema],
      required: [true, 'At least one category is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one category is required',
      },
    },
    date: {
      type: Date,
      required: [true, 'Date is required'],
      index: true,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Virtual: profit per category
tournamentSchema.virtual('categoryProfits').get(function () {
  return this.categories.map((cat) => ({
    categoryName: cat.categoryName,
    profit: cat.prizeAmount - cat.entryFee,
  }));
});

// Virtual: total tournament profit (sum of all category profits)
tournamentSchema.virtual('totalProfit').get(function () {
  return this.categories.reduce((sum, cat) => sum + (cat.prizeAmount - cat.entryFee), 0);
});

// Virtual: total expenses (sum of entry fees)
tournamentSchema.virtual('totalExpenses').get(function () {
  return this.categories.reduce((sum, cat) => sum + cat.entryFee, 0);
});

// Virtual: total earnings (sum of prize amounts)
tournamentSchema.virtual('totalEarnings').get(function () {
  return this.categories.reduce((sum, cat) => sum + cat.prizeAmount, 0);
});

module.exports = mongoose.model('Tournament', tournamentSchema);
module.exports.CATEGORIES = CATEGORIES;
