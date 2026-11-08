const { body, validationResult } = require('express-validator');

/**
 * Middleware that extracts validation errors and returns 422 if any exist.
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      error: 'Validation failed',
      errors: errors.array()
    });
  }
  next();
};

/**
 * Validation rules for user registration.
 */
const validateRegister = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters long'),
  handleValidationErrors
];

/**
 * Validation rules for user login.
 */
const validateLogin = [
  body('email')
    .trim()
    .isEmail()
    .normalizeEmail()
    .withMessage('A valid email address is required'),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
  handleValidationErrors
];

/**
 * Validation rules for geofence creation/updates.
 */
const validateGeofence = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Geofence name is required')
    .isLength({ max: 150 })
    .withMessage('Geofence name cannot exceed 150 characters'),
  body('lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid number between -90 and 90'),
  body('lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid number between -180 and 180'),
  body('radius_m')
    .optional()
    .isInt({ min: 10, max: 50000 })
    .withMessage('Radius must be an integer between 10 and 50,000 metres'),
  handleValidationErrors
];

/**
 * Validation rules for reminder creation/updates.
 */
const validateReminder = [
  body('message')
    .trim()
    .notEmpty()
    .withMessage('Reminder message is required')
    .isLength({ max: 1000 })
    .withMessage('Reminder message cannot exceed 1000 characters'),
  body('geofence_id')
    .notEmpty()
    .withMessage('geofence_id is required')
    .isUUID()
    .withMessage('geofence_id must be a valid UUID'),
  body('trigger_type')
    .optional()
    .isIn(['enter', 'exit', 'both'])
    .withMessage("trigger_type must be either 'enter', 'exit', or 'both'"),
  body('is_recurring')
    .optional()
    .isBoolean()
    .withMessage('is_recurring must be a boolean value'),
  handleValidationErrors
];

/**
 * Validation rules for location check coordinates.
 */
const validateLocation = [
  body('lat')
    .notEmpty()
    .withMessage('Latitude is required')
    .isFloat({ min: -90, max: 90 })
    .withMessage('Latitude must be a valid number between -90 and 90'),
  body('lng')
    .notEmpty()
    .withMessage('Longitude is required')
    .isFloat({ min: -180, max: 180 })
    .withMessage('Longitude must be a valid number between -180 and 180'),
  handleValidationErrors
];

module.exports = {
  handleValidationErrors,
  validateRegister,
  validateLogin,
  validateGeofence,
  validateReminder,
  validateLocation
};
