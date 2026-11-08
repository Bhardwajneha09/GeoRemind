const { Op } = require('sequelize');
const { User, Geofence, Reminder, ReminderLog } = require('../models');
const { haversineDistance, getBoundingBox } = require('../utils/haversine');
const { sendPushNotification } = require('./firebaseService');

/**
 * Checks all active geofences for a user given their current coordinates.
 * Determines triggered reminders for enter/exit events, creates audit logs,
 * updates reminder state, emits Socket.io events, and sends push notifications.
 *
 * @param {string} userId - UUID of the user.
 * @param {number} lat - Current latitude of the user.
 * @param {number} lng - Current longitude of the user.
 * @param {object} [io=null] - Optional Socket.io server instance.
 * @returns {Promise<Array<object>>} List of triggered reminders and metadata.
 */
async function checkUserGeofences(userId, lat, lng, io = null) {
  if (!userId || lat === undefined || lng === undefined) {
    throw new Error('userId, lat, and lng are required parameters');
  }

  // Look up user to retrieve fcm_token
  const user = await User.findByPk(userId);

  // Maximum geofence radius supported (50 km) for the SQL bounding box pre-filter
  const MAX_RADIUS_METRES = 50000;
  const bbox = getBoundingBox(lat, lng, MAX_RADIUS_METRES);

  // 1. Query user's active geofences within bounding box
  const geofences = await Geofence.findAll({
    where: {
      user_id: userId,
      is_active: true,
      lat: {
        [Op.between]: [bbox.minLat, bbox.maxLat]
      },
      lng: {
        [Op.between]: [bbox.minLon, bbox.maxLon]
      }
    },
    include: [
      {
        model: Reminder,
        as: 'reminders',
        where: { is_active: true },
        required: false
      }
    ]
  });

  const triggeredResults = [];

  for (const geofence of geofences) {
    const fenceLat = parseFloat(geofence.lat);
    const fenceLng = parseFloat(geofence.lng);
    const radiusM = geofence.radius_m;

    // 2. Haversine distance check
    const distance = haversineDistance(lat, lng, fenceLat, fenceLng);
    const isInside = distance <= radiusM;

    // 3. Retrieve active reminders for this geofence
    let reminders = geofence.reminders;
    if (!reminders || reminders.length === 0) {
      reminders = await Reminder.findAll({
        where: {
          geofence_id: geofence.id,
          user_id: userId,
          is_active: true
        }
      });
    }

    if (!reminders || reminders.length === 0) {
      continue;
    }

    for (const reminder of reminders) {
      let eventType = null;

      // 4. Determine enter/exit based on distance, trigger_type, and last_triggered_at
      if (isInside) {
        // User is currently INSIDE the geofence perimeter
        if (reminder.trigger_type === 'enter' || reminder.trigger_type === 'both') {
          if (!reminder.last_triggered_at || reminder.is_recurring) {
            eventType = 'enter';
          }
        }
      } else {
        // User is currently OUTSIDE the geofence perimeter
        if (reminder.trigger_type === 'exit' || reminder.trigger_type === 'both') {
          // Exit triggers when user was previously inside (indicated by last_triggered_at)
          if (reminder.last_triggered_at) {
            eventType = 'exit';
          }
        }
      }

      // If triggered, log, update state, notify
      if (eventType) {
        // 5. Create ReminderLog entry
        const log = await ReminderLog.create({
          reminder_id: reminder.id,
          user_id: userId,
          triggered_at: new Date(),
          trigger_lat: lat,
          trigger_lng: lng,
          trigger_type: eventType
        });

        // 6. Update reminder's last_triggered_at and de-activate if non-recurring
        reminder.last_triggered_at = new Date();
        if (!reminder.is_recurring) {
          reminder.is_active = false;
        }
        await reminder.save();

        // 7. Emit reminder:triggered to Socket.io room user:${userId}
        if (io) {
          io.to(`user:${userId}`).emit('reminder:triggered', {
            reminderId: reminder.id,
            message: reminder.message,
            geofenceName: geofence.name,
            eventType,
            distanceMetres: Math.round(distance),
            triggeredAt: log.triggered_at
          });
        }

        // 8. Send Firebase push notification if user has fcm_token
        if (user && user.fcm_token) {
          await sendPushNotification(
            user.fcm_token,
            `Reminder: ${geofence.name}`,
            reminder.message,
            {
              reminderId: reminder.id,
              geofenceId: geofence.id,
              eventType,
              distance: String(Math.round(distance))
            }
          );
        }

        triggeredResults.push({
          reminder,
          geofence,
          eventType,
          distance: Math.round(distance),
          log
        });
      }
    }
  }

  return triggeredResults;
}

module.exports = {
  checkUserGeofences
};
