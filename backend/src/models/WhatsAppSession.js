const mongoose = require('mongoose');

const schema = new mongoose.Schema({
  waId: { type: String, required: true, unique: true },
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  state: { type: String, default: 'LINK_EMAIL' },
  // Stores in-progress tournament data and temporary choices during ADD flow
  context: { type: mongoose.Schema.Types.Mixed, default: {} },
  updatedAt: { type: Date, default: Date.now },
});

// Sessions expire 24 hours after last activity
schema.index({ updatedAt: 1 }, { expireAfterSeconds: 86400 });

module.exports = mongoose.model('WhatsAppSession', schema);
