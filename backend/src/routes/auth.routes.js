const express = require('express');
const router = express.Router();
const { signup, login, googleAuth, forgotPassword, resetPassword } = require('../controllers/auth.controller');
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

module.exports = router;
