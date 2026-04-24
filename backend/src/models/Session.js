const mongoose = require('mongoose');

const SKILL_TAGS = [
  'Serve',
  'Return of serve',
  'Third shot drop',
  'Third shot drive',
  'Dinking',
  'Backhand',
  'Forehand',
  'Volleys',
  'Lob',
  'Reset',
  'Poaching',
  'Speed-up',
  'Erne',
  'Drop shot',
  'Kitchen play',
  'Transition zone',
  'Movement',
  'Stamina',
  'Communication',
  'Patience',
  'Aggression',
  'Mental focus',
  'Stacking',
];

const SESSION_TYPES = ['tournament', 'casual', 'practice'];

const sessionSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: SESSION_TYPES,
      required: [true, 'Session type is required'],
    },
    date: {
      type: String,
      required: [true, 'Date is required'],
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD'],
    },
    location: {
      name: { type: String, default: null },
      address: { type: String, default: null },
      lat: { type: Number, default: null },
      lng: { type: Number, default: null },
      placeId: { type: String, default: null },
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: [1, 'Rating must be 1–5'],
      max: [5, 'Rating must be 1–5'],
    },
    wentWell: {
      type: [String],
      default: [],
    },
    wentWrong: {
      type: [String],
      default: [],
    },
    notes: {
      type: String,
      maxlength: [2000, 'Notes cannot exceed 2000 characters'],
      default: '',
    },
    courtFee: {
      type: Number,
      min: [0, 'Court fee cannot be negative'],
      default: 0,
    },
    travelExpense: {
      type: Number,
      min: [0, 'Travel expense cannot be negative'],
      default: 0,
    },
    // Optional link to a Tournament document (for tournament-type sessions)
    tournamentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Tournament',
      default: null,
    },
    // Casual-only: how the session was played
    playFormat: {
      type: String,
      enum: ['singles', 'doubles', 'both'],
      default: null,
    },
    // Drill-only fields
    drillFocus:  { type: [String], default: [] },
    drillMode:   { type: String, enum: ['solo', 'partner', 'group'], default: null },
    coached:     { type: Boolean, default: false },
    duration:    { type: Number, min: 1, default: null },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Session', sessionSchema);
module.exports.SKILL_TAGS = SKILL_TAGS;
module.exports.SESSION_TYPES = SESSION_TYPES;
