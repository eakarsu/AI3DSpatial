'use strict';

const INPUT_FORMATS = new Set(['gltf', 'glb', 'obj', 'fbx', 'usdz']);
const OUTPUT_FORMATS = new Set(['gltf', 'glb', 'usdz']);

function createConversionManifest(input) {
  const violations = [];
  const asset = input.asset || {};
  const geometry = input.geometry || {};
  const target = input.target || {};
  const inputFormat = String(asset.format || '').toLowerCase();
  const outputFormat = String(target.format || '').toLowerCase();
  if (!/^[A-Za-z0-9/_-]{3,180}$/.test(String(input.tenantAssetKey || ''))) violations.push('safe_tenant_asset_key_required');
  if (!input.sourceChecksum || !/^[a-f0-9]{64}$/i.test(input.sourceChecksum)) violations.push('sha256_provenance_required');
  if (!INPUT_FORMATS.has(inputFormat)) violations.push('unsupported_input_format');
  if (!OUTPUT_FORMATS.has(outputFormat)) violations.push('unsupported_output_format');
  if (!Number.isInteger(Number(asset.bytes)) || Number(asset.bytes) < 1 || Number(asset.bytes) > 500 * 1024 * 1024) violations.push('asset_size_out_of_bounds');
  if (!Number.isInteger(Number(geometry.vertices)) || Number(geometry.vertices) < 3 || Number(geometry.vertices) > 10_000_000) violations.push('vertex_count_out_of_bounds');
  if (!Number.isFinite(Number(geometry.scaleMeters)) || Number(geometry.scaleMeters) <= 0 || Number(geometry.scaleMeters) > 1000) violations.push('scale_out_of_bounds');
  if (!['y-up', 'z-up'].includes(geometry.axis)) violations.push('axis_convention_required');
  if (!['ar', 'web', 'desktop'].includes(target.platform)) violations.push('unsupported_target_platform');
  if (Number(input.computeBudgetSeconds) <= 0 || Number(input.computeBudgetSeconds) > 3600) violations.push('compute_budget_out_of_bounds');

  return {
    valid: violations.length === 0,
    violations,
    manifest: violations.length ? null : {
      manifestVersion: 1,
      sourceChecksum: input.sourceChecksum.toLowerCase(),
      inputFormat,
      outputFormat,
      targetPlatform: target.platform,
      preserveScaleMeters: Number(geometry.scaleMeters),
      axis: geometry.axis,
      texturePolicy: target.texturePolicy || 'preserve',
      computeBudgetSeconds: Number(input.computeBudgetSeconds),
      outputKey: `${input.tenantAssetKey}.${outputFormat}`,
    },
  };
}

function verifyConversionOutput(input) {
  const violations = [];
  if (!input.outputChecksum || !/^[a-f0-9]{64}$/i.test(input.outputChecksum)) violations.push('output_provenance_required');
  if (!Number.isFinite(Number(input.scaleErrorPercent)) || Number(input.scaleErrorPercent) < 0 || Number(input.scaleErrorPercent) > 1) violations.push('scale_fidelity_failed');
  if (!Number.isFinite(Number(input.geometrySimilarity)) || Number(input.geometrySimilarity) < 0.98 || Number(input.geometrySimilarity) > 1) violations.push('geometry_fidelity_failed');
  if (!input.referenceAssetId || !input.rendererVersion || !input.textureEvidenceId) violations.push('reference_render_evidence_required');
  return { valid: violations.length === 0, violations, evidence: violations.length ? null : { outputChecksum: input.outputChecksum.toLowerCase(), scaleErrorPercent: Number(input.scaleErrorPercent), geometrySimilarity: Number(input.geometrySimilarity), referenceAssetId: input.referenceAssetId, rendererVersion: input.rendererVersion, textureEvidenceId: input.textureEvidenceId } };
}

module.exports = { createConversionManifest, verifyConversionOutput };
