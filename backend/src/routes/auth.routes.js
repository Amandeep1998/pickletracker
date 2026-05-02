const express = require('express');
const router = express.Router();
const { signup, login, googleAuth, forgotPassword, resetPassword, getProfile, updateProfile, deleteAccount, pingPlatform } = require('../controllers/auth.controller');
const protect = require('../middleware/auth.middleware');
const {
  signupSchema,
  loginSchema,
  googleAuthSchema,
  validate,
} = require('../validators/auth.validator');

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/google', validate(googleAuthSchema), googleAuth);
router.post('/forgot-password', forgotPassword);
router.post('/reset-password', resetPassword);
router.get('/profile', protect, getProfile);
router.put('/profile', protect, updateProfile);
router.delete('/account', protect, deleteAccount);
router.post('/ping-platform', protect, pingPlatform);

module.exports = router;
