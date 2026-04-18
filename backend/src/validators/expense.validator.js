const Joi = require('joi');

const expenseSchema = Joi.object({
  type: Joi.string().valid('gear', 'travel').required().messages({
    'any.only': 'Type must be gear or travel',
    'any.required': 'Expense type is required',
  }),
  title: Joi.string().trim().min(1).max(100).required().messages({
    'any.required': 'Title is required',
    'string.empty': 'Title cannot be empty',
    'string.max': 'Title cannot exceed 100 characters',
  }),
  amount: Joi.number().min(0.01).required().messages({
    'number.min': 'Amount must be greater than 0',
    'number.base': 'Amount must be a number',
    'any.required': 'Amount is required',
  }),
  date: Joi.string()
    .pattern(/^\d{4}-\d{2}-\d{2}$/)
    .required()
    .messages({
      'any.required': 'Date is required',
      'string.pattern.base': 'Date must be in YYYY-MM-DD format',
    }),

  // Travel-only fields (all optional)
  tournamentId:    Joi.string().allow('', null).optional(),
  fromCity:        Joi.string().trim().max(100).allow('').optional(),
  toCity:          Joi.string().trim().max(100).allow('').optional(),
  isInternational: Joi.boolean().optional(),
  transport:       Joi.number().min(0).optional(),
  localCommute:    Joi.number().min(0).optional(),
  accommodation:   Joi.number().min(0).optional(),
  food:            Joi.number().min(0).optional(),
  equipment:       Joi.number().min(0).optional(),
  visaDocs:        Joi.number().min(0).optional(),
  travelInsurance: Joi.number().min(0).optional(),
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

module.exports = { expenseSchema, validate };
