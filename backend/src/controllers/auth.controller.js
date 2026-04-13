const bcrypt = require('bcrypt');
const crypto = require('crypto');
const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { verifyIdToken } = require('../services/firebaseAdmin.service');
const { sendPasswordResetEmail } = require('../services/email.service');

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
    whatsappPhone: user.whatsappPhone || null,
    city: user.city || null,
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
    let isNewUser = false;

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
      isNewUser = true;
    }

    const token = signUserToken(user);

    res.status(200).json({
      success: true,
      token,
      user: publicUser(user),
      isNewUser,
    });
  } catch (err) {
    next(err);
  }
};

const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    console.log('[ForgotPassword] Request received for:', email);

    const user = await User.findOne({ email: email?.toLowerCase().trim() });
    console.log('[ForgotPassword] User found:', !!user, '| isGoogleUser:', user?.isGoogleUser);

    // Always respond with success to avoid revealing whether an email exists
    if (!user || user.isGoogleUser) {
      return res.json({ success: true });
    }

    // If Resend API key is not configured, respond immediately so the UI doesn't hang
    if (!process.env.RESEND_API_KEY) {
      console.warn('[ForgotPassword] RESEND_API_KEY not configured — skipping send');
      return res.json({ success: true });
    }

    console.log('[ForgotPassword] RESEND_API_KEY found, generating token...');

    const rawToken = crypto.randomBytes(32).toString('hex');
    const hashed = crypto.createHash('sha256').update(rawToken).digest('hex');

    user.resetPasswordToken = hashed;
    user.resetPasswordExpires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour
    await user.save();

    const appUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
    const resetUrl = `${appUrl}/reset-password?token=${rawToken}`;

    console.log('[ForgotPassword] Token saved, sending email to:', user.email);

    // Respond immediately — don't make the user wait for email delivery
    res.json({ success: true });

    // Send email in background; roll back token if it fails
    sendPasswordResetEmail(user.email, resetUrl)
      .then(() => console.log('[ForgotPassword] Email sent successfully to:', user.email))
      .catch(async (emailErr) => {
        console.error('[ForgotPassword] Email send failed:', emailErr.message);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save().catch(() => {});
      });
  } catch (err) {
    next(err);
  }
};

const resetPassword = async (req, res, next) => {
  try {
    const { token, password } = req.body;
    if (!token || !password || password.length < 6) {
      return res.status(400).json({ success: false, message: 'Invalid request' });
    }

    const hashed = crypto.createHash('sha256').update(token).digest('hex');
    const user = await User.findOne({
      resetPasswordToken: hashed,
      resetPasswordExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: 'Reset link is invalid or has expired.' });
    }

    user.password = await bcrypt.hash(password, 12);
    user.resetPasswordToken = null;
    user.resetPasswordExpires = null;
    await user.save();

    res.json({ success: true, message: 'Password updated successfully.' });
  } catch (err) {
    next(err);
  }
};

const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).lean();
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });
    res.json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

const updateProfile = async (req, res, next) => {
  try {
    const { name, city, whatsappPhone } = req.body;
    const update = {};

    if (name !== undefined) {
      const trimmed = String(name).trim();
      if (!trimmed) return res.status(400).json({ success: false, message: 'Name cannot be empty' });
      update.name = trimmed;
    }
    if (city !== undefined) update.city = city ? String(city).trim().slice(0, 100) : null;
    if (whatsappPhone !== undefined) {
      if (whatsappPhone) {
        const digits = String(whatsappPhone).replace(/\D/g, '');
        if (digits.length < 10 || digits.length > 13) {
          return res.status(400).json({ success: false, message: 'Enter a valid mobile number' });
        }
        update.whatsappPhone = digits.length === 10 ? `91${digits}` : digits;
      } else {
        update.whatsappPhone = null;
      }
    }

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.json({ success: true, data: publicUser(user) });
  } catch (err) {
    next(err);
  }
};

module.exports = { signup, login, googleAuth, forgotPassword, resetPassword, getProfile, updateProfile };
