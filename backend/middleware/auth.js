require('dotenv').config();
const jwt = require('jsonwebtoken');

const DEFAULT_DEV_SECRET = 'default_jwt_secret_change_me';
const configuredSecret = process.env.JWT_SECRET;

// Enforce a secure JWT secret in production
if (process.env.NODE_ENV === 'production') {
  if (
    !configuredSecret ||
    !configuredSecret.trim() ||
    configuredSecret === DEFAULT_DEV_SECRET ||
    configuredSecret.trim().length < 32
  ) {
    throw new Error(
      'Production requires a secure JWT_SECRET of at least 32 characters.'
    );
  }
}

const JWT_SECRET = configuredSecret || DEFAULT_DEV_SECRET;

/**
 * Middleware to authenticate requests using JWT Bearer token.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Access denied. No bearer token provided.'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };

    next();
  } catch (error) {
    return res.status(401).json({
      error: 'Invalid or expired token.'
    });
  }
}

/**
 * Optional authentication middleware.
 */
function optionalAuth(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return next();
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name
    };
  } catch (error) {
    // Silently ignore invalid token in optional authentication.
  }

  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  JWT_SECRET
};