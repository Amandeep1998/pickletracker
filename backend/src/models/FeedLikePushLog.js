const mongoose = require('mongoose');

// Legacy collection — like pushes were debounced (removed); documents may remain in DB.
const feedLikePushLogSchema = new mongoose.Schema({
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  pushedAt:     { type: Date, required: true },
});

feedLikePushLogSchema.index({ userId: 1, tournamentId: 1 }, { unique: true });

module.exports = mongoose.model('FeedLikePushLog', feedLikePushLogSchema);
