const express = require('express');
const router = express.Router();
const { signup, login, googleAuth } = require('../controllers/auth.controller');
const {
  signupSchema,
  loginSchema,
  googleAuthSchema,
  validate,
} = require('../validators/auth.validator');

router.post('/signup', validate(signupSchema), signup);
router.post('/login', validate(loginSchema), login);
router.post('/google', validate(googleAuthSchema), googleAuth);

module.exports = router;
