const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const campaignStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/campaigns');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    cb(null, `campaign-${Date.now()}${path.extname(file.originalname)}`);
  },
});
const uploadImage = multer({
  storage: campaignStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only'));
  },
});

// GET /api/campaigns — all active campaigns with raised totals
router.get('/', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dc.*,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) AS raised_amount,
              COUNT(p.id) FILTER (WHERE p.status = 'success') AS donor_count
       FROM donation_campaigns dc
       LEFT JOIN payments p ON p.campaign_id = dc.id
       WHERE dc.is_active = true
       GROUP BY dc.id
       ORDER BY dc.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Campaigns list error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/all — admin: all campaigns (active + inactive)
router.get('/all', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dc.*,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) AS raised_amount,
              COUNT(p.id) FILTER (WHERE p.status = 'success') AS donor_count
       FROM donation_campaigns dc
       LEFT JOIN payments p ON p.campaign_id = dc.id
       GROUP BY dc.id
       ORDER BY dc.created_at DESC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Admin campaigns error:', err);
    res.status(500).json({ error: 'Failed to fetch campaigns' });
  }
});

// GET /api/campaigns/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT dc.*,
              COALESCE(SUM(p.amount) FILTER (WHERE p.status = 'success'), 0) AS raised_amount,
              COUNT(p.id) FILTER (WHERE p.status = 'success') AS donor_count
       FROM donation_campaigns dc
       LEFT JOIN payments p ON p.campaign_id = dc.id
       WHERE dc.id = $1
       GROUP BY dc.id`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Campaign not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch campaign' });
  }
});

// POST /api/campaigns — create (admin only)
router.post('/', authenticate, requireAdmin, uploadImage.single('image'), async (req, res) => {
  const { title, description, goal_amount, currency = 'GHS', start_date, end_date } = req.body;
  if (!title) return res.status(400).json({ error: 'Title required' });

  const image_url = req.file ? `/uploads/campaigns/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `INSERT INTO donation_campaigns (title, description, goal_amount, currency, image_url, start_date, end_date, created_by)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8) RETURNING *`,
      [title, description || null, goal_amount ? parseFloat(goal_amount) : null, currency, image_url, start_date || null, end_date || null, req.user.id]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create campaign error:', err);
    res.status(500).json({ error: 'Failed to create campaign' });
  }
});

// PUT /api/campaigns/:id — update (admin only)
router.put('/:id', authenticate, requireAdmin, uploadImage.single('image'), async (req, res) => {
  const { title, description, goal_amount, start_date, end_date, is_active } = req.body;

  try {
    const existing = await pool.query('SELECT * FROM donation_campaigns WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Campaign not found' });

    const cam = existing.rows[0];
    const image_url = req.file ? `/uploads/campaigns/${req.file.filename}` : cam.image_url;
    const activeVal = is_active !== undefined ? (is_active === 'true' || is_active === true) : cam.is_active;

    const result = await pool.query(
      `UPDATE donation_campaigns
       SET title=$1, description=$2, goal_amount=$3, image_url=$4, start_date=$5, end_date=$6, is_active=$7, updated_at=NOW()
       WHERE id=$8 RETURNING *`,
      [title || cam.title, description ?? cam.description, goal_amount ? parseFloat(goal_amount) : null, image_url, start_date || null, end_date || null, activeVal, req.params.id]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Update campaign error:', err);
    res.status(500).json({ error: 'Failed to update campaign' });
  }
});

// DELETE /api/campaigns/:id — (admin only)
router.delete('/:id', authenticate, requireAdmin, async (req, res) => {
  try {
    const existing = await pool.query('SELECT * FROM donation_campaigns WHERE id = $1', [req.params.id]);
    if (!existing.rows[0]) return res.status(404).json({ error: 'Campaign not found' });

    if (existing.rows[0].image_url) {
      const filePath = path.join(__dirname, '..', existing.rows[0].image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM donation_campaigns WHERE id = $1', [req.params.id]);
    res.json({ message: 'Campaign deleted' });
  } catch (err) {
    console.error('Delete campaign error:', err);
    res.status(500).json({ error: 'Failed to delete campaign' });
  }
});

module.exports = router;
