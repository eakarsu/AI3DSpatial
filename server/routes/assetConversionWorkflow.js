'use strict';
const express = require('express');
const authenticate = require('../middleware/auth');
const { createConversionManifest, verifyConversionOutput } = require('../domain/conversionPolicy');

module.exports = (pool) => {
  const router = express.Router();
  for(const method of ['get','post','put','delete']){const original=router[method].bind(router);router[method]=(path,...handlers)=>original(path,...handlers.map(handler=>handler.constructor?.name==='AsyncFunction'?((req,res,next)=>Promise.resolve(handler(req,res,next)).catch(next)):handler));}

  const authorize = (...allowed) => (req, res, next) => {
    req.tenantId = req.user?.tenantId || req.user?.tenant_id;
    if (!req.tenantId) return res.status(403).json({ error: 'Tenant claim required' });
    if (!allowed.includes(req.user.role)) return res.status(403).json({ error: 'Insufficient role' });
    next();
  };
  router.use(authenticate);
  router.get('/', authorize('artist', 'reviewer', 'admin'), async (req, res) => {
    const result = await pool.query('SELECT * FROM asset_conversion_workflows WHERE tenant_id=$1 ORDER BY created_at DESC LIMIT 100', [req.tenantId]);
    res.json({data:result.rows.map(row=>decorate(row,req.user.id)),capabilities:{canCreate:['artist','admin'].includes(req.user.role),canEdit:['artist','admin'].includes(req.user.role)}});
  });
  const draftInput=body=>{const keys=['name','source_format','target_format','target_platform','performance_budget','notes'];if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(key=>!keys.includes(key)))throw Object.assign(Error('Only native draft planning fields are supported.'),{status:400});const value={};for(const key of keys){if(typeof body[key]!=='string'||body[key].length>4000)throw Object.assign(Error('Fill all six draft planning fields with text.'),{status:400});value[key]=body[key].trim();}if(!value.name||!value.source_format||!value.target_format)throw Object.assign(Error('Name, source format and target format are required.'),{status:400});return value;};
  const decorate=(row,actor)=>({...row,canEdit:row.status==='draft'&&row.created_by===String(actor),canDelete:row.status==='draft'&&row.created_by===String(actor),is_demo:Boolean(row.input?.synthetic_example),demo_label:row.input?.synthetic_example?'Fictional training plan':null,retainedReason:row.status!=='draft'?'Native validated, approval and worker evidence is retained.':null});
  router.get('/:id',authorize('artist','reviewer','admin'),async(req,res)=>{const row=(await pool.query('SELECT * FROM asset_conversion_workflows WHERE id=$1 AND tenant_id=$2',[req.params.id,req.tenantId])).rows[0];if(!row)return res.status(404).json({error:'Conversion plan not found'});res.json({item:decorate(row,req.user.id)});});
  router.post('/drafts',authorize('artist','admin'),async(req,res)=>{const input=draftInput(req.body);const key=req.get('Idempotency-Key');if(!key||key.length>128)return res.status(400).json({error:'A valid Idempotency-Key is required.'});const row=(await pool.query("INSERT INTO asset_conversion_workflows(tenant_id,idempotency_key,status,input,manifest,created_by) VALUES($1,$2,'draft',$3,$4,$5) ON CONFLICT(tenant_id,idempotency_key) DO NOTHING RETURNING *",[req.tenantId,key,input,{draft:true,valid:false,notice:'Planning only. Actual asset input, validation and independent approval are required before any worker execution.'},String(req.user.id)])).rows[0];if(!row)return res.status(409).json({error:'This draft request has already been saved.'});res.status(201).json({item:decorate(row,req.user.id)});});
  router.put('/:id/draft',authorize('artist','admin'),async(req,res)=>{const input=draftInput(req.body),row=(await pool.query("UPDATE asset_conversion_workflows SET input=$1::jsonb || jsonb_build_object('synthetic_example',COALESCE(input->'synthetic_example','false'::jsonb)),updated_at=NOW() WHERE id=$2 AND tenant_id=$3 AND created_by=$4 AND status='draft' RETURNING *",[input,req.params.id,req.tenantId,String(req.user.id)])).rows[0];if(!row)return res.status(404).json({error:'Owned draft not found. Validated and approval evidence cannot be edited here.'});res.json({item:decorate(row,req.user.id)});});
  router.delete('/:id/draft',authorize('artist','admin'),async(req,res)=>{const row=(await pool.query("DELETE FROM asset_conversion_workflows w WHERE id=$1 AND tenant_id=$2 AND created_by=$3 AND status='draft' AND NOT EXISTS(SELECT 1 FROM asset_conversion_audit a WHERE a.workflow_id=w.id) AND NOT EXISTS(SELECT 1 FROM asset_conversion_validation v WHERE v.workflow_id=w.id) RETURNING id",[req.params.id,req.tenantId,String(req.user.id)])).rows[0];if(!row)return res.status(404).json({error:'Owned draft not found or native evidence requires retention.'});res.json({deleted:true});});

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
  router.use((error,req,res,next)=>{if(res.headersSent)return next(error);res.status(error.status||503).json({error:error.status?error.message:'Native conversion data could not be loaded or saved. Retry.'});});
  return router;
};
