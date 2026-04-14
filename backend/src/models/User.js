const mongoose = require('mongoose');

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
    playingSince: {
      type: Number,
      default: null,
    },
    profilePhoto: {
      type: String, // base64 data URL
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
