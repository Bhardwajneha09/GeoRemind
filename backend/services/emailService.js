const cron = require('node-cron');
const { sendEmail } = require('../config/email');
const { User, Reminder, Geofence } = require('../models');

/**
 * Sends a confirmation HTML email when a new reminder is created.
 *
 * @param {object} user - User model or plain object.
 * @param {object} reminder - Reminder model or plain object.
 * @param {object} geofence - Geofence model or plain object.
 * @returns {Promise<object>} Result of sending email.
 */
async function sendReminderCreatedEmail(user, reminder, geofence) {
  const subject = `📍 Reminder Created: "${geofence.name}"`;

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #4f46e5 0%, #3b82f6 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .content { padding: 32px 24px; }
          .greeting { font-size: 16px; margin-bottom: 20px; line-height: 1.5; }
          .card { background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin-bottom: 24px; }
          .card-title { font-size: 14px; text-transform: uppercase; letter-spacing: 0.05em; color: #6b7280; margin-top: 0; margin-bottom: 8px; }
          .message-text { font-size: 18px; font-weight: 600; color: #111827; margin: 0 0 16px 0; }
          .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-top: 1px solid #f3f4f6; font-size: 14px; }
          .detail-label { color: #6b7280; }
          .detail-value { font-weight: 500; color: #111827; }
          .badge { display: inline-block; padding: 4px 10px; border-radius: 9999px; font-size: 12px; font-weight: 600; text-transform: uppercase; background-color: #e0e7ff; color: #4338ca; }
          .footer { text-align: center; padding: 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Location Reminder Set</h1>
          </div>
          <div class="content">
            <p class="greeting">Hello ${user.name || 'there'},</p>
            <p>Your new location-based reminder is active and ready to notify you when you approach:</p>
            <div class="card">
              <div class="card-title">Reminder Message</div>
              <p class="message-text">"${reminder.message}"</p>
              <div class="detail-row">
                <span class="detail-label">Location:</span>
                <span class="detail-value">${geofence.name}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Coordinates:</span>
                <span class="detail-value">${geofence.lat}, ${geofence.lng}</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Radius:</span>
                <span class="detail-value">${geofence.radius_m} metres</span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Trigger Event:</span>
                <span class="detail-value"><span class="badge">${reminder.trigger_type}</span></span>
              </div>
              <div class="detail-row">
                <span class="detail-label">Recurring:</span>
                <span class="detail-value">${reminder.is_recurring ? 'Yes' : 'No (One-time)'}</span>
              </div>
            </div>
            <p style="font-size: 14px; color: #4b5563;">You will receive real-time push and in-app alerts whenever your device enters or exits this location perimeter.</p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Location Reminder System. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(user.email, subject, html);
}

/**
 * Sends a daily digest HTML email summarizing the user's active reminders.
 *
 * @param {object} user - User model or plain object.
 * @param {Array<object>} reminders - Array of active reminders with their geofences.
 * @returns {Promise<object>} Result of sending email.
 */
async function sendDailyDigest(user, reminders) {
  if (!reminders || reminders.length === 0) return { skipped: true };

  const subject = `📅 Your Daily Location Reminders Digest (${reminders.length} Active)`;

  const reminderRows = reminders
    .map(
      (r) => `
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 16px; margin-bottom: 12px;">
        <div style="font-size: 16px; font-weight: 600; color: #1f2937; margin-bottom: 6px;">"${r.message}"</div>
        <div style="font-size: 13px; color: #4b5563;">
          <strong>Location:</strong> ${r.geofence ? r.geofence.name : 'Unknown Geofence'} &bull;
          <strong>Trigger:</strong> ${r.trigger_type.toUpperCase()} &bull;
          <strong>Recurring:</strong> ${r.is_recurring ? 'Yes' : 'No'}
        </div>
      </div>
    `
    )
    .join('');

  const html = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; margin: 0; padding: 20px; color: #1f2937; }
          .container { max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1); }
          .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 32px 24px; text-align: center; color: #ffffff; }
          .header h1 { margin: 0; font-size: 24px; font-weight: 700; }
          .content { padding: 32px 24px; }
          .greeting { font-size: 16px; margin-bottom: 16px; }
          .footer { text-align: center; padding: 24px; font-size: 12px; color: #9ca3af; border-top: 1px solid #f3f4f6; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>Daily Reminder Digest</h1>
          </div>
          <div class="content">
            <p class="greeting">Good morning, ${user.name || 'there'}!</p>
            <p style="font-size: 14px; color: #4b5563; margin-bottom: 20px;">
              Here are your <strong>${reminders.length}</strong> active location-based reminders scheduled to keep you on track today:
            </p>
            ${reminderRows}
            <p style="font-size: 13px; color: #6b7280; margin-top: 24px;">
              Keep your GPS location enabled in your device settings to trigger alerts on arrival.
            </p>
          </div>
          <div class="footer">
            &copy; ${new Date().getFullYear()} Location Reminder System. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  return sendEmail(user.email, subject, html);
}

/**
 * Initializes cron schedule to dispatch daily digests at 8:00 AM every day.
 */
function scheduleDailyDigest() {
  // Cron expression: 0 8 * * * -> 8:00 AM daily
  cron.schedule('0 8 * * *', async () => {
    console.log('[Daily Digest Cron] Triggering 8:00 AM digest dispatch...');
    try {
      const users = await User.findAll({
        include: [
          {
            model: Reminder,
            as: 'reminders',
            where: { is_active: true },
            include: [{ model: Geofence, as: 'geofence' }]
          }
        ]
      });

      for (const user of users) {
        if (user.reminders && user.reminders.length > 0) {
          await sendDailyDigest(user, user.reminders);
        }
      }
      console.log(`[Daily Digest Cron] Completed digest delivery for ${users.length} users.`);
    } catch (error) {
      console.error('[Daily Digest Cron] Error dispatching daily digest:', error.message);
    }
  });

  console.log('[EmailService] Daily digest cron scheduled for 8:00 AM daily.');
}

module.exports = {
  sendReminderCreatedEmail,
  sendDailyDigest,
  scheduleDailyDigest
};
