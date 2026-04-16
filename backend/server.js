require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const pool = require('./config/db');
const { getMailer } = require('./utils/mailer');

// ── Birthday email scheduler ────────────────────────────────────

function applyVars(template, vars) {
  return Object.entries(vars).reduce((t, [k, v]) => t.replaceAll(`{{${k}}}`, v ?? ''), template);
}

async function sendBirthdayEmails() {
  const mailerObj = await getMailer();
  if (!mailerObj) return;
  const { transport, from } = mailerObj;

  try {
    // Fetch today's birthdays + school name + template in parallel
    const [alumniRes, settingsRes] = await Promise.all([
      pool.query(`
        SELECT u.email, ap.first_name, ap.last_name
        FROM alumni_profiles ap
        JOIN users u ON u.id = ap.user_id
        WHERE u.is_approved = true AND u.is_admin = false AND ap.date_of_birth IS NOT NULL
          AND TO_CHAR(ap.date_of_birth, 'MM-DD') = TO_CHAR(CURRENT_DATE, 'MM-DD')
      `),
      pool.query('SELECT school_name, birthday_subject, birthday_body FROM portal_settings LIMIT 1'),
    ]);

    const settings   = settingsRes.rows[0] || {};
    const schoolName = settings.school_name || 'AlumniPad';
    const appUrl     = process.env.FRONTEND_URL || 'http://localhost:8080';

    const defaultSubject = 'Happy Birthday, {{first_name}}! 🎂';
    const defaultBody = `<div style="font-family:Inter,sans-serif;max-width:520px;margin:0 auto;padding:32px 24px;background:#f5f7ff">
  <div style="background:linear-gradient(135deg,#1a2744,#1e40af);border-radius:16px;padding:32px;text-align:center;margin-bottom:24px">
    <div style="font-size:48px;margin-bottom:8px">🎂</div>
    <h1 style="color:#facc15;font-size:26px;margin:0;font-family:Georgia,serif">Happy Birthday!</h1>
  </div>
  <div style="background:#fff;border-radius:16px;padding:28px;box-shadow:0 2px 8px rgba(0,0,0,0.06)">
    <h2 style="color:#1a2744;margin-top:0">Dear {{first_name}},</h2>
    <p style="color:#374151;line-height:1.7;font-size:15px">
      On behalf of the entire {{school_name}} alumni community, we wish you a very happy birthday!
      May this special day be filled with joy, laughter, and wonderful memories.
    </p>
    <p style="color:#374151;line-height:1.7;font-size:15px">
      Your fellow alumni are celebrating with you today. We are grateful to have you as part of our family.
    </p>
    <div style="text-align:center;margin:28px 0">
      <a href="{{app_url}}" style="background:linear-gradient(135deg,#1e40af,#1a2744);color:#fff;padding:14px 32px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
        Visit AlumniPad
      </a>
    </div>
    <p style="color:#9ca3af;font-size:13px;margin-bottom:0;text-align:center">
      With warm wishes from the {{school_name}} alumni community 🎓
    </p>
  </div>
</div>`;

    const subjectTpl = settings.birthday_subject || defaultSubject;
    const bodyTpl    = settings.birthday_body    || defaultBody;

    for (const alumni of alumniRes.rows) {
      const vars = {
        first_name:  alumni.first_name,
        last_name:   alumni.last_name ?? '',
        school_name: schoolName,
        year:        new Date().getFullYear().toString(),
        app_url:     appUrl,
      };
      transport.sendMail({
        from,
        to:      alumni.email,
        subject: applyVars(subjectTpl, vars),
        html:    applyVars(bodyTpl, vars),
      }).catch((err) => console.error(`Birthday email error for ${alumni.email}:`, err));
    }
    if (alumniRes.rows.length) console.log(`Birthday emails sent to ${alumniRes.rows.length} alumni.`);
  } catch (err) {
    console.error('Birthday scheduler error:', err);
  }
}

function scheduleDailyBirthdays() {
  const now = new Date();
  const next8am = new Date(now);
  next8am.setHours(8, 0, 0, 0);
  if (next8am <= now) next8am.setDate(next8am.getDate() + 1);
  const msUntil8am = next8am - now;

  setTimeout(() => {
    sendBirthdayEmails();
    setInterval(sendBirthdayEmails, 24 * 60 * 60 * 1000);
  }, msUntil8am);
  console.log(`Birthday emails scheduled — next run at 08:00 (in ${Math.round(msUntil8am / 3600000)}h)`);
}

scheduleDailyBirthdays();

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
