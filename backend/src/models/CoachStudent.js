const mongoose = require('mongoose');

const coachStudentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
      maxlength: [100, 'Name too long'],
    },
    phone: { type: String, default: '', maxlength: 20 },
    notes: { type: String, default: '', maxlength: 300 },
  },
  { timestamps: true }
);

coachStudentSchema.index({ userId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('CoachStudent', coachStudentSchema);
