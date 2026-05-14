const rateLimit = require('express-rate-limit');

// AI rate limiter: 20 requests per hour per user
const aiRateLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  keyGenerator: (req) => req.user ? String(req.user.id) : req.ip,
  message: { error: 'Too many AI requests. Limit is 20 per hour per user.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// General limiter: 100 requests per 15 minutes per IP
const generalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: { error: 'Too many requests. Please slow down.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Auth limiter: 20 requests per 15 minutes (brute-force protection)
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: 'Too many auth attempts. Try again in 15 minutes.' },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { aiRateLimiter, generalLimiter, authLimiter };
