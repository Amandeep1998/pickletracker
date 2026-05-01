const mongoose = require('mongoose');

// Tracks when the last batched "likes" push was sent per (recipient, tournament).
// Used to debounce like push notifications — one push per 5-minute window.
const feedLikePushLogSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  pushedAt:     { type: Date, required: true },
});

feedLikePushLogSchema.index({ userId: 1, tournamentId: 1 }, { unique: true });

module.exports = mongoose.model('FeedLikePushLog', feedLikePushLogSchema);
