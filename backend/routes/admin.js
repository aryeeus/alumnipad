const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const { getMailer } = require('../utils/mailer');

const logoStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/logos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `logo-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const uploadLogo = multer({ storage: logoStorage, limits: { fileSize: 5 * 1024 * 1024 } });

// GET /api/admin/pending
router.get('/pending', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.created_at,
              ap.first_name, ap.last_name, ap.graduation_year, ap.house, ap.program,
              ap.occupation, ap.city, ap.country, ap.profile_photo_url
       FROM users u
       LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
       WHERE u.is_approved = false AND u.is_admin = false
       ORDER BY u.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Pending error:', err);
    res.status(500).json({ error: 'Failed to fetch pending users' });
  }
});

// POST /api/admin/approve/:userId
router.post('/approve/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    // Fetch user + profile before approving so we have email & name
    const infoResult = await pool.query(
      `SELECT u.email, ap.first_name, ap.last_name
       FROM users u
       LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
       WHERE u.id = $1`,
      [req.params.userId]
    );
    if (!infoResult.rows[0]) return res.status(404).json({ error: 'User not found' });

    const { email, first_name, last_name } = infoResult.rows[0];

    await pool.query(
      'UPDATE users SET is_approved = true, updated_at = NOW() WHERE id = $1',
      [req.params.userId]
    );

    // Send approval email (fire-and-forget — don't block the response)
    getMailer().then((mailerObj) => {
      if (!mailerObj || !email) return;
      const { transport, from } = mailerObj;
      const displayName = first_name ? `${first_name} ${last_name ?? ''}`.trim() : email;
      const loginUrl = `${process.env.FRONTEND_URL || 'http://localhost:8080'}/login`;

      transport.sendMail({
        from,
        to: email,
        subject: 'Your AlumniPad Registration Has Been Approved!',
        html: `
          <div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f5f7ff">
            <div style="background:#1a2744;border-radius:12px;padding:24px;text-align:center;margin-bottom:24px">
              <h1 style="color:#facc15;font-size:22px;margin:0">AlumniPad</h1>
            </div>
            <div style="background:#fff;border-radius:12px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
              <h2 style="color:#1a2744;margin-top:0">Welcome, ${displayName}! 🎉</h2>
              <p style="color:#374151;line-height:1.6">
                Great news — your alumni registration has been <strong style="color:#16a34a">approved</strong>
                by the school administration. You are now a verified member of the alumni network.
              </p>
              <p style="color:#374151;line-height:1.6">You can now log in to:</p>
              <ul style="color:#374151;line-height:2">
                <li>Browse and connect with fellow alumni</li>
                <li>Share memories and photos</li>
                <li>View and post on the Marketplace</li>
                <li>Stay up to date with school events</li>
              </ul>
              <div style="text-align:center;margin:28px 0">
                <a href="${loginUrl}"
                   style="background:linear-gradient(135deg,#1e40af,#1a2744);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                  Log In Now
                </a>
              </div>
              <p style="color:#6b7280;font-size:13px;margin-bottom:0">
                If you did not register on AlumniPad, please ignore this email.
              </p>
            </div>
          </div>
        `,
      }).catch((err) => console.error('Approval email error:', err));
    }).catch((err) => console.error('Mailer init error:', err));

    res.json({ message: 'User approved' });
  } catch (err) {
    console.error('Approve error:', err);
    res.status(500).json({ error: 'Failed to approve user' });
  }
});

// POST /api/admin/reject/:userId
router.post('/reject/:userId', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('DELETE FROM users WHERE id = $1 RETURNING id', [req.params.userId]);
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
    res.json({ message: 'User rejected and removed' });
  } catch (err) {
    console.error('Reject error:', err);
    res.status(500).json({ error: 'Failed to reject user' });
  }
});

// GET /api/admin/stats
router.get('/stats', authenticate, requireAdmin, async (req, res) => {
  try {
    const [alumni, pending, photos, memories, activities] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE is_approved = true AND is_admin = false"),
      pool.query("SELECT COUNT(*) FROM users WHERE is_approved = false AND is_admin = false"),
      pool.query("SELECT COUNT(*) FROM photos"),
      pool.query("SELECT COUNT(*) FROM memories"),
      pool.query("SELECT COUNT(*) FROM activities"),
    ]);

    res.json({
      total_alumni: parseInt(alumni.rows[0].count),
      pending_approvals: parseInt(pending.rows[0].count),
      total_photos: parseInt(photos.rows[0].count),
      total_memories: parseInt(memories.rows[0].count),
      total_activities: parseInt(activities.rows[0].count),
    });
  } catch (err) {
    console.error('Stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// GET /api/admin/settings
router.get('/settings', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM portal_settings LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// PUT /api/admin/settings
router.put('/settings', authenticate, requireAdmin, uploadLogo.single('logo'), async (req, res) => {
  const { school_name } = req.body;
  const logo_url = req.file ? `/uploads/logos/${req.file.filename}` : undefined;

  try {
    let query, params;
    if (logo_url) {
      query = `UPDATE portal_settings SET school_name = COALESCE($1, school_name), logo_url = $2, updated_at = NOW()`;
      params = [school_name, logo_url];
    } else {
      query = `UPDATE portal_settings SET school_name = COALESCE($1, school_name), updated_at = NOW()`;
      params = [school_name];
    }
    await pool.query(query, params);
    res.json({ message: 'Settings updated' });
  } catch (err) {
    console.error('Settings update error:', err);
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ── SMTP Settings ──────────────────────────────────────────────────────────

// GET /api/admin/smtp — returns settings with password masked
router.get('/smtp', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT smtp_host, smtp_port, smtp_user, smtp_from, smtp_secure,
              (smtp_pass IS NOT NULL AND smtp_pass <> '') AS smtp_pass_set
       FROM portal_settings LIMIT 1`
    );
    const row = result.rows[0] || {};
    res.json({
      smtp_host:   row.smtp_host   || '',
      smtp_port:   row.smtp_port   || 587,
      smtp_user:   row.smtp_user   || '',
      smtp_from:   row.smtp_from   || '',
      smtp_secure: !!row.smtp_secure,
      smtp_pass:   row.smtp_pass_set ? '••••••••' : '',
    });
  } catch (err) {
    console.error('SMTP get error:', err);
    res.status(500).json({ error: 'Failed to fetch SMTP settings' });
  }
});

// PUT /api/admin/smtp — update SMTP settings
router.put('/smtp', authenticate, requireAdmin, async (req, res) => {
  const { smtp_host, smtp_port, smtp_user, smtp_pass, smtp_from, smtp_secure } = req.body;
  try {
    // Only update password if a new one was provided (not the masked placeholder)
    if (smtp_pass && smtp_pass !== '••••••••') {
      await pool.query(
        `UPDATE portal_settings SET
           smtp_host=$1, smtp_port=$2, smtp_user=$3, smtp_pass=$4,
           smtp_from=$5, smtp_secure=$6, updated_at=NOW()`,
        [smtp_host||null, smtp_port||587, smtp_user||null, smtp_pass,
         smtp_from||null, !!smtp_secure]
      );
    } else {
      await pool.query(
        `UPDATE portal_settings SET
           smtp_host=$1, smtp_port=$2, smtp_user=$3,
           smtp_from=$4, smtp_secure=$5, updated_at=NOW()`,
        [smtp_host||null, smtp_port||587, smtp_user||null,
         smtp_from||null, !!smtp_secure]
      );
    }
    res.json({ message: 'SMTP settings saved' });
  } catch (err) {
    console.error('SMTP save error:', err);
    res.status(500).json({ error: 'Failed to save SMTP settings' });
  }
});

// POST /api/admin/smtp/test — send a test email to the requesting admin
router.post('/smtp/test', authenticate, requireAdmin, async (req, res) => {
  try {
    const mailerObj = await getMailer();
    if (!mailerObj) return res.status(400).json({ error: 'No SMTP settings configured' });
    const { transport, from } = mailerObj;

    // Get admin email
    const userResult = await pool.query('SELECT email FROM users WHERE id=$1', [req.user.id]);
    const adminEmail = userResult.rows[0]?.email;
    if (!adminEmail) return res.status(400).json({ error: 'Could not determine admin email' });

    await transport.sendMail({
      from,
      to: adminEmail,
      subject: 'AlumniPad — SMTP Test Email ✅',
      html: `<div style="font-family:Inter,sans-serif;max-width:480px;margin:0 auto;padding:32px 24px">
        <div style="background:#1a2744;border-radius:12px;padding:20px;text-align:center;margin-bottom:20px">
          <h1 style="color:#facc15;margin:0;font-size:20px">AlumniPad</h1>
        </div>
        <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:24px">
          <h2 style="color:#15803d;margin-top:0">✅ SMTP is working!</h2>
          <p style="color:#374151">Your email configuration is correct. Alumni notifications will be delivered successfully.</p>
          <p style="color:#6b7280;font-size:13px;margin-bottom:0">Sent from AlumniPad Admin Panel</p>
        </div>
      </div>`,
    });
    res.json({ message: `Test email sent to ${adminEmail}` });
  } catch (err) {
    console.error('SMTP test error:', err);
    res.status(500).json({ error: err.message || 'Failed to send test email' });
  }
});

// ── Birthday Email Template ─────────────────────────────────────────────────

const DEFAULT_BIRTHDAY_SUBJECT = 'Happy Birthday, {{first_name}}! 🎂';
const DEFAULT_BIRTHDAY_BODY = `<div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f5f7ff">
  <div style="background:linear-gradient(135deg,#1a2744,#1e40af);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
    <div style="font-size:48px;margin-bottom:8px">🎂</div>
    <h1 style="color:#facc15;font-size:26px;margin:0;font-family:Georgia,serif">Happy Birthday!</h1>
  </div>
  <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <h2 style="color:#1a2744;margin-top:0">Dear {{first_name}},</h2>
    <p style="color:#374151;line-height:1.7;font-size:15px">
      On behalf of the entire {{school_name}} alumni community, we wish you a very happy birthday!
      May this special day be filled with joy, laughter, and wonderful memories.
    </p>
    <p style="color:#374151;line-height:1.7;font-size:15px">
      Your fellow alumni are celebrating with you today. We are grateful to have you as part of our family.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{app_url}}"
         style="background:linear-gradient(135deg,#1e40af,#1a2744);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
        Visit AlumniPad
      </a>
    </div>
    <p style="color:#9ca3af;font-size:13px;margin-bottom:0;text-align:center">
      With warm wishes from the {{school_name}} alumni community 🎓
    </p>
  </div>
</div>`;

// GET /api/admin/birthday-template
router.get('/birthday-template', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT birthday_subject, birthday_body FROM portal_settings LIMIT 1'
    );
    const row = result.rows[0] || {};
    res.json({
      subject: row.birthday_subject || DEFAULT_BIRTHDAY_SUBJECT,
      body:    row.birthday_body    || DEFAULT_BIRTHDAY_BODY,
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch birthday template' });
  }
});

// PUT /api/admin/birthday-template
router.put('/birthday-template', authenticate, requireAdmin, async (req, res) => {
  const { subject, body } = req.body;
  if (!subject || !body) return res.status(400).json({ error: 'Subject and body are required' });
  try {
    await pool.query(
      'UPDATE portal_settings SET birthday_subject=$1, birthday_body=$2, updated_at=NOW()',
      [subject, body]
    );
    res.json({ message: 'Birthday template saved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to save birthday template' });
  }
});

// GET /api/admin/activities
router.get('/activities', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM activities ORDER BY event_date DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

// POST /api/admin/activities
router.post('/activities', authenticate, requireAdmin, async (req, res) => {
  const { title, description, event_date, event_time, location, event_type } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  try {
    const result = await pool.query(
      `INSERT INTO activities (title, description, event_date, event_time, location, event_type, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [title, description, event_date, event_time, location, event_type, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create activity' });
  }
});

// DELETE /api/admin/activities/:id
router.delete('/activities/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM activities WHERE id = $1', [req.params.id]);
    res.json({ message: 'Activity deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete activity' });
  }
});

// ── Birthdays ──────────────────────────────────────────────────

// GET /api/admin/birthdays — alumni with birthdays today + next 30 days
router.get('/birthdays', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(`
      WITH bd AS (
        SELECT u.id AS user_id, u.email,
               ap.first_name, ap.last_name, ap.profile_photo_url, ap.date_of_birth,
               CASE
                 WHEN (DATE_PART('year', CURRENT_DATE)::text || '-' || TO_CHAR(ap.date_of_birth, 'MM-DD'))::date >= CURRENT_DATE
                 THEN (DATE_PART('year', CURRENT_DATE)::text || '-' || TO_CHAR(ap.date_of_birth, 'MM-DD'))::date
                 ELSE ((DATE_PART('year', CURRENT_DATE) + 1)::text || '-' || TO_CHAR(ap.date_of_birth, 'MM-DD'))::date
               END AS birthday_this_year
        FROM alumni_profiles ap
        JOIN users u ON u.id = ap.user_id
        WHERE u.is_approved = true AND u.is_admin = false AND ap.date_of_birth IS NOT NULL
      )
      SELECT *, (birthday_this_year - CURRENT_DATE)::int AS days_until
      FROM bd
      WHERE birthday_this_year BETWEEN CURRENT_DATE AND CURRENT_DATE + INTERVAL '30 days'
      ORDER BY days_until, last_name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('Birthdays error:', err);
    res.status(500).json({ error: 'Failed to fetch birthdays' });
  }
});

// ── Ad moderation ──────────────────────────────────────────────

// GET /api/admin/ads — all ads with alumni name
router.get('/ads', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT a.*, ap.first_name, ap.last_name, u.email
       FROM advertisements a
       LEFT JOIN users u ON u.id = a.user_id
       LEFT JOIN alumni_profiles ap ON ap.user_id = a.user_id
       ORDER BY a.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin get ads error:', err);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// POST /api/admin/ads/:id/approve
router.post('/ads/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE advertisements SET status = 'approved', approved_at = NOW(), updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Ad not found' });
    res.json({ message: 'Ad approved' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve ad' });
  }
});

// POST /api/admin/ads/:id/reject
router.post('/ads/:id/reject', authenticate, requireAdmin, async (req, res) => {
  const { reason } = req.body;
  try {
    const result = await pool.query(
      `UPDATE advertisements SET status = 'rejected', reject_reason = $2, updated_at = NOW()
       WHERE id = $1 RETURNING id`,
      [req.params.id, reason || null]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Ad not found' });
    res.json({ message: 'Ad rejected' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject ad' });
  }
});

// DELETE /api/admin/ads/:id
router.delete('/ads/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    await pool.query('DELETE FROM advertisements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Ad deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

module.exports = router;
