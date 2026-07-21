'use strict';
const express = require('express');
const authenticate = require('../middleware/auth');
const { createConversionManifest, verifyConversionOutput } = require('../domain/conversionPolicy');

module.exports = (pool) => {
  const router = express.Router();
  const authorize = (...allowed) => (req, res, next) => {
    req.tenantId = req.user?.tenantId || req.user?.tenant_id;
    if (!req.tenantId) return res.status(403).json({ error: 'Tenant claim required' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient role' });
    next();
  };
  router.use(authenticate);
  router.get('/', authorize('artist', 'reviewer', 'admin'), async (req, res) => {
    const result = await pool.query('SELECT * FROM asset_conversion_workflows WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100', [req.tenantId]);
    res.json(result.rows);
  });
  router.post('/', authorize('artist', 'admin'), async (req, res) => {
    const key = req.get('Idempotency-Key');
    if (!key || key.length > 128) return res.status(400).json({ error: 'Valid Idempotency-Key required' });
    const decision = createConversionManifest(req.body || {});
    const status = decision.valid ? 'validated' : 'failed';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const prior = await client.query('SELECT * FROM asset_conversion_workflows WHERE tenant_id=$1 AND idempotency_key=$2 FOR UPDATE', [req.tenantId, key]);
      if (prior.rows[0]) { await client.query('COMMIT'); return res.json(prior.rows[0]); }
      const result = await client.query(
        `INSERT INTO asset_conversion_workflows
         (tenant_id,idempotency_key,status,input,manifest,failure_code,created_by)
         VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
        [req.tenantId, key, status, req.body, decision, decision.valid ? null : 'asset_validation_failed', String(req.user.id)]
      );
      await client.query('INSERT INTO asset_conversion_audit (workflow_id,tenant_id,actor_id,action,details) VALUES ($1,$2,$3,$4,$5)', [result.rows[0].id, req.tenantId, String(req.user.id), status, { violations: decision.violations }]);
      await client.query('COMMIT');
      res.status(201).json(result.rows[0]);
    } catch (_) {
      await client.query('ROLLBACK');
      res.status(500).json({ error: 'Conversion workflow persistence failed', code: 'workflow_persistence_failed' });
    } finally { client.release(); }
  });
  router.post('/:id/submit', authorize('artist', 'admin'), async (req, res) => {
    const result = await pool.query(`UPDATE asset_conversion_workflows SET status='pending_approval',updated_at=NOW() WHERE id=$1 AND tenant_id=$2 AND status='validated' RETURNING *`, [req.params.id, req.tenantId]);
    if (!result.rows[0]) return res.status(409).json({ error: 'Only validated manifests can be submitted' });
    await pool.query('INSERT INTO asset_conversion_audit (workflow_id,tenant_id,actor_id,action) VALUES ($1,$2,$3,$4)', [req.params.id, req.tenantId, String(req.user.id), 'submitted']);
    res.json(result.rows[0]);
  });
  router.post('/:id/decision', authorize('reviewer', 'admin'), async (req, res) => {
    if (!['approve','reject'].includes(req.body?.decision) || !String(req.body?.reason || '').trim()) return res.status(400).json({ error: 'decision and reason required' });
    const status = req.body.decision === 'approve' ? 'approved_for_worker' : 'rejected';
    const result = await pool.query(`UPDATE asset_conversion_workflows SET status=$1,approved_by=$2,approval_reason=$3,updated_at=NOW() WHERE id=$4 AND tenant_id=$5 AND status='pending_approval' AND created_by<>$2 RETURNING *`, [status, String(req.user.id), req.body.reason.trim(), req.params.id, req.tenantId]);
    if (!result.rows[0]) return res.status(409).json({ error: 'Pending workflow and independent reviewer required' });
    await pool.query('INSERT INTO asset_conversion_audit (workflow_id,tenant_id,actor_id,action,details) VALUES ($1,$2,$3,$4,$5)', [req.params.id, req.tenantId, String(req.user.id), status, { reason: req.body.reason }]);
    res.json(result.rows[0]);
  });
  router.post('/:id/verify-output', authorize('reviewer', 'admin'), async (req, res) => {
    const assessment = verifyConversionOutput(req.body || {});
    const status = assessment.valid ? 'verified' : 'validation_failed';
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const workflow = await client.query("SELECT * FROM asset_conversion_workflows WHERE id=$1 AND tenant_id=$2 AND status='approved_for_worker' FOR UPDATE", [req.params.id, req.tenantId]);
      if (!workflow.rows[0]) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Approved worker manifest required' }); }
      const evidence = await client.query(`INSERT INTO asset_conversion_validation(workflow_id,tenant_id,status,evidence,recorded_by) VALUES($1,$2,$3,$4,$5) ON CONFLICT(workflow_id) DO NOTHING RETURNING *`, [req.params.id, req.tenantId, status, assessment, String(req.user.id)]);
      if (!evidence.rows[0]) { await client.query('ROLLBACK'); return res.status(409).json({ error: 'Validation already recorded' }); }
      await client.query('UPDATE asset_conversion_workflows SET status=$1,failure_code=$2,updated_at=NOW() WHERE id=$3', [status, assessment.valid ? null : 'output_fidelity_failed', req.params.id]);
      await client.query('INSERT INTO asset_conversion_audit(workflow_id,tenant_id,actor_id,action,details) VALUES($1,$2,$3,$4,$5)', [req.params.id, req.tenantId, String(req.user.id), status, { violations: assessment.violations }]);
      await client.query('COMMIT'); res.status(201).json(evidence.rows[0]);
    } catch (_) { await client.query('ROLLBACK'); res.status(500).json({ error: 'Output validation persistence failed', code: 'validation_persistence_failed' }); }
    finally { client.release(); }
  });
  return router;
};
