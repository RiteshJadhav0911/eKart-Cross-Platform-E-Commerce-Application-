const rateLimit = require('express-rate-limit');

// ── Auth limiter: 5 attempts per 15 minutes per IP ─────────────────────────
const authLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_AUTH) || 5, // Hard limit for authentication attempts
  message: {
    success: false,
    error: 'Too many attempts from this IP. Please try again after 15 minutes.',
  },
  standardHeaders: true,   // Return rate limit info in RateLimit-* headers
  legacyHeaders: false,    // Disable the X-RateLimit-* headers
  skipSuccessfulRequests: false,
  handler: (req, res, next, options) => {
    console.warn(`Rate limit exceeded: ${req.ip} on ${req.path}`);
    res.status(429).json(options.message);
  },
});

// ── General API limiter: 100 requests per 15 minutes per IP ────────────────
const apiLimiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 15 * 60 * 1000,
  max: parseInt(process.env.RATE_LIMIT_MAX_API) || 100,
  message: {
    success: false,
    error: 'Too many requests from this IP. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { authLimiter, apiLimiter };
