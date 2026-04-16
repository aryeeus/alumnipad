const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/photos');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `${Date.now()}-${Math.random().toString(36).slice(2)}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// GET /api/photos
router.get('/', authenticate, async (req, res) => {
  const { category = '', year = '', page = 1 } = req.query;
  const limit = 20;
  const offset = (parseInt(page) - 1) * limit;

  const conditions = [];
  const params = [];
  let idx = 1;

  if (category) {
    conditions.push(`p.category = $${idx}`);
    params.push(category);
    idx++;
  }
  if (year) {
    conditions.push(`p.year = $${idx}`);
    params.push(year);
    idx++;
  }

  const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';

  try {
    const countResult = await pool.query(`SELECT COUNT(*) FROM photos p ${where}`, params);
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT p.*, ap.first_name, ap.last_name, ap.profile_photo_url AS uploader_photo
       FROM photos p
       LEFT JOIN alumni_profiles ap ON ap.user_id = p.uploaded_by
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    res.json({ photos: result.rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Photos list error:', err);
    res.status(500).json({ error: 'Failed to fetch photos' });
  }
});

// POST /api/photos
router.post('/', authenticate, upload.single('photo'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const { caption, category, year } = req.body;
  const url = `/uploads/photos/${req.file.filename}`;

  try {
    const result = await pool.query(
      `INSERT INTO photos (uploaded_by, url, caption, category, year)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, url, caption || null, category || null, year || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Photo upload error:', err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

// DELETE /api/photos/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM photos WHERE id = $1', [req.params.id]);
    const photo = result.rows[0];
    if (!photo) return res.status(404).json({ error: 'Photo not found' });

    if (photo.uploaded_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const filePath = path.join(__dirname, '..', photo.url);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

    await pool.query('DELETE FROM photos WHERE id = $1', [req.params.id]);
    res.json({ message: 'Photo deleted' });
  } catch (err) {
    console.error('Photo delete error:', err);
    res.status(500).json({ error: 'Failed to delete photo' });
  }
});

module.exports = router;
