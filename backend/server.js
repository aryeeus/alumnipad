require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db');

const app = express();

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:8080', credentials: true }));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve uploaded files as static assets
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api/alumni', require('./routes/alumni'));
app.use('/api/photos', require('./routes/photos'));
app.use('/api/memories', require('./routes/memories'));
app.use('/api/admin', require('./routes/admin'));
app.use('/api/activities', require('./routes/activities'));
app.use('/api/ads', require('./routes/ads'));

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok', time: new Date().toISOString() }));

// Public stats — used on landing page (no auth required)
app.get('/api/public/stats', async (req, res) => {
  try {
    const [alumni, cities, activities, mentors, businesses] = await Promise.all([
      pool.query("SELECT COUNT(*) FROM users WHERE is_approved = true AND is_admin = false"),
      pool.query("SELECT COUNT(DISTINCT city) FROM alumni_profiles ap JOIN users u ON u.id = ap.user_id WHERE u.is_approved = true AND city IS NOT NULL AND city <> ''"),
      pool.query("SELECT COUNT(*) FROM activities"),
      pool.query("SELECT COUNT(*) FROM alumni_profiles ap JOIN users u ON u.id = ap.user_id WHERE u.is_approved = true AND ap.is_mentor_available = true"),
      pool.query("SELECT COUNT(*) FROM alumni_profiles ap JOIN users u ON u.id = ap.user_id WHERE u.is_approved = true AND ap.has_business = true"),
    ]);
    res.json({
      total_alumni: parseInt(alumni.rows[0].count),
      unique_cities: parseInt(cities.rows[0].count),
      total_activities: parseInt(activities.rows[0].count),
      total_mentors: parseInt(mentors.rows[0].count),
      total_businesses: parseInt(businesses.rows[0].count),
    });
  } catch (err) {
    console.error('Public stats error:', err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});

// Public portal settings — logo & school name (no auth required)
app.get('/api/public/settings', async (req, res) => {
  try {
    const result = await pool.query('SELECT school_name, logo_url FROM portal_settings LIMIT 1');
    res.json(result.rows[0] || { school_name: 'AlumniPad', logo_url: null });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// Global error handler
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: err.message || 'Internal server error' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`AlumniPad API running on port ${PORT}`));
