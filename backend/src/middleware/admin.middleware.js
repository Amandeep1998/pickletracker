const User = require('../models/User');

const isAdmin = async (req, res, next) => {
  const adminEmail = process.env.ADMIN_EMAIL;
  if (!adminEmail) {
    return res.status(403).json({ success: false, message: 'Admin not configured' });
  }

  const user = await User.findById(req.user.id).lean();
  if (!user || user.email !== adminEmail.toLowerCase()) {
    return res.status(403).json({ success: false, message: 'Forbidden' });
  }

  next();
};

module.exports = isAdmin;
