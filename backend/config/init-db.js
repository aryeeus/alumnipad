require('dotenv').config();
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function initDb() {
  const client = await pool.connect();
  try {
    console.log('Initializing AlumniPad database...');

    await client.query(`CREATE EXTENSION IF NOT EXISTS "pgcrypto";`);

    // users
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        is_admin BOOLEAN DEFAULT FALSE,
        is_approved BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // alumni_profiles
    await client.query(`
      CREATE TABLE IF NOT EXISTS alumni_profiles (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        first_name VARCHAR(100) NOT NULL,
        middle_name VARCHAR(100),
        last_name VARCHAR(100) NOT NULL,
        preferred_name VARCHAR(100),
        maiden_name VARCHAR(100),
        date_of_birth DATE,
        gender VARCHAR(20),
        house VARCHAR(100),
        year_group VARCHAR(10),
        graduation_year INTEGER,
        boarding_type VARCHAR(20),
        final_year_class VARCHAR(100),
        leadership_roles TEXT,
        clubs TEXT,
        sports TEXT,
        program VARCHAR(100),
        phone VARCHAR(30),
        whatsapp VARCHAR(30),
        secondary_email VARCHAR(255),
        address TEXT,
        city VARCHAR(100),
        region VARCHAR(100),
        country VARCHAR(100),
        linkedin_url VARCHAR(500),
        facebook_url VARCHAR(500),
        instagram_url VARCHAR(500),
        location VARCHAR(255),
        bio TEXT,
        profile_photo_url TEXT,
        occupation VARCHAR(255),
        employer VARCHAR(255),
        industry VARCHAR(255),
        job_title VARCHAR(255),
        professional_field VARCHAR(255),
        years_of_experience INTEGER,
        certifications TEXT,
        expertise TEXT,
        is_mentor_available BOOLEAN DEFAULT FALSE,
        is_speaker_available BOOLEAN DEFAULT FALSE,
        has_board_service BOOLEAN DEFAULT FALSE,
        board_positions JSONB DEFAULT '[]',
        has_business BOOLEAN DEFAULT FALSE,
        business_name VARCHAR(255),
        business_description TEXT,
        business_category VARCHAR(100),
        business_website VARCHAR(500),
        business_phone VARCHAR(30),
        business_email VARCHAR(255),
        business_address TEXT,
        business_logo_url TEXT,
        business_industry VARCHAR(255),
        business_location VARCHAR(255),
        business_social VARCHAR(500),
        business_services TEXT,
        mentorship_areas TEXT,
        career_guidance_available BOOLEAN DEFAULT FALSE,
        emergency_contact_name VARCHAR(255),
        emergency_contact_mobile VARCHAR(30),
        emergency_contact_relationship VARCHAR(100),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migrate: add alumni_code (unique human-readable identifier per alumni)
    await client.query(`
      ALTER TABLE alumni_profiles
        ADD COLUMN IF NOT EXISTS alumni_code VARCHAR(20) UNIQUE;
    `);

    // Migrate: add columns introduced in v3 (safe on existing DBs)
    await client.query(`
      ALTER TABLE alumni_profiles
        ADD COLUMN IF NOT EXISTS middle_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS preferred_name VARCHAR(100),
        ADD COLUMN IF NOT EXISTS boarding_type VARCHAR(20),
        ADD COLUMN IF NOT EXISTS final_year_class VARCHAR(100),
        ADD COLUMN IF NOT EXISTS leadership_roles TEXT,
        ADD COLUMN IF NOT EXISTS clubs TEXT,
        ADD COLUMN IF NOT EXISTS sports TEXT,
        ADD COLUMN IF NOT EXISTS program VARCHAR(100),
        ADD COLUMN IF NOT EXISTS whatsapp VARCHAR(30),
        ADD COLUMN IF NOT EXISTS secondary_email VARCHAR(255),
        ADD COLUMN IF NOT EXISTS address TEXT,
        ADD COLUMN IF NOT EXISTS city VARCHAR(100),
        ADD COLUMN IF NOT EXISTS region VARCHAR(100),
        ADD COLUMN IF NOT EXISTS country VARCHAR(100),
        ADD COLUMN IF NOT EXISTS facebook_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS instagram_url VARCHAR(500),
        ADD COLUMN IF NOT EXISTS job_title VARCHAR(255),
        ADD COLUMN IF NOT EXISTS professional_field VARCHAR(255),
        ADD COLUMN IF NOT EXISTS years_of_experience INTEGER,
        ADD COLUMN IF NOT EXISTS certifications TEXT,
        ADD COLUMN IF NOT EXISTS expertise TEXT,
        ADD COLUMN IF NOT EXISTS is_mentor_available BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS is_speaker_available BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS business_industry VARCHAR(255),
        ADD COLUMN IF NOT EXISTS business_location VARCHAR(255),
        ADD COLUMN IF NOT EXISTS business_social VARCHAR(500),
        ADD COLUMN IF NOT EXISTS business_services TEXT,
        ADD COLUMN IF NOT EXISTS mentorship_areas TEXT,
        ADD COLUMN IF NOT EXISTS career_guidance_available BOOLEAN DEFAULT FALSE,
        ADD COLUMN IF NOT EXISTS emergency_contact_name VARCHAR(255),
        ADD COLUMN IF NOT EXISTS emergency_contact_mobile VARCHAR(30),
        ADD COLUMN IF NOT EXISTS emergency_contact_relationship VARCHAR(100);
    `);

    // photos
    await client.query(`
      CREATE TABLE IF NOT EXISTS photos (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL,
        url TEXT NOT NULL,
        caption TEXT,
        category VARCHAR(100),
        year VARCHAR(10),
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // memories
    await client.query(`
      CREATE TABLE IF NOT EXISTS memories (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(500) NOT NULL,
        content TEXT NOT NULL,
        year_range VARCHAR(50),
        tags TEXT[],
        likes INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // memory_comments
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_comments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
        author_id UUID REFERENCES users(id) ON DELETE SET NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // memory_likes
    await client.query(`
      CREATE TABLE IF NOT EXISTS memory_likes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        memory_id UUID REFERENCES memories(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        created_at TIMESTAMP DEFAULT NOW(),
        UNIQUE(memory_id, user_id)
      );
    `);

    // activities
    await client.query(`
      CREATE TABLE IF NOT EXISTS activities (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        event_date DATE,
        event_time VARCHAR(20),
        location VARCHAR(255),
        event_type VARCHAR(50),
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // advertisements
    await client.query(`
      CREATE TABLE IF NOT EXISTS advertisements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        price VARCHAR(100),
        category VARCHAR(100),
        image_url TEXT,
        contact_info VARCHAR(255),
        business_name VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        reject_reason TEXT,
        approved_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Migrate: add for_alumni_id to advertisements (safe on existing DBs)
    await client.query(`
      ALTER TABLE advertisements
        ADD COLUMN IF NOT EXISTS for_alumni_id UUID REFERENCES users(id) ON DELETE SET NULL;
    `);

    // Migrate: add SMTP settings + birthday template to portal_settings
    await client.query(`
      ALTER TABLE portal_settings
        ADD COLUMN IF NOT EXISTS smtp_host VARCHAR(255),
        ADD COLUMN IF NOT EXISTS smtp_port INTEGER DEFAULT 587,
        ADD COLUMN IF NOT EXISTS smtp_user VARCHAR(255),
        ADD COLUMN IF NOT EXISTS smtp_pass TEXT,
        ADD COLUMN IF NOT EXISTS smtp_from VARCHAR(255),
        ADD COLUMN IF NOT EXISTS smtp_secure BOOLEAN DEFAULT false,
        ADD COLUMN IF NOT EXISTS birthday_subject VARCHAR(500),
        ADD COLUMN IF NOT EXISTS birthday_body TEXT;
    `);

    // donation_campaigns (must come before payments which FK references it)
    await client.query(`
      CREATE TABLE IF NOT EXISTS donation_campaigns (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        title VARCHAR(255) NOT NULL,
        description TEXT,
        goal_amount DECIMAL(10,2),
        currency VARCHAR(10) DEFAULT 'GHS',
        image_url TEXT,
        start_date DATE,
        end_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_by UUID REFERENCES users(id) ON DELETE SET NULL,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // dues_config — annual dues settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS dues_config (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        year INTEGER NOT NULL UNIQUE,
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'GHS',
        description TEXT,
        due_date DATE,
        is_active BOOLEAN DEFAULT TRUE,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // payments — financial transactions (dues + donations)
    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(50) NOT NULL CHECK (type IN ('dues','donation')),
        amount DECIMAL(10,2) NOT NULL,
        currency VARCHAR(10) DEFAULT 'GHS',
        payment_method VARCHAR(50),
        reference VARCHAR(255) UNIQUE,
        paystack_id VARCHAR(255),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','success','failed')),
        dues_year INTEGER,
        campaign_id UUID REFERENCES donation_campaigns(id) ON DELETE SET NULL,
        notes TEXT,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // non_financial_contributions
    await client.query(`
      CREATE TABLE IF NOT EXISTS non_financial_contributions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(id) ON DELETE SET NULL,
        type VARCHAR(100) NOT NULL,
        description TEXT NOT NULL,
        estimated_value DECIMAL(10,2),
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','verified','rejected')),
        verified_by UUID REFERENCES users(id) ON DELETE SET NULL,
        notes TEXT,
        verified_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // job_postings
    await client.query(`
      CREATE TABLE IF NOT EXISTS job_postings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        posted_by UUID REFERENCES users(id) ON DELETE SET NULL,
        title VARCHAR(255) NOT NULL,
        company VARCHAR(255),
        location VARCHAR(255),
        type VARCHAR(50) DEFAULT 'Full-Time',
        description TEXT NOT NULL,
        requirements TEXT,
        application_url VARCHAR(500),
        application_email VARCHAR(255),
        salary_range VARCHAR(100),
        industry VARCHAR(100),
        is_active BOOLEAN DEFAULT TRUE,
        status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected')),
        expires_at DATE,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);
    // Migration: add status column to existing installations
    await client.query(`ALTER TABLE job_postings ADD COLUMN IF NOT EXISTS status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending','approved','rejected'))`);
    // Approve any jobs that existed before the approval system was added
    await client.query(`UPDATE job_postings SET status = 'approved' WHERE status IS NULL`);

    // portal_settings
    await client.query(`
      CREATE TABLE IF NOT EXISTS portal_settings (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        school_name VARCHAR(255) DEFAULT 'AlumniPad School',
        logo_url TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Seed default portal settings if not exist
    await client.query(`
      INSERT INTO portal_settings (school_name)
      SELECT 'AlumniPad School'
      WHERE NOT EXISTS (SELECT 1 FROM portal_settings);
    `);

    // Seed default admin
    const adminEmail = 'admin@alumnipad.com';
    const existing = await client.query('SELECT id FROM users WHERE email = $1', [adminEmail]);
    if (existing.rows.length === 0) {
      const hash = await bcrypt.hash('admin123', 10);
      const adminUser = await client.query(
        `INSERT INTO users (email, password_hash, is_admin, is_approved)
         VALUES ($1, $2, true, true) RETURNING id`,
        [adminEmail, hash]
      );
      await client.query(
        `INSERT INTO alumni_profiles (user_id, first_name, last_name)
         VALUES ($1, 'Admin', 'User')`,
        [adminUser.rows[0].id]
      );
      console.log('Default admin created: admin@alumnipad.com / admin123');
    }

    console.log('Database initialized successfully.');
  } catch (err) {
    console.error('Error initializing database:', err);
    throw err;
  } finally {
    client.release();
    await pool.end();
  }
}

initDb().catch(() => process.exit(1));
