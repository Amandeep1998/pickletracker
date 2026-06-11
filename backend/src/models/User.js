const mongoose = require('mongoose');

const manualAchievementSchema = new mongoose.Schema(
  {
    tournamentName: {
      type: String,
      required: [true, 'Tournament name is required'],
      trim: true,
      maxlength: [200, 'Tournament name is too long'],
    },
    categoryName: {
      type: String,
      required: [true, 'Category is required'],
      trim: true,
      maxlength: [200, 'Category is too long'],
    },
    medal: {
      type: String,
      required: [true, 'Medal is required'],
      enum: ['Gold', 'Silver', 'Bronze'],
    },
    date: {
      type: String,
      default: null,
      match: [/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format'],
    },
  },
  { _id: false }
);

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      minlength: [1, 'Name cannot be empty'],
      maxlength: [200, 'Name is too long'],
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      default: null,
      validate: {
        validator(v) {
          if (v === null || v === undefined) return true;
          return typeof v === 'string' && v.length > 0;
        },
        message: 'Invalid password value',
      },
    },
    isGoogleUser: {
      type: Boolean,
      default: false,
    },
    whatsappPhone: {
      type: String,
      default: null,
      // Stored as 12-digit format: 919876543210 (no + or spaces)
    },
    whatsappEnabled: {
      type: Boolean,
      default: false,
    },
    companionAccess: {
      type: Boolean,
      default: false,
    },
    city: {
      type: String,
      default: null,
      trim: true,
      maxlength: [100, 'City name is too long'],
    },
    state: {
      type: String,
      default: null,
      trim: true,
      maxlength: [100, 'State name is too long'],
    },
    duprRating: {
      type: Number,
      default: null,
      min: [1, 'DUPR rating must be between 1 and 8'],
      max: [8, 'DUPR rating must be between 1 and 8'],
    },
    duprSingles: {
      type: Number,
      default: null,
      min: [1, 'DUPR singles rating must be between 1 and 8'],
      max: [8, 'DUPR singles rating must be between 1 and 8'],
    },
    duprDoubles: {
      type: Number,
      default: null,
      min: [1, 'DUPR doubles rating must be between 1 and 8'],
      max: [8, 'DUPR doubles rating must be between 1 and 8'],
    },
    playingSince: {
      type: Number,
      default: null,
    },
    profilePhoto: {
      type: String, // base64 data URL
      default: null,
    },
    manualAchievements: {
      type: [manualAchievementSchema],
      default: [],
    },
    currency: {
      type: String,
      default: 'INR',
      enum: ['INR', 'USD', 'AUD', 'EUR', 'GBP', 'CAD', 'SGD', 'MYR', 'PHP'],
    },
    emailReminders: {
      type: Boolean,
      default: true,
    },
    /** IANA time zone for calendar-based emails & push (e.g. America/Los_Angeles, Europe/London). */
    timeZone: {
      type: String,
      default: 'UTC',
      maxlength: [80, 'Time zone is too long'],
    },
    /** `auto` = keep syncing from device (ping-platform); `manual` = user set it in Profile. */
    timeZoneSource: {
      type: String,
      enum: ['auto', 'manual'],
      default: 'auto',
    },
    /** Local calendar date (YYYY-MM-DD in user's timeZone) when morning emails were last run. */
    emailMorningRemindersSentOn: {
      type: String,
      default: null,
    },
    /** Tournament category date (YYYY-MM-DD) we last sent the "play tomorrow" push for. */
    pushLastDayBeforeNudgeEventDate: {
      type: String,
      default: null,
    },
    /** Local calendar date when we last sent the "log today's results" evening push. */
    pushLastEveningResultNudgeLocalDate: {
      type: String,
      default: null,
    },
    onboardingDone: {
      type: Boolean,
      default: false,
    },
    // Sports this user plays (additive, multi-sport groundwork). Defaults to
    // pickleball; onboarding sport-picker (Phase 3) and backfill populate it.
    sports: {
      type: [String],
      default: ['pickleball'],
    },
    /** When false, this user's tournaments are omitted from the Home community feed (likes/comments may still exist on old rows). */
    shareTournamentsOnFeed: {
      type: Boolean,
      default: true,
    },
    roles: {
      type: [String],
      enum: ['player', 'coach', 'organizer'],
      default: ['player'],
    },
    lastSeenPlatform: {
      type: String,
      enum: ['pwa', 'mobile-web', 'desktop-web'],
      default: null,
    },
    platformsUsed: {
      type: [String],
      enum: ['pwa', 'mobile-web', 'desktop-web'],
      default: [],
    },
    /** UTC timestamp of the last time this user received a tournament-activity community nudge. */
    lastTournamentNudgeReceivedAt: {
      type: Date,
      default: null,
    },
    resetPasswordToken: {
      type: String,
      default: null,
    },
    resetPasswordExpires: {
      type: Date,
      default: null,
    },
    /**
     * Consent record captured at signup (clickwrap on the Sign Up / Continue with Google
     * buttons). Stored so we can prove which document versions a user accepted and when —
     * required for GDPR (Art. 7) and useful for CCPA/CPRA audits. `region` is a coarse hint
     * derived client-side from the browser time zone, used only to pick the right age gate.
     */
    consent: {
      acceptedTerms: { type: Boolean, default: false },
      acceptedPrivacy: { type: Boolean, default: false },
      termsVersion: { type: String, default: null }, // e.g. '2026-04-25'
      privacyVersion: { type: String, default: null },
      acceptedAt: { type: Date, default: null },
      ipAtConsent: { type: String, default: null },
      region: { type: String, default: null }, // 'eu' | 'uk' | 'us' | 'other'
    },
    /**
     * Age affirmation captured at signup. We do NOT collect a date of birth (keeps us out of
     * COPPA's "collecting personal info from children" trap); we only record that the user
     * affirmed they meet the minimum age for their region (16 in EU, 13 elsewhere).
     */
    ageConfirmedMinimum: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: {
      transform(doc, ret) {
        delete ret.password;
        return ret;
      },
    },
  }
);

module.exports = mongoose.model('User', userSchema);
