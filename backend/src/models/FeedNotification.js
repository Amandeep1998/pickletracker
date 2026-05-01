const mongoose = require('mongoose');

const feedNotificationSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true, index: true }, // recipient
  actorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true },
  actorName:      { type: String, required: true, trim: true },
  type:           { type: String, enum: ['like', 'comment', 'friend_connected'], required: true },
  tournamentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
  tournamentName: { type: String, trim: true, default: '' },
  commentText:    { type: String, trim: true },   // only for type=comment
  read:           { type: Boolean, default: false, index: true },
}, { timestamps: true });

feedNotificationSchema.pre('validate', function validateFeedNotification(next) {
  if (this.type === 'friend_connected') {
    return next();
  }
  if (!this.tournamentId || !String(this.tournamentName || '').trim()) {
    const err = new Error('tournamentId and tournamentName are required for like/comment notifications');
    err.name = 'ValidationError';
    return next(err);
  }
  return next();
});

feedNotificationSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('FeedNotification', feedNotificationSchema);
