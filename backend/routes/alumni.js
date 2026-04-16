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
  // Helper: convert empty string to null so fields can be cleared
  const v = (val) => (val === '' || val === undefined ? null : val);

  try {
    await pool.query(
      `UPDATE alumni_profiles SET
        first_name            = COALESCE($1,  first_name),
        middle_name           = $2,
        last_name             = COALESCE($3,  last_name),
        preferred_name        = $4,
        date_of_birth         = $5,
        bio                   = $6,
        phone                 = $7,
        whatsapp              = $8,
        secondary_email       = $9,
        address               = $10,
        city                  = $11,
        region                = $12,
        country               = $13,
        linkedin_url          = $14,
        facebook_url          = $15,
        instagram_url         = $16,
        occupation            = $17,
        employer              = $18,
        job_title             = $19,
        industry              = $20,
        professional_field    = $21,
        years_of_experience   = $22,
        certifications        = $23,
        expertise             = $24,
        is_mentor_available   = $25,
        is_speaker_available  = $26,
        has_board_service     = $27,
        mentorship_areas      = $28,
        house                 = $29,
        graduation_year       = $30,
        program               = $31,
        boarding_type         = $32,
        final_year_class      = $33,
        leadership_roles      = $34,
        clubs                 = $35,
        sports                = $36,
        has_business          = $37,
        business_name         = $38,
        business_description  = $39,
        business_category     = $40,
        business_website      = $41,
        business_location     = $42,
        business_phone        = $43,
        business_email        = $44,
        business_industry     = $45,
        business_services     = $46,
        business_social       = $47,
        updated_at            = NOW()
       WHERE user_id = $48`,
      [
        v(p.first_name), v(p.middle_name), v(p.last_name), v(p.preferred_name),
        v(p.date_of_birth), v(p.bio),
        v(p.phone), v(p.whatsapp), v(p.secondary_email), v(p.address),
        v(p.city), v(p.region), v(p.country),
        v(p.linkedin_url), v(p.facebook_url), v(p.instagram_url),
        v(p.occupation), v(p.employer), v(p.job_title), v(p.industry),
        v(p.professional_field),
        p.years_of_experience != null && p.years_of_experience !== '' ? parseInt(p.years_of_experience) : null,
        v(p.certifications), v(p.expertise),
        p.is_mentor_available ?? false,
        p.is_speaker_available ?? false,
        p.has_board_service ?? false,
        v(p.mentorship_areas),
        v(p.house),
        p.graduation_year != null && p.graduation_year !== '' ? parseInt(p.graduation_year) : null,
        v(p.program), v(p.boarding_type), v(p.final_year_class),
        v(p.leadership_roles), v(p.clubs), v(p.sports),
        p.has_business ?? false,
        v(p.business_name), v(p.business_description), v(p.business_category),
        v(p.business_website), v(p.business_location), v(p.business_phone),
        v(p.business_email), v(p.business_industry), v(p.business_services), v(p.business_social),
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
