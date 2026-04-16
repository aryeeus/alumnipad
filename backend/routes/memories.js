const express = require('express');
const router = express.Router();
const pool = require('../config/db');
const { authenticate } = require('../middleware/auth');

// GET /api/memories
router.get('/', authenticate, async (req, res) => {
  const { page = 1 } = req.query;
  const limit = 10;
  const offset = (parseInt(page) - 1) * limit;

  try {
    const countResult = await pool.query('SELECT COUNT(*) FROM memories');
    const total = parseInt(countResult.rows[0].count);

    const result = await pool.query(
      `SELECT m.*, ap.first_name, ap.last_name, ap.profile_photo_url AS author_photo,
              (SELECT COUNT(*) FROM memory_comments mc WHERE mc.memory_id = m.id) AS comment_count,
              EXISTS(
                SELECT 1 FROM memory_likes ml
                WHERE ml.memory_id = m.id AND ml.user_id = $1
              ) AS user_liked
       FROM memories m
       LEFT JOIN alumni_profiles ap ON ap.user_id = m.author_id
       ORDER BY m.created_at DESC
       LIMIT $2 OFFSET $3`,
      [req.user.id, limit, offset]
    );

    res.json({ memories: result.rows, total, page: parseInt(page), pages: Math.ceil(total / limit) });
  } catch (err) {
    console.error('Memories list error:', err);
    res.status(500).json({ error: 'Failed to fetch memories' });
  }
});

// GET /api/memories/:id
router.get('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query(
      `SELECT m.*, ap.first_name, ap.last_name, ap.profile_photo_url AS author_photo,
              EXISTS(
                SELECT 1 FROM memory_likes ml
                WHERE ml.memory_id = m.id AND ml.user_id = $2
              ) AS user_liked
       FROM memories m
       LEFT JOIN alumni_profiles ap ON ap.user_id = m.author_id
       WHERE m.id = $1`,
      [req.params.id, req.user.id]
    );
    if (!result.rows[0]) return res.status(404).json({ error: 'Memory not found' });

    const comments = await pool.query(
      `SELECT mc.*, ap.first_name, ap.last_name, ap.profile_photo_url AS author_photo
       FROM memory_comments mc
       LEFT JOIN alumni_profiles ap ON ap.user_id = mc.author_id
       WHERE mc.memory_id = $1
       ORDER BY mc.created_at ASC`,
      [req.params.id]
    );

    res.json({ ...result.rows[0], comments: comments.rows });
  } catch (err) {
    console.error('Memory get error:', err);
    res.status(500).json({ error: 'Failed to fetch memory' });
  }
});

// POST /api/memories
router.post('/', authenticate, async (req, res) => {
  const { title, content, year_range, tags } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });

  try {
    const result = await pool.query(
      `INSERT INTO memories (author_id, title, content, year_range, tags)
       VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [req.user.id, title, content, year_range || null, tags || null]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Memory create error:', err);
    res.status(500).json({ error: 'Failed to create memory' });
  }
});

// POST /api/memories/:id/comments
router.post('/:id/comments', authenticate, async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Comment content required' });

  try {
    const memory = await pool.query('SELECT id FROM memories WHERE id = $1', [req.params.id]);
    if (!memory.rows[0]) return res.status(404).json({ error: 'Memory not found' });

    const result = await pool.query(
      `INSERT INTO memory_comments (memory_id, author_id, content)
       VALUES ($1, $2, $3) RETURNING *`,
      [req.params.id, req.user.id, content]
    );
    res.status(201).json(result.rows[0]);
  } catch (err) {
    console.error('Comment create error:', err);
    res.status(500).json({ error: 'Failed to add comment' });
  }
});

// POST /api/memories/:id/like — toggle
router.post('/:id/like', authenticate, async (req, res) => {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const existing = await client.query(
      'SELECT id FROM memory_likes WHERE memory_id = $1 AND user_id = $2',
      [req.params.id, req.user.id]
    );

    let liked;
    if (existing.rows.length > 0) {
      await client.query('DELETE FROM memory_likes WHERE memory_id = $1 AND user_id = $2', [req.params.id, req.user.id]);
      await client.query('UPDATE memories SET likes = GREATEST(0, likes - 1) WHERE id = $1', [req.params.id]);
      liked = false;
    } else {
      await client.query('INSERT INTO memory_likes (memory_id, user_id) VALUES ($1, $2)', [req.params.id, req.user.id]);
      await client.query('UPDATE memories SET likes = likes + 1 WHERE id = $1', [req.params.id]);
      liked = true;
    }

    const updated = await client.query('SELECT likes FROM memories WHERE id = $1', [req.params.id]);
    await client.query('COMMIT');

    res.json({ liked, likes: updated.rows[0].likes });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Like toggle error:', err);
    res.status(500).json({ error: 'Failed to toggle like' });
  } finally {
    client.release();
  }
});

// DELETE /api/memories/:id
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM memories WHERE id = $1', [req.params.id]);
    const memory = result.rows[0];
    if (!memory) return res.status(404).json({ error: 'Memory not found' });

    if (memory.author_id !== req.user.id && !req.user.is_admin) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    await pool.query('DELETE FROM memories WHERE id = $1', [req.params.id]);
    res.json({ message: 'Memory deleted' });
  } catch (err) {
    console.error('Memory delete error:', err);
    res.status(500).json({ error: 'Failed to delete memory' });
  }
});

module.exports = router;
