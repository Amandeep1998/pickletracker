const mongoose = require('mongoose');

const feedNotificationSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true, index: true }, // recipient
  actorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
  actorName:      { type: String, required: true, trim: true },
  type:           { type: String, enum: ['like', 'comment'], required: true },
  tournamentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', required: true },
  tournamentName: { type: String, required: true, trim: true },
  commentText:    { type: String, trim: true },   // only for type=comment
  read:           { type: Boolean, default: false, index: true },
}, { timestamps: true });

feedNotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('FeedNotification', feedNotificationSchema);
