const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');

const JOB_TYPES = ['Full-Time', 'Part-Time', 'Contract', 'Internship', 'Volunteer'];

// GET /api/jobs — approved, non-expired jobs visible to all logged-in alumni
router.get('/', authenticate, async (req, res) => {
  const { industry, type, search, page = 1 } = req.query;
  const limit = 12;
  const offset = (page - 1) * limit;

  let where = `WHERE jp.is_active = true AND jp.status = 'approved'
               AND (jp.expires_at IS NULL OR jp.expires_at >= CURRENT_DATE)`;
  const params = [];
  let idx = 1;

  if (industry) { params.push(industry); where += ` AND jp.industry = $${idx++}`; }
  if (type) { params.push(type); where += ` AND jp.type = $${idx++}`; }
  if (search) {
    params.push(`%${search}%`);
    where += ` AND (jp.title ILIKE $${idx} OR jp.company ILIKE $${idx} OR jp.description ILIKE $${idx})`;
    idx++;
  }

  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM job_postings jp ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT jp.*,
              ap.first_name AS poster_first_name, ap.last_name AS poster_last_name,
              ap.profile_photo_url AS poster_photo
       FROM job_postings jp
       LEFT JOIN alumni_profiles ap ON ap.user_id = jp.posted_by
       ${where}
       ORDER BY jp.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    res.json({ jobs: result.rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Jobs list error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// GET /api/jobs/mine — own jobs (any status), so poster can see their pending/rejected
router.get('/mine', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT jp.*,
              ap.first_name AS poster_first_name, ap.last_name AS poster_last_name,
              ap.profile_photo_url AS poster_photo
       FROM job_postings jp
       LEFT JOIN alumni_profiles ap ON ap.user_id = jp.posted_by
       WHERE jp.posted_by = $1
       ORDER BY jp.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('My jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch your jobs' });
  }
});

// POST /api/jobs — submit job for admin approval
router.post('/', authenticate, async (req, res) => {
  const {
    title, company, location, type, description,
    requirements, application_url, application_email,
    salary_range, industry, expires_at,
  } = req.body;

  if (!title || !description) return res.status(400).json({ error: 'Title and description required' });
  if (type && !JOB_TYPES.includes(type)) return res.status(400).json({ error: 'Invalid job type' });

  try {
    const result = await pool.query(
      `INSERT INTO job_postings
         (posted_by, title, company, location, type, description, requirements,
          application_url, application_email, salary_range, industry, expires_at, status)
       VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,'pending') RETURNING *`,
      [
        req.user.id, title, company || null, location || null,
        type || 'Full-Time', description, requirements || null,
        application_url || null, application_email || null,
        salary_range || null, industry || null, expires_at || null,
      ]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Post job error:', err);
    res.status(500).json({ error: 'Failed to post job' });
  }
});

// DELETE /api/jobs/:id — own post or admin
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const jobRes = await pool.query('SELECT * FROM job_postings WHERE id = $1', [req.params.id]);
    if (!jobRes.rows[0]) return res.status(404).json({ error: 'Job not found' });
    if (jobRes.rows[0].posted_by !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorised' });
    }
    await pool.query('DELETE FROM job_postings WHERE id = $1', [req.params.id]);
    res.json({ message: 'Job deleted' });
  } catch (err) {
    console.error('Delete job error:', err);
    res.status(500).json({ error: 'Failed to delete job' });
  }
});

// ── Admin routes ────────────────────────────────────────────────────

// GET /api/jobs/admin/all — all jobs regardless of status
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  const { status, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params = [];
  let idx = 1;
  if (status) { params.push(status); where += ` AND jp.status = $${idx++}`; }

  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM job_postings jp ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT jp.*,
              ap.first_name AS poster_first_name, ap.last_name AS poster_last_name,
              u.email AS poster_email
       FROM job_postings jp
       LEFT JOIN alumni_profiles ap ON ap.user_id = jp.posted_by
       LEFT JOIN users u ON u.id = jp.posted_by
       ${where}
       ORDER BY jp.status ASC, jp.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    res.json({ jobs: result.rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Admin jobs error:', err);
    res.status(500).json({ error: 'Failed to fetch jobs' });
  }
});

// POST /api/jobs/admin/:id/approve
router.post('/admin/:id/approve', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE job_postings SET status = 'approved', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Approve job error:', err);
    res.status(500).json({ error: 'Failed to approve job' });
  }
});

// POST /api/jobs/admin/:id/reject
router.post('/admin/:id/reject', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query(
      `UPDATE job_postings SET status = 'rejected', updated_at = NOW() WHERE id = $1 RETURNING *`,
      [req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Job not found' });
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Reject job error:', err);
    res.status(500).json({ error: 'Failed to reject job' });
  }
});

module.exports = router;
