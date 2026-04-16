const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

const avatarStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    const dir = path.join(__dirname, '../uploads/avatars');
    fs.mkdirSync(dir, { recursive: true });
    cb(null, dir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    cb(null, `avatar-${req.params.id}-${Date.now()}${ext}`);
  },
});

const avatarUpload = multer({
  storage: avatarStorage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) cb(null, true);
    else cb(new Error('Only image files are allowed'));
  },
});

// GET /api/alumni — paginated, filtered
router.get('/', authenticate, async (req, res) => {
  const { search = '', house = '', year = '', program = '', page = 1 } = req.query;
  const limit = 20;
  const offset = (parseInt(page) - 1) * limit;

  const conditions = [`u.is_approved = true`];
  const params = [];
  let idx = 1;

  if (search) {
    conditions.push(`(
      ap.first_name ILIKE $${idx} OR ap.last_name ILIKE $${idx} OR
      ap.occupation ILIKE $${idx} OR ap.city ILIKE $${idx}
    )`);
    params.push(`%${search}%`);
    idx++;
  }
  if (house) {
    conditions.push(`ap.house = $${idx}`);
    params.push(house);
    idx++;
  }
  if (year) {
    conditions.push(`ap.graduation_year = $${idx}`);
    params.push(parseInt(year));
    idx++;
  }
  if (program) {
    conditions.push(`ap.program = $${idx}`);
    params.push(program);
    idx++;
  }

  const where = conditions.join(' AND ');

  try {
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM users u
       LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
       WHERE ${where}`,
      params
    );
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT u.id, u.email, u.created_at,
              ap.first_name, ap.last_name, ap.preferred_name, ap.graduation_year,
              ap.house, ap.program, ap.occupation, ap.employer, ap.industry,
              ap.city, ap.country, ap.profile_photo_url, ap.bio,
              ap.is_mentor_available, ap.has_business, ap.business_name
       FROM users u
       LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
       WHERE ${where}
       ORDER BY ap.last_name, ap.first_name
       LIMIT $${idx} OFFSET $${idx + 1}`,
      [...params, limit, offset]
    );

    res.json({
      alumni: result.rows,
      total,
      page: parseInt(page),
      pages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error('Alumni list error:', err);
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
});

// GET /api/alumni/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT u.id, u.email, u.is_admin, u.created_at,
              ap.*
       FROM users u
       LEFT JOIN alumni_profiles ap ON ap.user_id = u.id
       WHERE u.id = $1 AND u.is_approved = true`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Alumni not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Alumni get error:', err);
    res.status(500).json({ error: 'Failed to fetch alumni' });
  }
});

// PUT /api/alumni/:id
router.put('/:id', authenticate, async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not authorized' });
  }

  const p = req.body;
  try {
    await pool.query(
      `UPDATE alumni_profiles SET
        first_name = COALESCE($1, first_name),
        middle_name = COALESCE($2, middle_name),
        last_name = COALESCE($3, last_name),
        preferred_name = COALESCE($4, preferred_name),
        date_of_birth = COALESCE($5, date_of_birth),
        house = COALESCE($6, house),
        graduation_year = COALESCE($7, graduation_year),
        program = COALESCE($8, program),
        phone = COALESCE($9, phone),
        whatsapp = COALESCE($10, whatsapp),
        city = COALESCE($11, city),
        region = COALESCE($12, region),
        country = COALESCE($13, country),
        linkedin_url = COALESCE($14, linkedin_url),
        facebook_url = COALESCE($15, facebook_url),
        instagram_url = COALESCE($16, instagram_url),
        occupation = COALESCE($17, occupation),
        employer = COALESCE($18, employer),
        industry = COALESCE($19, industry),
        bio = COALESCE($20, bio),
        is_mentor_available = COALESCE($21, is_mentor_available),
        has_business = COALESCE($22, has_business),
        business_name = COALESCE($23, business_name),
        business_description = COALESCE($24, business_description),
        updated_at = NOW()
       WHERE user_id = $25`,
      [
        p.first_name, p.middle_name, p.last_name, p.preferred_name, p.date_of_birth,
        p.house, p.graduation_year, p.program,
        p.phone, p.whatsapp, p.city, p.region, p.country,
        p.linkedin_url, p.facebook_url, p.instagram_url,
        p.occupation, p.employer, p.industry, p.bio,
        p.is_mentor_available, p.has_business, p.business_name, p.business_description,
        req.params.id,
      ]
    );
    res.json({ message: 'Profile updated' });
  } catch (err) {
    console.error('Alumni update error:', err);
    res.status(500).json({ error: 'Failed to update profile' });
  }
});

// POST /api/alumni/:id/photo — upload / replace profile photo
router.post('/:id/photo', authenticate, avatarUpload.single('photo'), async (req, res) => {
  if (req.user.id !== req.params.id && !req.user.is_admin) {
    return res.status(403).json({ error: 'Not authorized' });
  }
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });

  const newUrl = `/uploads/avatars/${req.file.filename}`;

  try {
    // Delete old avatar file if it exists in the avatars folder
    const existing = await pool.query(
      'SELECT profile_photo_url FROM alumni_profiles WHERE user_id = $1',
      [req.params.id]
    );
    const oldUrl = existing.rows[0]?.profile_photo_url;
    if (oldUrl && oldUrl.includes('/uploads/avatars/')) {
      const oldPath = path.join(__dirname, '..', oldUrl);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }

    await pool.query(
      'UPDATE alumni_profiles SET profile_photo_url = $1, updated_at = NOW() WHERE user_id = $2',
      [newUrl, req.params.id]
    );
    res.json({ profile_photo_url: newUrl });
  } catch (err) {
    console.error('Avatar upload error:', err);
    res.status(500).json({ error: 'Failed to upload photo' });
  }
});

module.exports = router;
