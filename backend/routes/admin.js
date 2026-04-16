const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

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
    const result = await pool.query(
      'UPDATE users SET is_approved = true, updated_at = NOW() WHERE id = $1 RETURNING id',
      [req.params.userId]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'User not found' });
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
