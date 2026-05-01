const mongoose = require('mongoose');

const feedLikeSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
}, { timestamps: true });

// One like per user per tournament
feedLikeSchema.index({ tournamentId: 1, userId: 1 }, { unique: true });

module.exports = mongoose.model('FeedLike', feedLikeSchema);
