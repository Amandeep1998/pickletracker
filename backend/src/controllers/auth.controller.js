const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyIdToken } = require('../services/firebaseAdmin.service');

function signUserToken(user) {
  return jwt.sign(
    {
      id: user._id.toString(),
      name: user.name,
      email: user.email,
      isGoogleUser: Boolean(user.isGoogleUser),
    },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    isGoogleUser: Boolean(user.isGoogleUser),
  };
}

const signup = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    const existingEmail = await User.findOne({ email });
    if (existingEmail) {
      return res.status(409).json({ success: false, message: 'Email already in use' });
    }

    const hash = await bcrypt.hash(password, 12);
    await User.create({
      name: name.trim(),
      email,
      password: hash,
      isGoogleUser: false,
    });

    res.status(201).json({ success: true, message: 'Account created successfully' });
  } catch (err) {
    next(err);
  }
};

const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email }).lean();
    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    if (!user.password || user.isGoogleUser) {
      return res.status(401).json({
        success: false,
        message: 'This account uses Google sign-in. Please use Continue with Google.',
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Invalid credentials' });
    }

    const token = signUserToken(user);

    res.status(200).json({
      success: true,
      token,
      user: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Google sign-in: verifies Firebase ID token, then finds or creates user.
 * Email is always taken from the verified token (never trusted from the client alone).
 */
const googleAuth = async (req, res, next) => {
  try {
    const { idToken, name: bodyName, email: bodyEmail } = req.body;

    let decoded;
    try {
      decoded = await verifyIdToken(idToken);
    } catch (err) {
      if (err.code === 'FIREBASE_NOT_CONFIGURED') {
        return res.status(503).json({
          success: false,
          message: 'Google sign-in is not configured on the server.',
        });
      }
      return res.status(401).json({ success: false, message: 'Invalid or expired Google token' });
    }

    const provider = decoded.firebase?.sign_in_provider;
    if (provider && provider !== 'google.com') {
      return res.status(400).json({ success: false, message: 'Expected a Google sign-in' });
    }

    const email = decoded.email?.toLowerCase();
    if (!email) {
      return res.status(400).json({ success: false, message: 'Google account has no email' });
    }

    if (decoded.email_verified === false) {
      return res.status(403).json({ success: false, message: 'Email is not verified' });
    }

    const nameFromToken = typeof decoded.name === 'string' ? decoded.name.trim() : '';
    const nameFromBody = typeof bodyName === 'string' ? bodyName.trim() : '';
    const name =
      nameFromBody ||
      nameFromToken ||
      (typeof bodyEmail === 'string' && bodyEmail.includes('@')
        ? bodyEmail.split('@')[0]
        : email.split('@')[0]);

    let user = await User.findOne({ email });

    if (user) {
      if (user.password && !user.isGoogleUser) {
        return res.status(409).json({
          success: false,
          message:
            'An account with this email already exists. Sign in with your email and password.',
        });
      }

      if (name && user.name !== name) {
        user.name = name;
        await user.save();
      }
    } else {
      user = await User.create({
        name,
        email,
        password: null,
        isGoogleUser: true,
      });
    }

    const token = signUserToken(user);

    res.status(200).json({
      success: true,
      token,
      user: publicUser(user),
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, googleAuth };
