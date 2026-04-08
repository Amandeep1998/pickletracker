const Joi = require('joi');

const signupSchema = Joi.object({
  name: Joi.string().min(1).max(200).required().messages({
    'string.min': 'Name is required',
    'string.max': 'Name cannot exceed 200 characters',
    'any.required': 'Name is required',
  }),
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().min(6).required().messages({
    'string.min': 'Password must be at least 6 characters',
    'any.required': 'Password is required',
  }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().required().messages({
    'string.email': 'Please provide a valid email',
    'any.required': 'Email is required',
  }),
  password: Joi.string().required().messages({
    'any.required': 'Password is required',
  }),
});

const googleAuthSchema = Joi.object({
  idToken: Joi.string().required().messages({
    'any.required': 'Google credential is required',
    'string.empty': 'Google credential is required',
  }),
  name: Joi.string().max(200).allow('').optional(),
  email: Joi.string().email().optional(),
});

const validate = (schema) => (req, res, next) => {
  const { error } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  next();
};

module.exports = { signupSchema, loginSchema, googleAuthSchema, validate };
