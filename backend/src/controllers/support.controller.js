const SupportTicket = require('../models/SupportTicket');
const User = require('../models/User');
const { sendNotificationEmail } = require('../services/email.service');

const TYPES = SupportTicket.TYPES;

// POST /api/support
const createTicket = async (req, res, next) => {
  try {
    const { type, subject, message } = req.body || {};
    if (!TYPES.includes(type)) {
      return res.status(400).json({ success: false, message: 'Invalid ticket type' });
    }
    const cleanSubject = String(subject || '').trim();
    const cleanMessage = String(message || '').trim();
    if (!cleanSubject) {
      return res.status(400).json({ success: false, message: 'Subject is required' });
    }
    if (!cleanMessage) {
      return res.status(400).json({ success: false, message: 'Message is required' });
    }

    const ticket = await SupportTicket.create({
      userId: req.user.id,
      type,
      subject: cleanSubject,
      message: cleanMessage,
    });

    // Best-effort email to admin — don't block the response or fail the request.
    const adminEmail = (process.env.ADMIN_EMAIL || '').split(',')[0].trim();
    if (adminEmail) {
      const requester = await User.findById(req.user.id).select('name email').lean().catch(() => null);
      const typeLabel = type === 'feature_request' ? 'Feature request' : 'Issue';
      const html = `
        <div style="font-family: Arial, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; background: #ffffff;">
          <h2 style="font-size: 18px; color: #272702; margin: 0 0 12px;">New ${typeLabel}</h2>
          <p style="color: #6b7280; font-size: 13px; margin: 0 0 16px;">
            From <strong>${requester?.name || 'Unknown'}</strong>
            ${requester?.email ? ` · <a href="mailto:${requester.email}">${requester.email}</a>` : ''}
          </p>
          <p style="font-size: 14px; color: #272702; margin: 0 0 6px;"><strong>Subject:</strong> ${escapeHtml(cleanSubject)}</p>
          <div style="background: #f9fafb; border: 1px solid #f3f4f6; border-radius: 8px; padding: 12px; color: #374151; font-size: 13px; white-space: pre-wrap;">${escapeHtml(cleanMessage)}</div>
          <p style="color: #9ca3af; font-size: 11px; margin-top: 16px;">Ticket ID: ${ticket._id}</p>
        </div>
      `;
      sendNotificationEmail({
        to: adminEmail,
        subject: `[PickleTracker Support] ${typeLabel}: ${cleanSubject.slice(0, 80)}`,
        html,
      }).catch((err) => console.error('[Support] admin email failed:', err?.message || err));
    }

    res.status(201).json({ success: true, data: ticket });
  } catch (err) {
    next(err);
  }
};

// GET /api/support — list tickets for the current user
const listMyTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(50)
      .lean();
    res.json({ success: true, data: tickets });
  } catch (err) {
    next(err);
  }
};

// DELETE /api/support/:id — only the owner can delete their own ticket
const deleteTicket = async (req, res, next) => {
  try {
    const deleted = await SupportTicket.findOneAndDelete({
      _id: req.params.id,
      userId: req.user.id,
    });
    if (!deleted) {
      return res.status(404).json({ success: false, message: 'Ticket not found' });
    }
    res.json({ success: true, message: 'Ticket deleted' });
  } catch (err) {
    next(err);
  }
};

function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

module.exports = { createTicket, listMyTickets, deleteTicket };
