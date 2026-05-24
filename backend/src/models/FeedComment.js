const mongoose = require('mongoose');

const feedCommentSchema = new mongoose.Schema({
  tournamentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  userId:       { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
  userName:     { type: String, required: true, trim: true },
  text:         { type: String, required: true, trim: true, maxlength: 500 },
  parentId:     { type: mongoose.Schema.Types.ObjectId, ref: 'FeedComment', default: null },
}, { timestamps: true });

feedCommentSchema.index({ tournamentId: 1, createdAt: 1 });
feedCommentSchema.index({ parentId: 1 });

module.exports = mongoose.model('FeedComment', feedCommentSchema);
