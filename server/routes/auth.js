const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

module.exports = (pool) => {
  const router = express.Router();

  // Login
  router.post('/login', async (req, res) => {
    try {
      const { email, password } = req.body;
      const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
      if (result.rows.length === 0) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const user = result.rows[0];
      const valid = await bcrypt.compare(password, user.password);
      if (!valid) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user: { id: user.id, email: user.email, name: user.name } });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Register
  router.post('/register', async (req, res) => {
    try {
      const { email, password, name } = req.body;
      const hashed = await bcrypt.hash(password, 10);
      const result = await pool.query(
        'INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, email, name',
        [email, hashed, name]
      );
      const user = result.rows[0];
      const token = jwt.sign({ id: user.id, email: user.email, name: user.name }, process.env.JWT_SECRET, { expiresIn: '24h' });
      res.json({ token, user });
    } catch (err) {
      if (err.code === '23505') {
        return res.status(400).json({ error: 'Email already exists' });
      }
      res.status(500).json({ error: err.message });
    }
  });

  // Get current user
  router.get('/me', async (req, res) => {
    try {
      const token = req.headers.authorization?.split(' ')[1];
      if (!token) return res.status(401).json({ error: 'No token' });
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      res.json({ user: decoded });
    } catch (err) {
      res.status(401).json({ error: 'Invalid token' });
    }
  });

  return router;
};
