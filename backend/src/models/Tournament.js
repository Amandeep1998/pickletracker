const mongoose = require('mongoose');

const CATEGORIES = [
  // Open
  "Men's Singles Open", "Women's Singles", "Men's Doubles Open", "Women's Doubles", "Mixed Doubles",
  // Beginner
  "Beginner Singles", "Beginner Men's Singles", "Beginner Women's Singles",
  "Beginner Doubles", "Beginner Men's Doubles", "Beginner Women's Doubles", "Beginner Mixed Doubles",
  // Intermediate
  "Intermediate Singles", "Intermediate Men's Singles", "Intermediate Women's Singles",
  "Intermediate Doubles", "Intermediate Men's Doubles", "Intermediate Women's Doubles", "Intermediate Mixed Doubles",
  // Advanced
  "Advanced Men's Singles", "Advanced Women's Singles", "Advanced Men's Doubles", "Advanced Women's Doubles", "Advanced Mixed Doubles",
  // 35+
  "35+ Men's Singles", "35+ Men's Doubles", "35+ Women's Singles", "35+ Women's Doubles", "35+ Mixed Doubles",
  // 40+
  "40+ Men's Singles", "40+ Men's Doubles", "40+ Women's Singles", "40+ Women's Doubles", "40+ Mixed Doubles",
  // 45+
  "45+ Men's Singles", "45+ Men's Doubles", "45+ Women's Singles", "45+ Women's Doubles", "45+ Mixed Doubles",
  // 50+
  "50+ Men's Singles", "50+ Men's Doubles", "50+ Women's Singles", "50+ Women's Doubles", "50+ Mixed Doubles",
  // 55+
  "55+ Men's Singles", "55+ Men's Doubles", "55+ Women's Singles", "55+ Women's Doubles", "55+ Mixed Doubles",
  // 60+
  "Men's Singles 60+", "Men's Doubles 60+", "Women's Singles 60+", "Women's Doubles 60+", "Mixed Doubles 60+",
  // 65+
  "Men's Singles 65+", "Men's Doubles 65+", "Women's Singles 65+", "Women's Doubles 65+", "Mixed Doubles 65+",
  // 70+
  "Men's Singles 70+", "Men's Doubles 70+", "Women's Singles 70+", "Women's Doubles 70+", "Mixed Doubles 70+",
  // Split Age
  "Split Age 35+", "Split Age 40+", "Split Age 50+",
  // Team
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
    calendarEventId: {
      type: String,
      default: null,
    },
    partnerName: {
      type: String,
      trim: true,
      default: '',
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
    location: {
      name: { type: String, default: null },
      address: { type: String, default: null },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      placeId: { type: String, default: null },
    },
    categories: {
      type: [categorySchema],
      required: [true, 'At least one category is required'],
      validate: {
        validator: (v) => Array.isArray(v) && v.length > 0,
        message: 'At least one category is required',
      },
    },
    // Performance feedback (mirrors Session feedback fields)
    rating:    { type: Number, min: 1, max: 5, default: null },
    wentWell:  { type: [String], default: [] },
    wentWrong: { type: [String], default: [] },
    notes:     { type: String, trim: true, default: '' },
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
