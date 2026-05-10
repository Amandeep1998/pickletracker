const mongoose = require('mongoose');

const unlockedAchievementSchema = new mongoose.Schema(
  {
    achievementId: {
      type: String,
      required: true,
    },
    unlockedAt: {
      type: Date,
      required: true,
      default: Date.now,
    },
    sharedToFeed: {
      type: Boolean,
      default: false,
    },
  },
  { _id: false }
);

const userProgressSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      unique: true,
      index: true,
    },
    xp: {
      type: Number,
      default: 0,
    },
    level: {
      type: Number,
      default: 1,
      min: 1,
      max: 20,
    },
    achievements: {
      type: [unlockedAchievementSchema],
      default: [],
    },
    lastChecked: {
      type: Date,
      default: Date.now,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('UserProgress', userProgressSchema);
