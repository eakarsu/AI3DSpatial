'use strict';
const test = require('node:test');
const assert = require('node:assert/strict');
const { createConversionManifest, verifyConversionOutput } = require('../domain/conversionPolicy');
const { validateRuntime } = require('../config/runtime');
const valid = { sourceChecksum: 'a'.repeat(64), tenantAssetKey: 'assets/chair-v4', asset: { format: 'obj', bytes: 2048 }, geometry: { vertices: 1200, scaleMeters: 1.2, axis: 'y-up' }, target: { format: 'glb', platform: 'ar' }, computeBudgetSeconds: 300 };
test('creates a reproducible bounded conversion manifest', () => {
  const result = createConversionManifest(valid);
  assert.equal(result.valid, true);
  assert.equal(result.manifest.outputKey, 'assets/chair-v4.glb');
  assert.equal(result.manifest.sourceChecksum, 'a'.repeat(64));
});
test('rejects oversized and unprovenanced assets', () => {
  const result = createConversionManifest({ ...valid, sourceChecksum: 'no', asset: { format: 'exe', bytes: 700_000_000 } });
  assert.equal(result.valid, false);
  assert.equal(result.manifest, null);
  assert.ok(result.violations.includes('sha256_provenance_required'));
  assert.ok(result.violations.includes('asset_size_out_of_bounds'));
});
test('runtime rejects missing secrets', () => assert.throws(() => validateRuntime({ DATABASE_URL: 'postgres://db' }), /JWT_SECRET/));
test('runtime quarantines legacy routes and forbids production opt-in', () => {
  assert.equal(validateRuntime({ DATABASE_URL: 'postgres://db', JWT_SECRET: 'x'.repeat(32) }).legacyPrototypeRoutesEnabled, false);
  assert.throws(() => validateRuntime({ NODE_ENV: 'production', DATABASE_URL: 'postgres://db', CLIENT_URL: 'https://app.example', JWT_SECRET: 'x'.repeat(32), ENABLE_LEGACY_PROTOTYPE_ROUTES: 'true' }), /cannot be enabled/);
});
test('requires reference fidelity evidence from the renderer', () => {
  const result = verifyConversionOutput({ outputChecksum: 'e'.repeat(64), scaleErrorPercent: 0.2, geometrySimilarity: 0.99, referenceAssetId: 'gold-chair', rendererVersion: 'renderer:2', textureEvidenceId: 'texture:5' });
  assert.equal(result.valid, true);
  assert.equal(verifyConversionOutput({ outputChecksum: 'e'.repeat(64), scaleErrorPercent: 3, geometrySimilarity: 0.5 }).valid, false);
});
