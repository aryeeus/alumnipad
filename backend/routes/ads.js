const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const adImageStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/ads');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `ad-${Date.now()}${ext}`);
  },
});
const uploadAdImage = multer({
  storage: adImageStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Images only'));
  },
});

// GET /api/ads — approved ads (auth required to view)
router.get('/', authenticate, async (req, res) => {
  try {
    const { category, search, page = 1 } = req.query;
    const limit = 12;
    const offset = (page - 1) * limit;

    let where = `WHERE a.status = 'approved'`;
    const params = [];
    let idx = 1;

    if (category) {
      params.push(category);
      where += ` AND a.category = $${idx++}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` AND (a.title ILIKE $${idx} OR a.description ILIKE $${idx} OR a.business_name ILIKE $${idx})`;
      idx++;
    }

    const countResult = await pool.query(
      `SELECT COUNT(*) FROM advertisements a ${where}`, params
    );
    const total = parseInt(countResult.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT a.*, ap.first_name, ap.last_name, ap.profile_photo_url
       FROM advertisements a
       LEFT JOIN alumni_profiles ap ON ap.user_id = a.user_id
       ${where}
       ORDER BY a.approved_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );

    res.json({
      ads: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Get ads error:', err);
    res.status(500).json({ error: 'Failed to fetch ads' });
  }
});

// GET /api/ads/mine — current user's ads
router.get('/mine', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM advertisements WHERE user_id = $1 ORDER BY created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch your ads' });
  }
});

// POST /api/ads — submit a new ad
router.post('/', authenticate, uploadAdImage.single('image'), async (req, res) => {
  const { title, description, price, category, contact_info, business_name } = req.body;
  if (!title || !description) return res.status(400).json({ error: 'Title and description required' });

  const image_url = req.file ? `/uploads/ads/${req.file.filename}` : null;

  try {
    const result = await pool.query(
      `INSERT INTO advertisements (user_id, title, description, price, category, image_url, contact_info, business_name)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [req.user.id, title, description, price || null, category || null, image_url, contact_info || null, business_name || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Create ad error:', err);
    res.status(500).json({ error: 'Failed to submit ad' });
  }
});

// DELETE /api/ads/:id — delete own ad (or admin)
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const adRes = await pool.query('SELECT * FROM advertisements WHERE id = $1', [req.params.id]);
    if (!adRes.rows[0]) return res.status(404).json({ error: 'Ad not found' });

    const ad = adRes.rows[0];
    if (ad.user_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorised' });
    }

    // Delete image file if exists
    if (ad.image_url) {
      const filePath = path.join(__dirname, '..', ad.image_url);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    await pool.query('DELETE FROM advertisements WHERE id = $1', [req.params.id]);
    res.json({ message: 'Ad deleted' });
  } catch (err) {
    console.error('Delete ad error:', err);
    res.status(500).json({ error: 'Failed to delete ad' });
  }
});

module.exports = router;
