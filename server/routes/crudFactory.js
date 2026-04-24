const express = require('express');

module.exports = function createCrudRouter(pool, tableName, columns) {
  const router = express.Router();

  // Get all
  router.get('/', async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} ORDER BY created_at DESC`);
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Get by ID
  router.get('/:id', async (req, res) => {
    try {
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Create
  router.post('/', async (req, res) => {
    try {
      const cols = columns.filter(c => req.body[c] !== undefined);
      const vals = cols.map(c => req.body[c]);
      if (req.body.ai_generated !== undefined) { cols.push('ai_generated'); vals.push(req.body.ai_generated); }
      if (req.body.ai_prompt !== undefined) { cols.push('ai_prompt'); vals.push(req.body.ai_prompt); }
      if (req.body.ai_response !== undefined) { cols.push('ai_response'); vals.push(req.body.ai_response); }
      const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
      const result = await pool.query(
        `INSERT INTO ${tableName} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
        vals
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Update
  router.put('/:id', async (req, res) => {
    try {
      const allCols = [...columns, 'ai_generated', 'ai_prompt', 'ai_response'];
      const cols = allCols.filter(c => req.body[c] !== undefined);
      const vals = cols.map(c => req.body[c]);
      vals.push(req.params.id);
      const sets = cols.map((c, i) => `${c} = $${i + 1}`).join(', ');
      const result = await pool.query(
        `UPDATE ${tableName} SET ${sets}, updated_at = CURRENT_TIMESTAMP WHERE id = $${vals.length} RETURNING *`,
        vals
      );
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // Delete
  router.delete('/:id', async (req, res) => {
    try {
      const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *`, [req.params.id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted successfully', item: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
