const mongoose = require('mongoose');

const TYPES = ['feature_request', 'issue'];
const STATUSES = ['open', 'in_progress', 'closed'];

const supportTicketSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: TYPES,
      required: [true, 'Type is required'],
    },
    subject: {
      type: String,
      required: [true, 'Subject is required'],
      trim: true,
      maxlength: [120, 'Subject is too long'],
    },
    message: {
      type: String,
      required: [true, 'Message is required'],
      trim: true,
      maxlength: [4000, 'Message is too long'],
    },
    status: {
      type: String,
      enum: STATUSES,
      default: 'open',
      index: true,
    },
    adminReply: {
      type: String,
      trim: true,
      default: '',
    },
  },
  { timestamps: true }
);

supportTicketSchema.index({ userId: 1, createdAt: -1 });

module.exports = mongoose.model('SupportTicket', supportTicketSchema);
module.exports.TYPES = TYPES;
module.exports.STATUSES = STATUSES;
