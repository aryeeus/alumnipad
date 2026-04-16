const express = require('express');
const router = express.Router();
const pool = require('../config/db');

// GET /api/activities — public
router.get('/', async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT * FROM activities ORDER BY event_date ASC`
    );
    res.json(result.rows);
  } catch (err) {
    console.error('Activities error:', err);
    res.status(500).json({ error: 'Failed to fetch activities' });
  }
});

module.exports = router;

