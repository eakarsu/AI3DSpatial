const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authenticate } = require('../middleware/auth');

module.exports = (pool) => {
  const router = express.Router();

  // POST /api/auth/login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }

      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email.toLowerCase().trim()]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/auth/register
  router.post('/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;

      if (!email || typeof email !== 'string' || !email.includes('@')) {
        return res.status(400).json({ error: 'Valid email is required' });
      }
      if (!password || typeof password !== 'string' || password.length < 6) {
        return res.status(400).json({ error: 'Password must be at least 6 characters' });
      }
      if (!name || typeof name !== 'string' || !name.trim()) {
        return res.status(400).json({ error: 'Name is required' });
      }
      if (name.length > 255) {
        return res.status(400).json({ error: 'Name must be 255 characters or fewer' });
      }

      const hashed = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email.toLowerCase().trim(), hashed, name.trim()]
      );
      const user = result.rows[0];
      const token = jwt.sign(
        { id: user.id, email: user.email, name: user.name },
        process.env.JWT_SECRET,
        { expiresIn: '24h' }
      );
      res.json({ token, user });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/auth/me — uses authenticate middleware
  router.get('/me', authenticate, async (req, res) => {
    try {
      const result = await pool.query('SELECT id, email, name, created_at FROM users WHERE id = $1', [req.user.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'User not found' });
      res.json({ user: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
