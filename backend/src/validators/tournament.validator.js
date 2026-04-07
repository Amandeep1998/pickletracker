const Joi = require('joi');

const CATEGORIES = [
  "Men's Singles",
  "Women's Singles",
  "Men's Doubles",
  "Women's Doubles",
  'Mixed Doubles',
  'Beginner Singles',
  'Beginner Doubles',
  'Intermediate Singles',
  'Intermediate Doubles',
  'Open Category',
  'Senior (35+, 50+)',
  'Team Event',
];

const categorySchema = Joi.object({
  categoryName: Joi.string()
    .valid(...CATEGORIES)
    .required()
    .messages({
      'any.only': 'Invalid category',
      'any.required': 'Category name is required',
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
});

const tournamentSchema = Joi.object({
  name: Joi.string().trim().min(1).required().messages({
    'any.required': 'Tournament name is required',
    'string.empty': 'Tournament name cannot be empty',
  }),
  categories: Joi.array()
    .items(categorySchema)
    .min(1)
    .required()
    .messages({
      'array.min': 'At least one category is required',
      'any.required': 'Categories are required',
    }),
  date: Joi.date().required().messages({
    'any.required': 'Date is required',
    'date.base': 'Please provide a valid date',
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
