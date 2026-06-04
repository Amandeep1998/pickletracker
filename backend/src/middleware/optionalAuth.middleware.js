const jwt = require('jsonwebtoken');
const User = require('../models/User');

/**
 * Optional auth — sets req.user when a valid token is present, otherwise lets
 * the request through anonymously. Used by the pre-auth chat companion: an
 * anonymous visitor can parse a tournament (try-before-auth), then sign in to
 * save it. A bad/expired token is treated as anonymous, not rejected.
 */
const optionalAuth = async (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) return next();

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const exists = await User.exists({ _id: decoded.id });
    if (exists) req.user = decoded;
  } catch {
    /* invalid/expired token → treat as anonymous */
  }
  next();
};

module.exports = optionalAuth;
