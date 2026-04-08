const mongoose = require('mongoose');

const CATEGORIES = [
  "Men's Singles Open",
  "Women's Singles",
  "Men's Doubles Open",
  "Women's Doubles",
  "Mixed Doubles",

  "Beginner Singles",
  "Beginner Doubles",
  "Intermediate Singles",
  "Intermediate Doubles",

  "Advanced Men's Singles",
  "Advanced Men's Doubles",

  "35+ Men's Singles",
  "35+ Men's Doubles",
  "35+ Women's Singles",
  "35+ Women's Doubles",
  "35+ Mixed Doubles",

  "50+ Men's Singles",
  "50+ Men's Doubles",
  "50+ Women's Singles",
  "50+ Women's Doubles",
  "50+ Mixed Doubles",

  "Split Age 35+",
  "Split Age 40+",
  "Split Age 50+",

  "Men's Singles 60+",
  "Men's Doubles 60+",

  "Team Event",
];

const categorySchema = new mongoose.Schema(
  {
    _id: false,
    categoryName: {
      type: String,
      required: [true, 'Category name is required'],
      enum: CATEGORIES,
    },
    date: {
      type: String,
      required: [true, 'Category date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
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
