const express = require('express');
const { authenticate } = require('../middleware/auth');

const VALID_TYPES = [
  'models3d', 'ar_scenes', 'vr_environments', 'textures', 'animations',
  'point_clouds', 'mesh_optimization', 'spatial_mapping', 'object_detection',
  'scene_reconstruction', 'materials', 'asset_library', 'holographic',
  'spatial_audio', 'scene_generator', 'digital_twins',
];

module.exports = (pool) => {
  const router = express.Router();

  router.use(authenticate);

  // POST /api/links — create a link between two assets
  router.post('/', async (req, res) => {
    try {
      const { source_type, source_id, target_type, target_id, relationship } = req.body;

      if (!source_type || !VALID_TYPES.includes(source_type)) {
        return res.status(400).json({ error: `source_type must be one of: ${VALID_TYPES.join(', ')}` });
      }
      if (!target_type || !VALID_TYPES.includes(target_type)) {
        return res.status(400).json({ error: `target_type must be one of: ${VALID_TYPES.join(', ')}` });
      }
      if (!source_id || isNaN(parseInt(source_id))) return res.status(400).json({ error: 'source_id must be a number' });
      if (!target_id || isNaN(parseInt(target_id))) return res.status(400).json({ error: 'target_id must be a number' });

      const result = await pool.query(
        `INSERT INTO asset_links (source_type, source_id, target_type, target_id, relationship)
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (source_type, source_id, target_type, target_id) DO UPDATE SET relationship = EXCLUDED.relationship
         RETURNING *`,
        [source_type, parseInt(source_id), target_type, parseInt(target_id), relationship || 'uses']
      );
      res.status(201).json(result.rows[0]);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/links — get links for a source asset
  router.get('/', async (req, res) => {
    try {
      const { source_type, source_id, target_type } = req.query;

      let where = [];
      let params = [];
      let idx = 1;

      if (source_type) { where.push(`source_type = $${idx++}`); params.push(source_type); }
      if (source_id) { where.push(`source_id = $${idx++}`); params.push(parseInt(source_id)); }
      if (target_type) { where.push(`target_type = $${idx++}`); params.push(target_type); }

      const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
      const result = await pool.query(
        `SELECT * FROM asset_links ${whereClause} ORDER BY created_at DESC`,
        params
      );
      res.json(result.rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // DELETE /api/links/:id
  router.delete('/:id', async (req, res) => {
    try {
      const id = parseInt(req.params.id);
      if (!id) return res.status(400).json({ error: 'Invalid id' });
      const result = await pool.query('DELETE FROM asset_links WHERE id = $1 RETURNING *', [id]);
      if (result.rows.length === 0) return res.status(404).json({ error: 'Link not found' });
      res.json({ message: 'Link removed', link: result.rows[0] });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
