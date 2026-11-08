require('dotenv').config();
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'default_jwt_secret_change_me';

/**
 * Middleware to authenticate requests using JWT Bearer token.
 * Attaches req.user = { id, email, name } upon success.
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization || req.headers.Authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Access denied. No bearer token provided.' });
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
    return res.status(401).json({ error: 'Invalid or expired token.' });
  }
}

/**
 * Optional authentication middleware.
 * If a valid Bearer token is present, attaches req.user.
 * Does not fail if token is missing or invalid.
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
    // Silently ignore invalid token in optional authentication
  }

  next();
}

module.exports = {
  authenticate,
  optionalAuth,
  JWT_SECRET
};
