const express = require('express');
const jwt = require('jsonwebtoken');
const { body } = require('express-validator');
const { User } = require('../models');
const { authenticate, JWT_SECRET } = require('../middleware/auth');
const { authRateLimit } = require('../middleware/rateLimit');
const { validateRegister, validateLogin, handleValidationErrors } = require('../middleware/validate');

const router = express.Router();

/**
 * POST /api/auth/register
 * Registers a new user account.
 */
router.post('/register', authRateLimit, validateRegister, async (req, res, next) => {
  try {
    const { name, email, password, fcm_token } = req.body;

    const existingUser = await User.findOne({ where: { email: email.toLowerCase() } });
    if (existingUser) {
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await User.hashPassword(password);

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      password_hash,
      fcm_token: fcm_token || null
    });

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(201).json({
      message: 'User registered successfully',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns JWT.
 */
router.post('/login', authRateLimit, validateLogin, async (req, res, next) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ where: { email: email.toLowerCase() } });
    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const isValidPassword = await user.validatePassword(password);
    if (!isValidPassword) {
      return res.status(401).json({ error: 'Invalid email or password' });
    }

    const token = jwt.sign(
      {
        id: user.id,
        email: user.email,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/auth/me
 * Retrieves current authenticated user profile.
 */
router.get('/me', authenticate, async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({
      user: user.toJSON()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/auth/fcm-token
 * Updates device FCM token for push notifications.
 */
router.put(
  '/fcm-token',
  authenticate,
  [
    body('fcm_token').trim().notEmpty().withMessage('fcm_token is required'),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const { fcm_token } = req.body;

      await User.update({ fcm_token }, { where: { id: req.user.id } });

      return res.status(200).json({
        message: 'FCM token updated successfully',
        fcm_token
      });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
