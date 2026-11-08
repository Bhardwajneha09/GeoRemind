require('dotenv').config();
const nodemailer = require('nodemailer');

const isProd = process.env.NODE_ENV === 'production';
const isTest = process.env.NODE_ENV === 'test';

let transporterPromise = null;

/**
 * Initializes and returns the Nodemailer transporter.
 * Creates an Ethereal test account in development, or connects to real SMTP in production.
 *
 * @returns {Promise<nodemailer.Transporter>}
 */
async function getTransporter() {
  if (transporterPromise) {
    return transporterPromise;
  }

  transporterPromise = (async () => {
    if (isTest) {
      // Mock transporter for testing to avoid network delays
      return {
        sendMail: async (mailOptions) => ({
          messageId: 'test-msg-id-12345',
          previewUrl: 'https://ethereal.email/message/test-preview',
          envelope: { from: mailOptions.from, to: [mailOptions.to] }
        })
      };
    }

    if (isProd) {
      return nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    }

    // Development: Auto-create Ethereal test account
    try {
      const testAccount = await nodemailer.createTestAccount();
      console.log(`[Ethereal Email] Account created: ${testAccount.user}`);
      return nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
    } catch (err) {
      console.warn('Failed to create Ethereal account, falling back to mock transport:', err.message);
      return {
        sendMail: async () => ({ messageId: 'fallback-stub-id' })
      };
    }
  })();

  return transporterPromise;
}

/**
 * Sends an email using the configured transporter.
 *
 * @param {string} to - Recipient email address.
 * @param {string} subject - Email subject line.
 * @param {string} html - HTML email body content.
 * @returns {Promise<object>} Result containing messageId and preview URL (if Ethereal).
 */
async function sendEmail(to, subject, html) {
  try {
    const transporter = await getTransporter();
    const from = process.env.SMTP_FROM || '"Location Reminders" <no-reply@locationreminders.com>';

    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html
    });

    const previewUrl = nodemailer.getTestMessageUrl ? nodemailer.getTestMessageUrl(info) : null;
    if (previewUrl) {
      console.log(`[Email Sent] Preview URL: ${previewUrl}`);
    } else {
      console.log(`[Email Sent] Message ID: ${info.messageId} to ${to}`);
    }

    return { success: true, messageId: info.messageId, previewUrl };
  } catch (error) {
    console.error(`Failed to send email to ${to}:`, error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  getTransporter,
  sendEmail
};
