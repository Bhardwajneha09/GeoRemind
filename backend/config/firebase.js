require('dotenv').config();

const projectId = process.env.FIREBASE_PROJECT_ID;
const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
let privateKey = process.env.FIREBASE_PRIVATE_KEY;

if (privateKey) {
  // Replace escaped newlines if passed via environment variables
  privateKey = privateKey.replace(/\\n/g, '\n');
}

let adminInstance = null;
let isConfigured = false;

if (projectId && clientEmail && privateKey) {
  try {
    const admin = require('firebase-admin');
    admin.initializeApp({
      credential: admin.credential.cert({
        projectId,
        clientEmail,
        privateKey
      })
    });
    adminInstance = admin;
    isConfigured = true;
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (err) {
    console.error('Failed to initialize Firebase Admin SDK:', err.message);
  }
} else {
  console.log('Firebase not configured. Using push notification stub.');
}

/**
 * Sends a push notification to a device FCM token.
 * Falls back to stub logging if Firebase is not configured.
 *
 * @param {string} token - FCM registration token.
 * @param {string} title - Notification title.
 * @param {string} body - Notification body text.
 * @param {object} [data={}] - Optional key-value payload data.
 * @returns {Promise<object>} Result of sending the notification.
 */
async function sendPushNotification(token, title, body, data = {}) {
  if (!token) {
    return { success: false, error: 'Token is required' };
  }

  if (!isConfigured || !adminInstance) {
    console.log(`[Firebase Stub] Push notification to token: ${token} | Title: "${title}" | Body: "${body}"`);
    return { success: true, stub: true, message: 'Firebase not configured, notification logged as stub' };
  }

  try {
    // Stringify any non-string values in data for FCM compatibility
    const formattedData = {};
    for (const [key, val] of Object.entries(data)) {
      formattedData[key] = typeof val === 'string' ? val : JSON.stringify(val);
    }

    const message = {
      token,
      notification: {
        title,
        body
      },
      data: formattedData
    };

    const response = await adminInstance.messaging().send(message);
    console.log(`Push notification sent successfully: ${response}`);
    return { success: true, response };
  } catch (error) {
    console.error(`Error sending push notification to ${token}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  admin: adminInstance,
  isConfigured,
  sendPushNotification
};
