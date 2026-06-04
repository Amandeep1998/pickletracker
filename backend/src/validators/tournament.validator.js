const Joi = require('joi');
const { CATEGORIES } = require('../config/categories');

const categorySchema = Joi.object({
  categoryName: Joi.string()
    .valid(...CATEGORIES)
    .required()
    .messages({
      'any.only': 'Invalid category',
      'any.required': 'Category name is required',
    }),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'any.required': 'Category date is required',
      'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    }),
  medal: Joi.string().valid('None', 'Gold', 'Silver', 'Bronze').required().messages({
    'any.only': 'Medal must be None, Gold, Silver, or Bronze',
    'any.required': 'Medal is required',
  }),
  prizeAmount: Joi.when('medal', {
    is: 'None',
    then: Joi.number().valid(0).default(0).messages({
      'any.only': 'Winning amount must be 0 when medal is None',
    }),
    otherwise: Joi.number().min(0).required().messages({
      'number.min': 'Winning amount cannot be negative',
      'any.required': 'Winning amount is required when a medal is awarded',
    }),
  }),
  entryFee: Joi.number().min(0).required().messages({
    'number.min': 'Entry fee cannot be negative',
    'any.required': 'Entry fee is required',
  }),
  calendarEventId: Joi.string().allow(null, '').optional(),
  partnerName: Joi.string().allow('', null).trim().optional(),
});

const tournamentSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    'any.required': 'Tournament name is required',
    'string.empty': 'Tournament name cannot be empty',
  }),
  sport: Joi.string().trim().default('pickleball'),
  location: Joi.object({
    name: Joi.string().allow(null, '').optional(),
    address: Joi.string().allow(null, '').optional(),
    lat: Joi.number().allow(null).optional(),
    lng: Joi.number().allow(null).optional(),
    placeId: Joi.string().allow(null, '').optional(),
  }).optional(),
  categories: Joi.array()
    .items(categorySchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one category is required',
      'any.required': 'Categories are required',
    }),
});

const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, { abortEarly: false, stripUnknown: true });
  if (error) {
    const errors = error.details.map((d) => d.message);
    return res.status(400).json({ success: false, message: 'Validation failed', errors });
  }
  req.body = value;
  next();
};

module.exports = { tournamentSchema, validate };
