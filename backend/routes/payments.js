const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate, requireAdmin } = require('../middleware/auth');
const crypto = require('crypto');

const PAYSTACK_SECRET = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = 'https://api.paystack.co';

async function paystackRequest(method, endpoint, body) {
  const res = await fetch(`${PAYSTACK_BASE}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET}`,
      'Content-Type': 'application/json',
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  return res.json();
}

// ── Member-facing routes ────────────────────────────────────────────

// GET /api/payments/dues-status
router.get('/dues-status', authenticate, async (req, res) => {
  const currentYear = new Date().getFullYear();
  try {
    const [configRes, paidRes] = await Promise.all([
      pool.query('SELECT * FROM dues_config WHERE year = $1 AND is_active = true', [currentYear]),
      pool.query(
        `SELECT * FROM payments WHERE user_id = $1 AND type = 'dues' AND dues_year = $2 AND status = 'success' ORDER BY created_at DESC LIMIT 1`,
        [req.user.id, currentYear]
      ),
    ]);
    res.json({
      year: currentYear,
      config: configRes.rows[0] || null,
      paid: paidRes.rows.length > 0,
      payment: paidRes.rows[0] || null,
    });
  } catch (err) {
    console.error('Dues status error:', err);
    res.status(500).json({ error: 'Failed to check dues status' });
  }
});

// GET /api/payments/history
router.get('/history', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT p.*, dc.title AS campaign_title
       FROM payments p
       LEFT JOIN donation_campaigns dc ON dc.id = p.campaign_id
       WHERE p.user_id = $1
       ORDER BY p.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Payment history error:', err);
    res.status(500).json({ error: 'Failed to fetch payment history' });
  }
});

// POST /api/payments/initialize — create Paystack transaction
router.post('/initialize', authenticate, async (req, res) => {
  const { type, amount, currency = 'GHS', dues_year, campaign_id } = req.body;

  if (!type || !amount) return res.status(400).json({ error: 'Type and amount required' });
  if (!['dues', 'donation'].includes(type)) return res.status(400).json({ error: 'Invalid payment type' });
  if (!PAYSTACK_SECRET) return res.status(503).json({ error: 'Payment gateway not configured. Contact the administrator.' });

  const reference = `AP-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
  const amountPesewas = Math.round(parseFloat(amount) * 100);

  try {
    const userRes = await pool.query('SELECT email FROM users WHERE id = $1', [req.user.id]);
    const email = userRes.rows[0]?.email;
    if (!email) return res.status(400).json({ error: 'User not found' });

    // Store pending payment record first
    await pool.query(
      `INSERT INTO payments (user_id, type, amount, currency, reference, status, dues_year, campaign_id)
       VALUES ($1, $2, $3, $4, $5, 'pending', $6, $7)`,
      [req.user.id, type, parseFloat(amount), currency, reference, dues_year || null, campaign_id || null]
    );

    const paystackRes = await paystackRequest('POST', '/transaction/initialize', {
      email,
      amount: amountPesewas,
      currency,
      reference,
      channels: ['card', 'mobile_money'],
      metadata: { user_id: req.user.id, type, dues_year: dues_year || null, campaign_id: campaign_id || null },
    });

    if (!paystackRes.status) {
      return res.status(400).json({ error: paystackRes.message || 'Payment initialization failed' });
    }

    res.json({
      reference,
      authorization_url: paystackRes.data.authorization_url,
      access_code: paystackRes.data.access_code,
    });
  } catch (err) {
    console.error('Payment initialize error:', err);
    res.status(500).json({ error: 'Failed to initialize payment' });
  }
});

// POST /api/payments/verify
router.post('/verify', authenticate, async (req, res) => {
  const { reference } = req.body;
  if (!reference) return res.status(400).json({ error: 'Reference required' });

  try {
    const paystackRes = await paystackRequest('GET', `/transaction/verify/${reference}`);

    if (!paystackRes.status || paystackRes.data?.status !== 'success') {
      await pool.query(
        `UPDATE payments SET status = 'failed' WHERE reference = $1 AND user_id = $2`,
        [reference, req.user.id]
      );
      return res.status(400).json({ error: 'Payment not successful' });
    }

    const data = paystackRes.data;
    await pool.query(
      `UPDATE payments SET status = 'success', paystack_id = $1, payment_method = $2, verified_at = NOW()
       WHERE reference = $3 AND user_id = $4`,
      [String(data.id || ''), data.channel || null, reference, req.user.id]
    );

    res.json({ message: 'Payment verified successfully' });
  } catch (err) {
    console.error('Payment verify error:', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

// DELETE /api/payments/cancel/:reference — discard a pending payment (user cancelled)
router.delete('/cancel/:reference', authenticate, async (req, res) => {
  try {
    await pool.query(
      `DELETE FROM payments WHERE reference = $1 AND user_id = $2 AND status = 'pending'`,
      [req.params.reference, req.user.id]
    );
    res.json({ message: 'Cancelled' });
  } catch (err) {
    console.error('Cancel payment error:', err);
    res.status(500).json({ error: 'Failed to cancel payment' });
  }
});

// GET /api/payments/contributions — user's own contributions
router.get('/contributions', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT nfc.*,
              vb.first_name AS verifier_first_name, vb.last_name AS verifier_last_name
       FROM non_financial_contributions nfc
       LEFT JOIN alumni_profiles vb ON vb.user_id = nfc.verified_by
       WHERE nfc.user_id = $1
       ORDER BY nfc.created_at DESC`,
      [req.user.id]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Get contributions error:', err);
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

// POST /api/payments/contributions
router.post('/contributions', authenticate, async (req, res) => {
  const { type, description, estimated_value } = req.body;
  if (!type || !description) return res.status(400).json({ error: 'Type and description required' });

  try {
    const result = await pool.query(
      `INSERT INTO non_financial_contributions (user_id, type, description, estimated_value)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [req.user.id, type, description, estimated_value ? parseFloat(estimated_value) : null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Submit contribution error:', err);
    res.status(500).json({ error: 'Failed to submit contribution' });
  }
});

// ── Admin routes ────────────────────────────────────────────────────

// GET /api/payments/admin/all
router.get('/admin/all', authenticate, requireAdmin, async (req, res) => {
  const { type, status, page = 1 } = req.query;
  const limit = 20;
  const offset = (page - 1) * limit;

  let where = 'WHERE 1=1';
  const params = [];
  let idx = 1;

  if (type) { params.push(type); where += ` AND p.type = $${idx++}`; }
  if (status) { params.push(status); where += ` AND p.status = $${idx++}`; }

  try {
    const countRes = await pool.query(`SELECT COUNT(*) FROM payments p ${where}`, params);
    const total = parseInt(countRes.rows[0].count);

    params.push(limit, offset);
    const result = await pool.query(
      `SELECT p.*, ap.first_name, ap.last_name, ap.graduation_year, u.email, dc.title AS campaign_title
       FROM payments p
       LEFT JOIN users u ON u.id = p.user_id
       LEFT JOIN alumni_profiles ap ON ap.user_id = p.user_id
       LEFT JOIN donation_campaigns dc ON dc.id = p.campaign_id
       ${where}
       ORDER BY p.created_at DESC
       LIMIT $${idx} OFFSET $${idx + 1}`,
      params
    );
    res.json({ payments: result.rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Admin all payments error:', err);
    res.status(500).json({ error: 'Failed to fetch payments' });
  }
});

// POST /api/payments/admin/record — manual offline payment
router.post('/admin/record', authenticate, requireAdmin, async (req, res) => {
  const { user_id, type, amount, currency = 'GHS', payment_method = 'cash', dues_year, campaign_id, notes } = req.body;
  if (!user_id || !type || !amount) return res.status(400).json({ error: 'user_id, type, and amount required' });

  const reference = `AP-MANUAL-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

  try {
    const result = await pool.query(
      `INSERT INTO payments (user_id, type, amount, currency, payment_method, reference, status, dues_year, campaign_id, notes, verified_at)
       VALUES ($1,$2,$3,$4,$5,$6,'success',$7,$8,$9,NOW()) RETURNING *`,
      [user_id, type, parseFloat(amount), currency, payment_method, reference, dues_year || null, campaign_id || null, notes || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Manual record error:', err);
    res.status(500).json({ error: 'Failed to record payment' });
  }
});

// GET /api/payments/admin/dues-config
router.get('/admin/dues-config', authenticate, requireAdmin, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM dues_config ORDER BY year DESC');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch dues config' });
  }
});

// POST /api/payments/admin/dues-config — create or update by year (upsert)
router.post('/admin/dues-config', authenticate, requireAdmin, async (req, res) => {
  const { year, amount, currency = 'GHS', description, due_date } = req.body;
  if (!year || !amount) return res.status(400).json({ error: 'Year and amount required' });

  try {
    const result = await pool.query(
      `INSERT INTO dues_config (year, amount, currency, description, due_date)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (year) DO UPDATE SET amount=$2, currency=$3, description=$4, due_date=$5, is_active=true
       RETURNING *`,
      [parseInt(year), parseFloat(amount), currency, description || null, due_date || null]
    );
    res.json(result.rows[0]);
  } catch (err) {
    console.error('Dues config error:', err);
    res.status(500).json({ error: 'Failed to save dues config' });
  }
});

// GET /api/payments/admin/dues-report?year=2026
router.get('/admin/dues-report', authenticate, requireAdmin, async (req, res) => {
  const year = parseInt(req.query.year) || new Date().getFullYear();
  try {
    const result = await pool.query(
      `SELECT u.id, u.email,
              ap.first_name, ap.last_name, ap.graduation_year, ap.profile_photo_url,
              CASE WHEN p.id IS NOT NULL THEN true ELSE false END AS has_paid,
              p.amount, p.payment_method, p.verified_at
       FROM users u
       JOIN alumni_profiles ap ON ap.user_id = u.id
       LEFT JOIN payments p ON p.user_id = u.id AND p.type = 'dues' AND p.dues_year = $1 AND p.status = 'success'
       WHERE u.is_approved = true AND u.is_admin = false
       ORDER BY has_paid ASC, ap.last_name, ap.first_name`,
      [year]
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Dues report error:', err);
    res.status(500).json({ error: 'Failed to fetch dues report' });
  }
});

// GET /api/payments/admin/contributions?status=pending
router.get('/admin/contributions', authenticate, requireAdmin, async (req, res) => {
  const { status } = req.query;
  const params = [];
  let where = '';
  if (status) { params.push(status); where = 'WHERE nfc.status = $1'; }

  try {
    const result = await pool.query(
      `SELECT nfc.*, ap.first_name, ap.last_name, u.email
       FROM non_financial_contributions nfc
       LEFT JOIN users u ON u.id = nfc.user_id
       LEFT JOIN alumni_profiles ap ON ap.user_id = nfc.user_id
       ${where}
       ORDER BY nfc.created_at DESC`,
      params
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch contributions' });
  }
});

// PUT /api/payments/admin/contributions/:id
router.put('/admin/contributions/:id', authenticate, requireAdmin, async (req, res) => {
  const { status, notes } = req.body;
  if (!['verified', 'rejected'].includes(status)) return res.status(400).json({ error: 'Status must be verified or rejected' });

  try {
    const result = await pool.query(
      `UPDATE non_financial_contributions SET status=$1, notes=$2, verified_by=$3, verified_at=NOW() WHERE id=$4 RETURNING *`,
      [status, notes || null, req.user.id, req.params.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Contribution not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update contribution' });
  }
});

// GET /api/payments/admin/summary — dashboard stats
router.get('/admin/summary', authenticate, requireAdmin, async (req, res) => {
  const year = new Date().getFullYear();
  try {
    const [totalRes, duesRes, donationsRes, pendingContribRes] = await Promise.all([
      pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE status='success'`),
      pool.query(`SELECT COUNT(*) AS paid FROM payments WHERE type='dues' AND dues_year=$1 AND status='success'`, [year]),
      pool.query(`SELECT COALESCE(SUM(amount),0) AS total FROM payments WHERE type='donation' AND status='success'`),
      pool.query(`SELECT COUNT(*) AS pending FROM non_financial_contributions WHERE status='pending'`),
    ]);
    res.json({
      total_collected: parseFloat(totalRes.rows[0].total),
      dues_paid_this_year: parseInt(duesRes.rows[0].paid),
      total_donations: parseFloat(donationsRes.rows[0].total),
      pending_contributions: parseInt(pendingContribRes.rows[0].pending),
    });
  } catch (err) {
    console.error('Finance summary error:', err);
    res.status(500).json({ error: 'Failed to fetch summary' });
  }
});

module.exports = router;
