const firebaseConfig = require('../config/firebase');

/**
 * Sends an FCM push notification with graceful error handling.
 *
 * @param {string} fcmToken - Device FCM registration token.
 * @param {string} title - Push notification title.
 * @param {string} body - Push notification body message.
 * @param {object} [data={}] - Optional key-value data payload.
 * @returns {Promise<object>} Status object indicating success or failure.
 */
async function sendPushNotification(fcmToken, title, body, data = {}) {
  try {
    return await firebaseConfig.sendPushNotification(fcmToken, title, body, data);
  } catch (error) {
    console.error('[FirebaseService] Error in sendPushNotification:', error.message);
    return {
      success: false,
      error: error.message
    };
  }
}

module.exports = {
  sendPushNotification
};
