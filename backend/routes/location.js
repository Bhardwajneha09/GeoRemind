const express = require('express');
const { ReminderLog, Reminder, Geofence } = require('../models');
const { authenticate } = require('../middleware/auth');
const { locationRateLimit } = require('../middleware/rateLimit');
const { validateLocation } = require('../middleware/validate');
const geofenceService = require('../services/geofenceService');

const router = express.Router();

/**
 * POST /api/location/check
 * Evaluates user's current GPS location against active geofences and triggers alerts.
 */
router.post('/check', authenticate, locationRateLimit, validateLocation, async (req, res, next) => {
  try {
    const { lat, lng } = req.body;
    const io = req.app.get('io');

    const triggered = await geofenceService.checkUserGeofences(
      req.user.id,
      parseFloat(lat),
      parseFloat(lng),
      io
    );

    return res.status(200).json({
      message: 'Location checked successfully',
      triggered
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/location/history
 * Returns the authenticated user's last 50 ReminderLog trigger history entries.
 */
router.get('/history', authenticate, async (req, res, next) => {
  try {
    const history = await ReminderLog.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Reminder,
          as: 'reminder',
          include: [{ model: Geofence, as: 'geofence' }]
        }
      ],
      order: [['triggered_at', 'DESC']],
      limit: 50
    });

    return res.status(200).json({ history });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
