const Joi = require('joi');

// ── Sanitise a string: strip HTML tags ─────────────────────────────────────
const stripHtml = (str) => (typeof str === 'string' ? str.replace(/<[^>]*>/g, '') : str);

// ── Generic validator factory ───────────────────────────────────────────────
const validate = (schema) => (req, res, next) => {
  const { error, value } = schema.validate(req.body, {
    abortEarly: false,     // Report all errors, not just the first
    stripUnknown: true,    // Remove fields not in schema (prevent param pollution)
    convert: true,
  });

  if (error) {
    const messages = error.details.map((d) => d.message.replace(/['"]/g, ''));
    return res.status(400).json({ success: false, errors: messages });
  }

  // Deep-sanitise all string values in the validated body
  req.body = sanitiseObject(value);
  next();
};

function sanitiseObject(obj) {
  if (typeof obj === 'string') return stripHtml(obj);
  if (Array.isArray(obj)) return obj.map(sanitiseObject);
  if (obj && typeof obj === 'object') {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, sanitiseObject(v)])
    );
  }
  return obj;
}

// ── Schemas ─────────────────────────────────────────────────────────────────

const registerSchema = Joi.object({
  name: Joi.string().min(2).max(50).pattern(/^[a-zA-Z\s]+$/).required()
    .messages({ 'string.pattern.base': 'Name must contain only letters and spaces' }),
  email: Joi.string().email().max(100).lowercase().required(),
  password: Joi.string().min(8).max(72)
    .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .required()
    .messages({ 'string.pattern.base': 'Password must contain uppercase, lowercase, and a number' }),
  phone: Joi.string().pattern(/^\+?[0-9]{10,15}$/).optional()
    .messages({ 'string.pattern.base': 'Invalid phone number format' }),
});

const loginSchema = Joi.object({
  email: Joi.string().email().max(100).lowercase().required(),
  password: Joi.string().max(72).required(),
});

const productSchema = Joi.object({
  name: Joi.string().min(2).max(100)
    .pattern(/^[a-zA-Z0-9\s\-_.,()'&]+$/).required()
    .messages({ 'string.pattern.base': 'Product name contains invalid characters' }),
  price: Joi.number().positive().max(999999).precision(2).required(),
  description: Joi.string().max(2000).optional().allow(''),
  category: Joi.string().valid(
    'electronics', 'clothing', 'food', 'books', 'home', 'sports', 'other'
  ).required(),
  stock: Joi.number().integer().min(0).max(99999).required(),
  image: Joi.string().uri().max(500).optional().allow(''),
});

const cartItemSchema = Joi.object({
  productId: Joi.string().hex().length(24).required()
    .messages({ 'string.length': 'Invalid product ID' }),
  quantity: Joi.number().integer().min(1).max(99).required(),
});

const checkoutSchema = Joi.object({
  paymentMethod: Joi.string().valid('card', 'upi', 'wallet').required(),
  shippingAddress: Joi.object({
    street: Joi.string().max(200).required(),
    city: Joi.string().max(100).required(),
    state: Joi.string().max(100).required(),
    pincode: Joi.string().pattern(/^[0-9]{6}$/).required()
      .messages({ 'string.pattern.base': 'Pincode must be 6 digits' }),
  }).required(),
  couponCode: Joi.string().alphanum().max(20).optional().allow(''),
});

module.exports = {
  validate,
  schemas: { registerSchema, loginSchema, productSchema, cartItemSchema, checkoutSchema },
};
