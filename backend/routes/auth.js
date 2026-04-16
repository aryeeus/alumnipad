const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

// Build a nodemailer transporter when SMTP env vars are set
function getMailer() {
  if (!process.env.SMTP_HOST) return null;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

// POST /api/auth/register
router.post('/register', async (req, res) => {
  const { email, password, profileData } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
  if (!profileData || !profileData.first_name || !profileData.last_name) {
    return res.status(400).json({ error: 'First name and last name are required' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existing.rows.length > 0) {
      await client.query('ROLLBACK');
      return res.status(409).json({ error: 'Email already registered' });
    }

    const password_hash = await bcrypt.hash(password, 10);
    const userResult = await client.query(
      `INSERT INTO users (email, password_hash) VALUES ($1, $2) RETURNING id`,
      [email, password_hash]
    );
    const userId = userResult.rows[0].id;

    const p = profileData;
    await client.query(
      `INSERT INTO alumni_profiles (
        user_id, first_name, middle_name, last_name, preferred_name, date_of_birth,
        house, graduation_year, boarding_type, final_year_class, leadership_roles, clubs, sports, program,
        secondary_email, phone, whatsapp, address, city, region, country,
        linkedin_url, facebook_url, instagram_url,
        employer, industry, job_title, professional_field, years_of_experience,
        certifications, expertise, is_mentor_available, is_speaker_available, has_board_service,
        has_business, business_name, business_description, business_category, business_website,
        business_phone, business_email, business_address, business_industry, business_location,
        business_social, business_services, mentorship_areas, career_guidance_available,
        emergency_contact_name, emergency_contact_mobile, emergency_contact_relationship
      ) VALUES (
        $1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,$19,$20,$21,
        $22,$23,$24,$25,$26,$27,$28,$29,$30,$31,$32,$33,$34,$35,$36,$37,$38,$39,$40,
        $41,$42,$43,$44,$45,$46,$47,$48,$49,$50,$51
      )`,
      [
        userId,
        p.first_name || null, p.middle_name || null, p.last_name || null, p.preferred_name || null,
        p.date_of_birth || null,
        p.house || null, p.graduation_year || null, p.boarding_type || null,
        p.final_year_class || null, p.leadership_roles || null, p.clubs || null, p.sports || null, p.program || null,
        p.secondary_email || null, p.phone || null, p.whatsapp || null,
        p.address || null, p.city || null, p.region || null, p.country || null,
        p.linkedin_url || null, p.facebook_url || null, p.instagram_url || null,
        p.employer || null, p.industry || null, p.job_title || null, p.professional_field || null,
        p.years_of_experience || null, p.certifications || null, p.expertise || null,
        p.is_mentor_available || false, p.is_speaker_available || false, p.has_board_service || false,
        p.has_business || false, p.business_name || null, p.business_description || null,
        p.business_category || null, p.business_website || null, p.business_phone || null,
        p.business_email || null, p.business_address || null, p.business_industry || null,
        p.business_location || null, p.business_social || null, p.business_services || null,
        p.mentorship_areas || null, p.career_guidance_available || false,
        p.emergency_contact_name || null, p.emergency_contact_mobile || null,
        p.emergency_contact_relationship || null,
      ]
    );

    await client.query('COMMIT');
    res.status(201).json({ message: 'Registration submitted. Awaiting admin approval.' });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Register error:', err);
    res.status(500).json({ error: 'Registration failed' });
  } finally {
    client.release();
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: 'Email and password required' });

  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid) return res.status(401).json({ error: 'Invalid credentials' });

    if (!user.is_approved) {
      return res.status(403).json({ error: 'Account pending admin approval' });
    }

    const token = jwt.sign(
      { id: user.id, email: user.email, is_admin: user.is_admin },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({ token, user: { id: user.id, email: user.email, is_admin: user.is_admin } });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'Login failed' });
  }
});

// GET /api/auth/me
router.get('/me', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.is_admin, u.is_approved, u.created_at,
              ap.*
       FROM users u
       LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
       WHERE u.id = $1`,
      [req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Me error:', err);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });

  try {
    const result = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    // Always respond with success to avoid email enumeration
    if (!result.rows[0]) {
      return res.json({ message: 'If that email is registered, a reset link has been sent.' });
    }

    const userId = result.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expires = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    await pool.query(
      'UPDATE users SET password_reset_token=$1, password_reset_expires=$2 WHERE id=$3',
      [token, expires, userId]
    );

    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${token}`;

    const mailer = getMailer();
    if (mailer) {
      await mailer.sendMail({
        from: process.env.SMTP_FROM || 'AlumniPad <noreply@alumnipad.com>',
        to: email,
        subject: 'Reset your AlumniPad password',
        html: `
          <div style="font-family:sans-serif;max-width:480px;margin:auto">
            <h2 style="color:#1a2744">Password Reset Request</h2>
            <p>Click the button below to reset your password. This link expires in 1 hour.</p>
            <a href="${resetUrl}" style="display:inline-block;background:#1e40af;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600">Reset Password</a>
            <p style="color:#666;font-size:12px;margin-top:20px">If you didn't request this, you can safely ignore this email.</p>
          </div>
        `,
      });
      res.json({ message: 'If that email is registered, a reset link has been sent.' });
    } else {
      // No SMTP configured — return the link directly (dev/self-hosted mode)
      console.log(`[DEV] Password reset link for ${email}: ${resetUrl}`);
      res.json({
        message: 'Reset link generated. Email is not configured — see link below.',
        dev_reset_url: resetUrl,
      });
    }
  } catch (err) {
    console.error('Forgot password error:', err);
    res.status(500).json({ error: 'Failed to process request' });
  }
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and new password required' });
  if (password.length < 6) return res.status(400).json({ error: 'Password must be at least 6 characters' });

  try {
    const result = await pool.query(
      'SELECT id FROM users WHERE password_reset_token=$1 AND password_reset_expires > NOW()',
      [token]
    );
    if (!result.rows[0]) {
      return res.status(400).json({ error: 'Reset link is invalid or has expired' });
    }

    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'UPDATE users SET password_hash=$1, password_reset_token=NULL, password_reset_expires=NULL, updated_at=NOW() WHERE id=$2',
      [hash, result.rows[0].id]
    );

    res.json({ message: 'Password reset successfully. You can now log in.' });
  } catch (err) {
    console.error('Reset password error:', err);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

module.exports = router;
