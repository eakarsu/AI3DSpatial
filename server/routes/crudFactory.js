const express = require('express');
const { authenticate } = require('../middleware/auth');

module.exports = function createCrudRouter(pool, tableName, columns) {
  const router = express.Router();

  // Apply auth to all routes
  router.use(authenticate);

  // GET / — paginated list with optional search + status filter
  router.get('/', async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
      const offset = (page - 1) * limit;
      const search = req.query.search ? `%${req.query.search}%` : null;
      const statusFilter = req.query.status || null;

      let where = [];
      let params = [];
      let idx = 1;

      if (search) {
        where.push(`(name ILIKE $${idx} OR description ILIKE $${idx})`);
        params.push(search);
        idx++;
      }
      if (statusFilter) {
        where.push(`status = $${idx}`);
        params.push(statusFilter);
        idx++;
      }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';

      const countResult = await pool.query(
        `SELECT COUNT(*) FROM ${tableName} ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].count);

      const dataResult = await pool.query(
        `SELECT * FROM ${tableName} ${whereClause} ORDER BY created_at DESC LIMIT $${idx} OFFSET $${idx + 1}`,
        [...params, limit, offset]
      );

      res.json({
        data: dataResult.rows,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /:id
  router.get('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id || id < 1) return res.status(400).json({ error: 'Invalid id' });
      const result = await pool.query(`SELECT * FROM ${tableName} WHERE id = $1`, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // POST /
  router.post('/', async (req, res) => {
    try {
      // Require at least a name
      if (!req.body.name || typeof req.body.name !== 'string' || !req.body.name.trim()) {
        return res.status(400).json({ error: 'name is required' });
      }
      if (req.body.name.length > 255) {
        return res.status(400).json({ error: 'name must be 255 characters or fewer' });
      }

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

  // PUT /:id
  router.put('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id || id < 1) return res.status(400).json({ error: 'Invalid id' });

      if (req.body.name !== undefined) {
        if (typeof req.body.name !== 'string' || !req.body.name.trim()) {
          return res.status(400).json({ error: 'name must be a non-empty string' });
        }
        if (req.body.name.length > 255) {
          return res.status(400).json({ error: 'name must be 255 characters or fewer' });
        }
      }

      const allCols = [...columns, 'ai_generated', 'ai_prompt', 'ai_response'];
      const cols = allCols.filter(c => req.body[c] !== undefined);
      if (cols.length === 0) return res.status(400).json({ error: 'No valid fields to update' });

      const vals = cols.map(c => req.body[c]);
      vals.push(id);
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

  // DELETE /:id
  router.delete('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id || id < 1) return res.status(400).json({ error: 'Invalid id' });
      const result = await pool.query(`DELETE FROM ${tableName} WHERE id = $1 RETURNING *`, [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Not found' });
      res.json({ message: 'Deleted successfully', item: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
