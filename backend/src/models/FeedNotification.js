const mongoose = require('mongoose');

const SOCIAL_TYPES = ['like', 'comment', 'friend_connected'];
const SYSTEM_TYPES = ['tournament_reminder', 'log_results'];
const ALL_TYPES = [...SOCIAL_TYPES, ...SYSTEM_TYPES];

const feedNotificationSchema = new mongoose.Schema({
  userId:         { type: mongoose.Schema.Types.ObjectId, ref: 'User',       required: true, index: true }, // recipient
  // Actor fields are required for social events (like / comment / friend_connected) and
  // omitted for system-generated reminders (tournament_reminder / log_results).
  actorId:        { type: mongoose.Schema.Types.ObjectId, ref: 'User',       default: null },
  actorName:      { type: String, trim: true, default: '' },
  type:           { type: String, enum: ALL_TYPES, required: true },
  tournamentId:   { type: mongoose.Schema.Types.ObjectId, ref: 'Tournament', default: null },
  tournamentName: { type: String, trim: true, default: '' },
  // Tournament-reminder + log-results context (YYYY-MM-DD calendar date in user's TZ + category label).
  categoryName:   { type: String, trim: true, default: '' },
  categoryDate:   { type: String, default: null },
  commentText:    { type: String, trim: true },   // only for type=comment
  read:           { type: Boolean, default: false, index: true },
}, { timestamps: true });

feedNotificationSchema.pre('validate', function validateFeedNotification(next) {
  if (this.type === 'friend_connected') {
    if (!this.actorId || !String(this.actorName || '').trim()) {
      const err = new Error('actorId and actorName are required for friend_connected notifications');
      err.name = 'ValidationError';
      return next(err);
    }
    return next();
  }
  if (this.type === 'tournament_reminder' || this.type === 'log_results') {
    if (!this.tournamentId || !String(this.tournamentName || '').trim()) {
      const err = new Error('tournamentId and tournamentName are required for tournament reminders');
      err.name = 'ValidationError';
      return next(err);
    }
    if (!this.categoryName || !this.categoryDate) {
      const err = new Error('categoryName and categoryDate are required for tournament reminders');
      err.name = 'ValidationError';
      return next(err);
    }
    return next();
  }
  // like / comment
  if (!this.actorId || !String(this.actorName || '').trim()) {
    const err = new Error('actorId and actorName are required for like/comment notifications');
    err.name = 'ValidationError';
    return next(err);
  }
  if (!this.tournamentId || !String(this.tournamentName || '').trim()) {
    const err = new Error('tournamentId and tournamentName are required for like/comment notifications');
    err.name = 'ValidationError';
    return next(err);
  }
  return next();
});

feedNotificationSchema.index({ userId: 1, createdAt: -1 });

// Per-(user, tournament, category, date, type) dedup for system reminders so the cron
// can attempt to create the row and let MongoDB enforce "send once" semantics.
feedNotificationSchema.index(
  { userId: 1, tournamentId: 1, categoryDate: 1, categoryName: 1, type: 1 },
  {
    unique: true,
    partialFilterExpression: { type: { $in: SYSTEM_TYPES } },
    name: 'system_reminder_dedup',
  }
);

module.exports = mongoose.model('FeedNotification', feedNotificationSchema);
module.exports.SOCIAL_TYPES = SOCIAL_TYPES;
module.exports.SYSTEM_TYPES = SYSTEM_TYPES;
