const nodemailer = require('nodemailer');
const pool = require('../config/db');

/**
 * Returns { transport, from } using DB SMTP settings if configured,
 * falling back to process.env SMTP_* variables.
 * Returns null if no SMTP is configured at all.
 */
async function getMailer() {
  try {
    const result = await pool.query(
      `SELECT smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure
       FROM portal_settings LIMIT 1`
    );
    const s = result.rows[0];
    if (s && s.smtp_host && s.smtp_user && s.smtp_pass) {
      return {
        transport: nodemailer.createTransport({
          host: s.smtp_host,
          port: s.smtp_port || 587,
          secure: !!s.smtp_secure,
          auth: { user: s.smtp_user, pass: s.smtp_pass },
        }),
        from: s.smtp_from || s.smtp_user,
      };
    }
  } catch (err) {
    console.error('DB SMTP lookup failed, falling back to .env:', err.message);
  }

  // Fall back to .env
  if (!process.env.SMTP_HOST) return null;
  return {
    transport: nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true',
      auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    }),
    from: process.env.SMTP_FROM || process.env.SMTP_USER,
  };
}

module.exports = { getMailer };
