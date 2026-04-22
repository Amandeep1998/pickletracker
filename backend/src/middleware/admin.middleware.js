const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  try {
    const adminEmails = (process.env.ADMIN_EMAIL || '')
      .split(',')
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean);

    if (adminEmails.length === 0) {
      return res.status(403).json({ success: false, message: 'Admin not configured' });
    }

    const user = await User.findById(req.user.id).lean();
    if (!user || !adminEmails.includes(user.email.toLowerCase())) {
      return res.status(403).json({ success: false, message: 'Forbidden' });
    }

    next();
  } catch (err) {
    next(err);
  }
};

module.exports = isAdmin;
