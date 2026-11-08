const express = require('express');
const { Reminder, Geofence, ReminderLog, User } = require('../models');
const { authenticate } = require('../middleware/auth');
const { validateReminder } = require('../middleware/validate');
const { sendReminderCreatedEmail } = require('../services/emailService');

const router = express.Router();

// All reminder endpoints require authentication
router.use(authenticate);

/**
 * GET /api/reminders
 * Lists all active reminders for the authenticated user, including geofence details.
 */
router.get('/', async (req, res, next) => {
  try {
    const reminders = await Reminder.findAll({
      where: {
        user_id: req.user.id,
        is_active: true
      },
      include: [
        {
          model: Geofence,
          as: 'geofence'
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return res.status(200).json({ reminders });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reminders/logs
 * Retrieves trigger audit logs for the authenticated user.
 */
router.get('/logs', async (req, res, next) => {
  try {
    const logs = await ReminderLog.findAll({
      where: { user_id: req.user.id },
      include: [
        {
          model: Reminder,
          as: 'reminder',
          include: [{ model: Geofence, as: 'geofence' }]
        }
      ],
      order: [['triggered_at', 'DESC']],
      limit: 100
    });

    return res.status(200).json({ logs });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/reminders
 * Creates a new reminder and dispatches confirmation email.
 */
router.post('/', validateReminder, async (req, res, next) => {
  try {
    const { geofence_id, message, trigger_type, is_recurring } = req.body;

    // Verify geofence exists and belongs to user
    const geofence = await Geofence.findOne({
      where: {
        id: geofence_id,
        user_id: req.user.id,
        is_active: true
      }
    });

    if (!geofence) {
      return res.status(404).json({ error: 'Geofence not found or inactive' });
    }

    const reminder = await Reminder.create({
      user_id: req.user.id,
      geofence_id,
      message,
      trigger_type: trigger_type || 'enter',
      is_recurring: Boolean(is_recurring),
      is_active: true
    });

    // Send confirmation email asynchronously
    User.findByPk(req.user.id)
      .then((user) => {
        if (user) {
          sendReminderCreatedEmail(user, reminder, geofence).catch((err) =>
            console.error('Failed to send reminder created email:', err.message)
          );
        }
      })
      .catch((err) => console.error('Error fetching user for confirmation email:', err.message));

    const reminderWithGeofence = await Reminder.findByPk(reminder.id, {
      include: [{ model: Geofence, as: 'geofence' }]
    });

    return res.status(201).json({
      message: 'Reminder created successfully',
      reminder: reminderWithGeofence || reminder
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/reminders/:id
 * Retrieves a single reminder with associated geofence and trigger logs.
 */
router.get('/:id', async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      },
      include: [
        {
          model: Geofence,
          as: 'geofence'
        },
        {
          model: ReminderLog,
          as: 'logs',
          separate: true,
          order: [['triggered_at', 'DESC']]
        }
      ]
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    return res.status(200).json({ reminder });
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/reminders/:id
 * Updates an existing reminder.
 */
router.put('/:id', async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    const { message, trigger_type, is_recurring, is_active } = req.body;

    if (message !== undefined) reminder.message = message;
    if (trigger_type !== undefined) reminder.trigger_type = trigger_type;
    if (is_recurring !== undefined) reminder.is_recurring = Boolean(is_recurring);
    if (is_active !== undefined) reminder.is_active = Boolean(is_active);

    await reminder.save();

    return res.status(200).json({
      message: 'Reminder updated successfully',
      reminder
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/reminders/:id
 * Soft deletes a reminder (sets is_active=false).
 */
router.delete('/:id', async (req, res, next) => {
  try {
    const reminder = await Reminder.findOne({
      where: {
        id: req.params.id,
        user_id: req.user.id
      }
    });

    if (!reminder) {
      return res.status(404).json({ error: 'Reminder not found' });
    }

    reminder.is_active = false;
    await reminder.save();

    return res.status(200).json({
      message: 'Reminder deactivated successfully'
    });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
