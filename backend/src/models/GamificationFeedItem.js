const mongoose = require('mongoose');

const reactionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    emoji: {
      type: String,
      enum: ['🔥', '💪', '👏'],
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false }
);

const gamificationFeedItemSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['achievement_unlock', 'level_up'],
      required: true,
    },
    achievementId: {
      type: String,
      default: null,
    },
    newLevel: {
      type: Number,
      default: null,
    },
    achievementTier: {
      type: String,
      enum: ['common', 'uncommon', 'rare', 'epic', 'legendary', null],
      default: null,
    },
    reactions: {
      type: [reactionSchema],
      default: [],
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('GamificationFeedItem', gamificationFeedItemSchema);
