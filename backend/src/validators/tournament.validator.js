const Joi = require('joi');

const CATEGORIES = [
  // Open
  "Men's Singles Open", "Women's Singles", "Men's Doubles Open", "Women's Doubles", "Mixed Doubles",
  // Beginner
  "Beginner Singles", "Beginner Men's Singles", "Beginner Women's Singles",
  "Beginner Doubles", "Beginner Men's Doubles", "Beginner Women's Doubles", "Beginner Mixed Doubles",
  // Intermediate
  "Intermediate Singles", "Intermediate Men's Singles", "Intermediate Women's Singles",
  "Intermediate Doubles", "Intermediate Men's Doubles", "Intermediate Women's Doubles", "Intermediate Mixed Doubles",
  // Advanced
  "Advanced Men's Singles", "Advanced Women's Singles", "Advanced Men's Doubles", "Advanced Women's Doubles", "Advanced Mixed Doubles",
  // 35+
  "35+ Men's Singles", "35+ Men's Doubles", "35+ Women's Singles", "35+ Women's Doubles", "35+ Mixed Doubles",
  // 40+
  "40+ Men's Singles", "40+ Men's Doubles", "40+ Women's Singles", "40+ Women's Doubles", "40+ Mixed Doubles",
  // 45+
  "45+ Men's Singles", "45+ Men's Doubles", "45+ Women's Singles", "45+ Women's Doubles", "45+ Mixed Doubles",
  // 50+
  "50+ Men's Singles", "50+ Men's Doubles", "50+ Women's Singles", "50+ Women's Doubles", "50+ Mixed Doubles",
  // 55+
  "55+ Men's Singles", "55+ Men's Doubles", "55+ Women's Singles", "55+ Women's Doubles", "55+ Mixed Doubles",
  // 60+
  "Men's Singles 60+", "Men's Doubles 60+", "Women's Singles 60+", "Women's Doubles 60+", "Mixed Doubles 60+",
  // 65+
  "Men's Singles 65+", "Men's Doubles 65+", "Women's Singles 65+", "Women's Doubles 65+", "Mixed Doubles 65+",
  // 70+
  "Men's Singles 70+", "Men's Doubles 70+", "Women's Singles 70+", "Women's Doubles 70+", "Mixed Doubles 70+",
  // Split Age
  "Split Age 35+", "Split Age 40+", "Split Age 50+",
  // Team
  "Team Event",
];

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
    otherwise: Joi.number().min(0.01).required().messages({
      'number.min': 'Winning amount must be greater than 0 when a medal is awarded',
      'any.required': 'Winning amount is required when a medal is awarded',
    }),
  }),
  entryFee: Joi.number().min(0).required().messages({
    'number.min': 'Entry fee cannot be negative',
    'any.required': 'Entry fee is required',
  }),
  calendarEventId: Joi.string().allow(null, '').optional(),
});

const tournamentSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    'any.required': 'Tournament name is required',
    'string.empty': 'Tournament name cannot be empty',
  }),
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
