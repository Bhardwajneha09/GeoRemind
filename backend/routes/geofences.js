const express = require('express');
const { Geofence, Reminder } = require('../models');
const { authenticate } = require('../middleware/auth');
const { validateGeofence } = require('../middleware/validate');

const router = express.Router();

// All geofence endpoints require authentication
router.use(authenticate);

/**
 * GET /api/geofences
 * Lists all active geofences belonging to the authenticated user.
 */
router.get('/', async (req, res, next) => {
  try {
    const geofences = await Geofence.findAll({
      where: {
        user_id: req.user.id,
        is_active: true
      },
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ geofences });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/geofences
 * Creates a new geofence for the authenticated user.
 */
router.post('/', validateGeofence, async (req, res, next) => {
  try {
    const { name, lat, lng, radius_m } = req.body;

    const geofence = await Geofence.create({
      user_id: req.user.id,
      name,
      lat: parseFloat(lat),
      lng: parseFloat(lng),
      radius_m: radius_m !== undefined ? parseInt(radius_m, 10) : 100,
      is_active: true
    });

    return res.status(201).json({
      message: 'Geofence created successfully',
      geofence
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/geofences/:id
 * Retrieves a single geofence by ID (user-scoped).
 */
router.get('/:id', async (req, res, next) => {
  try {
    const geofence = await Geofence.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    return res.status(200).json({ geofence });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/geofences/:id
 * Updates an existing geofence (user-scoped).
 */
router.put('/:id', validateGeofence, async (req, res, next) => {
  try {
    const geofence = await Geofence.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    const { name, lat, lng, radius_m, is_active } = req.body;

    if (name !== undefined) geofence.name = name;
    if (lat !== undefined) geofence.lat = parseFloat(lat);
    if (lng !== undefined) geofence.lng = parseFloat(lng);
    if (radius_m !== undefined) geofence.radius_m = parseInt(radius_m, 10);
    if (is_active !== undefined) geofence.is_active = Boolean(is_active);

    await geofence.save();

    return res.status(200).json({
      message: 'Geofence updated successfully',
      geofence
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/geofences/:id
 * Soft deletes a geofence (sets is_active=false) and deactivates linked reminders.
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const geofence = await Geofence.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!geofence) {
      return res.status(404).json({ error: 'Geofence not found' });
    }

    geofence.is_active = false;
    await geofence.save();

    // Deactivate linked reminders as well
    await Reminder.update(
      { is_active: false },
      { where: { geofence_id: geofence.id, user_id: req.user.id } }
    );

    return res.status(200).json({
      message: 'Geofence and associated reminders deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
