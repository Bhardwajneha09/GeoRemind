const rateLimit = require('express-rate-limit');

/**
 * Rate limiter for location checking:
 * 6 requests per minute per IP + user combination.
 */
const locationRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 6,
  keyGenerator: (req) => {
    const ip = req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
    const userId = req.user && req.user.id ? req.user.id : 'anonymous';
    return `${ip}_${userId}`;
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many location checks, please try again after a minute.'
  }
});

/**
 * Rate limiter for authentication routes:
 * 10 requests per 15 minutes per IP address.
 */
const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many authentication attempts, please try again after 15 minutes.'
  }
});

/**
 * General API rate limiter:
 * 100 requests per minute per IP address.
 */
const apiRateLimit = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 100,
  keyGenerator: (req) => {
    return req.ip || req.headers['x-forwarded-for'] || req.socket.remoteAddress || 'unknown';
  },
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: 'Too many requests, please slow down.'
  }
});

module.exports = {
  locationRateLimit,
  authRateLimit,
  apiRateLimit
};
