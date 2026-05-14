const express = require('express');
const https = require('https');
const { authenticate } = require('../middleware/auth');
const { aiRateLimiter } = require('../middleware/rateLimiter');

// SQL injection fix: whitelist of allowed tables
const ALLOWED_TABLES = [
  'models3d',
  'ar_scenes',
  'vr_environments',
  'textures',
  'animations',
  'point_clouds',
  'digital_twins',
  'mesh_optimization',
  'spatial_mapping',
  'object_detection',
  'scene_reconstruction',
  'materials',
  'asset_library',
  'holographic',
  'spatial_audio',
  'scene_generator',
];

// Robust JSON parser that handles markdown fences and leading text
function parseAIJson(text) {
  if (!text) return null;
  try { return JSON.parse(text); } catch (e) {}
  const stripped = text.replace(/```(?:json)?\n?/g, '').replace(/```/g, '').trim();
  try { return JSON.parse(stripped); } catch (e) {}
  const start = text.indexOf('{'); const end = text.lastIndexOf('}');
  if (start !== -1 && end !== -1) {
    try { return JSON.parse(text.slice(start, end + 1)); } catch (e) {}
  }
  return null;
}

// Feature-specific endpoints that save to DB tables
const FEATURE_TABLE_MAP = {
  '/generate-3d-model': {
    feature: '3D model generation',
    table: 'models3d',
    systemPrompt: `You are an expert AI for 3D model generation. Respond ONLY with valid JSON matching this schema:
{
  "name": "string",
  "description": "string",
  "format": "FBX|OBJ|GLTF|USD|STL",
  "vertices": number,
  "polygons": number,
  "file_size": "string (e.g. 25 MB)",
  "status": "ready|processing",
  "technical_specs": {
    "uv_channels": number,
    "material_slots": number,
    "rigged": boolean,
    "lod_levels": number,
    "coordinate_system": "string"
  },
  "optimization_notes": ["string"],
  "recommended_uses": ["string"],
  "export_tips": ["string"],
  "summary": "string"
}`,
  },
  '/generate-ar-scene': {
    feature: 'AR scene creation',
    table: 'ar_scenes',
    systemPrompt: `You are an expert AR developer. Respond ONLY with valid JSON matching this schema:
{
  "name": "string",
  "description": "string",
  "scene_type": "string",
  "target_platform": "iOS|Android|iOS/Android",
  "tracking_type": "string",
  "objects_count": number,
  "status": "draft|published",
  "technical_breakdown": {
    "anchoring_strategy": "string",
    "occlusion_method": "string",
    "lighting_estimation": boolean,
    "physics_enabled": boolean,
    "recommended_sdk": "string"
  },
  "interaction_design": ["string"],
  "performance_targets": { "target_fps": number, "max_draw_calls": number },
  "summary": "string"
}`,
  },
  '/generate-vr-environment': {
    feature: 'VR environment design',
    table: 'vr_environments',
    systemPrompt: `You are an expert VR environment designer. Respond ONLY with valid JSON matching this schema:
{
  "name": "string",
  "description": "string",
  "environment_type": "string",
  "platform": "string",
  "resolution": "string",
  "fps_target": number,
  "interactive_elements": number,
  "status": "draft|published",
  "design_details": {
    "skybox_type": "string",
    "lighting_setup": "string",
    "audio_design": "string",
    "locomotion_type": "string",
    "comfort_rating": "Comfortable|Moderate|Intense"
  },
  "asset_list": [{ "type": "string", "count": number, "poly_budget": number }],
  "performance_budget": { "draw_calls": number, "vram_mb": number, "gpu_tier": "string" },
  "summary": "string"
}`,
  },
  '/generate-texture': {
    feature: 'texture generation and PBR materials',
    table: 'textures',
    systemPrompt: `You are an expert texture artist and PBR material specialist. Respond ONLY with valid JSON matching this schema:
{
  "name": "string",
  "description": "string",
  "texture_type": "string",
  "resolution": "512x512|1024x1024|2048x2048|4096x4096",
  "format": "PNG|JPG|EXR|TIFF",
  "seamless": boolean,
  "pbr_enabled": boolean,
  "status": "ready",
  "pbr_channels": {
    "albedo": "string",
    "roughness_range": [number, number],
    "metallic": number,
    "normal_strength": number,
    "ao_intensity": number,
    "emissive": boolean
  },
  "tiling_info": { "scale": number, "rotation": number },
  "generation_technique": "string",
  "use_cases": ["string"],
  "summary": "string"
}`,
  },
  '/generate-animation': {
    feature: '3D animation and motion',
    table: 'animations',
    systemPrompt: `You are an expert 3D animator. Respond ONLY with valid JSON matching this schema:
{
  "name": "string",
  "description": "string",
  "animation_type": "string",
  "duration_seconds": number,
  "frame_rate": number,
  "keyframes": number,
  "loop_enabled": boolean,
  "status": "ready",
  "motion_details": {
    "interpolation": "Linear|Bezier|Step",
    "root_motion": boolean,
    "ik_enabled": boolean,
    "blend_shapes": number
  },
  "keyframe_breakdown": [{ "time_s": number, "description": "string" }],
  "export_compatibility": ["string"],
  "summary": "string"
}`,
  },
  '/analyze-point-cloud': {
    feature: 'point cloud processing and analysis',
    table: 'point_clouds',
    systemPrompt: `You are an expert in LiDAR and point cloud analysis. Respond ONLY with valid JSON matching this schema:
{
  "name": "string",
  "description": "string",
  "point_count": number,
  "density": "Low|Medium|High|Ultra High",
  "source_type": "string",
  "coordinate_system": "string",
  "file_size": "string",
  "status": "processed",
  "analysis_results": {
    "noise_level": "Low|Medium|High",
    "coverage_completeness": number,
    "detected_features": ["string"],
    "anomalies": ["string"],
    "recommended_filters": ["string"]
  },
  "segmentation": [{ "class": "string", "point_count": number, "confidence": number }],
  "processing_pipeline": ["string"],
  "summary": "string"
}`,
  },
  '/generate-digital-twin': {
    feature: 'digital twin creation and IoT integration',
    table: 'digital_twins',
    systemPrompt: `You are an expert in digital twin architecture and IoT. Respond ONLY with valid JSON matching this schema:
{
  "name": "string",
  "description": "string",
  "twin_type": "string",
  "source_entity": "string",
  "sync_frequency": "string",
  "sensors_count": number,
  "data_points": number,
  "status": "active",
  "architecture": {
    "data_protocol": "string",
    "edge_processing": boolean,
    "ml_predictions": boolean,
    "anomaly_detection": boolean,
    "dashboard_type": "string"
  },
  "sensor_breakdown": [{ "sensor_type": "string", "count": number, "data_rate_hz": number }],
  "integration_points": ["string"],
  "kpi_tracking": ["string"],
  "summary": "string"
}`,
  },
};

// readOnly-but-now-persisted feature endpoints
const PERSIST_FEATURE_MAP = {
  '/optimize-mesh': {
    feature: 'mesh optimization and polygon reduction',
    table: 'mesh_optimization',
    systemPrompt: `You are an expert 3D mesh optimization engineer. Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "original_polygons": number,
  "optimized_polygons": number,
  "reduction_percent": number,
  "quality_score": number,
  "algorithm": "string",
  "status": "completed",
  "optimization_steps": [{ "step": number, "action": "string", "improvement": "string" }],
  "quality_metrics": { "normal_deviation_deg": number, "uv_distortion": number, "silhouette_preserved": boolean },
  "platform_recommendations": { "mobile": number, "vr": number, "web": number },
  "summary": "string"
}`,
  },
  '/generate-spatial-map': {
    feature: 'spatial mapping and environment scanning',
    table: 'spatial_mapping',
    systemPrompt: `You are an expert in spatial mapping. Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "area_sqm": number,
  "resolution": "string",
  "mapping_type": "Indoor|Outdoor",
  "sensor_type": "string",
  "accuracy": "string",
  "status": "mapped",
  "scan_details": {
    "scan_duration_min": number,
    "overlap_percent": number,
    "point_density_per_sqm": number,
    "coordinate_system": "string"
  },
  "features_detected": ["string"],
  "ar_readiness_score": number,
  "summary": "string"
}`,
  },
  '/detect-objects': {
    feature: '3D object detection and recognition',
    table: 'object_detection',
    systemPrompt: `You are an expert in 3D object detection. Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "detection_model": "string",
  "objects_detected": number,
  "confidence_avg": number,
  "processing_time": "string",
  "input_type": "string",
  "status": "completed",
  "detections": [{ "class": "string", "count": number, "avg_confidence": number, "bounding_volume": "string" }],
  "model_metrics": { "precision": number, "recall": number, "f1_score": number },
  "post_processing": ["string"],
  "summary": "string"
}`,
  },
  '/reconstruct-scene': {
    feature: 'scene reconstruction from images',
    table: 'scene_reconstruction',
    systemPrompt: `You are an expert in photogrammetry and scene reconstruction. Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "reconstruction_type": "string",
  "source_images": number,
  "mesh_quality": "Low|Medium|High|Ultra",
  "texture_quality": "Low|Medium|High|Ultra",
  "completeness_percent": number,
  "status": "completed",
  "reconstruction_pipeline": ["string"],
  "quality_report": {
    "reprojection_error_px": number,
    "gcp_accuracy_mm": number,
    "hole_filling_applied": boolean
  },
  "output_formats": ["string"],
  "summary": "string"
}`,
  },
  '/generate-material': {
    feature: 'material and shader creation',
    table: 'materials',
    systemPrompt: `You are an expert material artist. Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "material_type": "string",
  "shader_model": "string",
  "render_engine": "string",
  "pbr_workflow": "Metallic|Specular|Custom",
  "transparency": boolean,
  "status": "ready",
  "shader_parameters": { "roughness": number, "metallic": number, "ior": number, "subsurface": number },
  "texture_maps": ["string"],
  "engine_compatibility": ["string"],
  "node_graph_description": "string",
  "summary": "string"
}`,
  },
  '/generate-asset': {
    feature: '3D asset creation',
    table: 'asset_library',
    systemPrompt: `You are an expert 3D asset creator. Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "category": "string",
  "format": "FBX|OBJ|GLTF|USD",
  "poly_count": number,
  "file_size": "string",
  "license_type": "Royalty Free|CC-BY|CC0|Commercial",
  "tags": "string (comma-separated)",
  "status": "available",
  "asset_details": {
    "lod_levels": number,
    "has_rig": boolean,
    "has_animations": boolean,
    "texture_resolution": "string",
    "material_count": number
  },
  "engine_ready": ["string"],
  "summary": "string"
}`,
  },
  '/generate-hologram': {
    feature: 'holographic content creation',
    table: 'holographic',
    systemPrompt: `You are an expert holographic display engineer. Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "hologram_type": "Volumetric|Pepper Ghost",
  "display_tech": "string",
  "resolution": "string",
  "depth_layers": number,
  "interactive": boolean,
  "status": "ready",
  "display_specs": {
    "viewing_angle_deg": number,
    "brightness_nits": number,
    "refresh_rate_hz": number,
    "color_gamut": "string"
  },
  "content_requirements": ["string"],
  "interaction_methods": ["string"],
  "summary": "string"
}`,
  },
  '/generate-spatial-audio': {
    feature: 'spatial audio design',
    table: 'spatial_audio',
    systemPrompt: `You are an expert spatial audio designer. Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "audio_format": "Ambisonics|Object-Based|Binaural",
  "channels": number,
  "sample_rate": number,
  "spatialization": "string",
  "hrtf_enabled": boolean,
  "duration_seconds": number,
  "status": "ready",
  "audio_design": {
    "reverb_type": "string",
    "room_size": "string",
    "occlusion_enabled": boolean,
    "doppler_enabled": boolean
  },
  "sound_sources": [{ "type": "string", "position": "string", "radius_m": number }],
  "integration_notes": ["string"],
  "summary": "string"
}`,
  },
  '/generate-scene': {
    feature: 'AI 3D scene generation',
    table: 'scene_generator',
    systemPrompt: `You are an expert AI 3D scene composer. Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "scene_type": "string",
  "generation_model": "string",
  "objects_count": number,
  "lighting_type": "string",
  "render_engine": "string",
  "output_format": "GLTF|USD|FBX|OBJ",
  "resolution": "string",
  "poly_budget": number,
  "generation_time": "string",
  "quality_score": number,
  "status": "completed",
  "scene_graph": {
    "camera": { "type": "string", "fov_deg": number, "position": "string" },
    "lighting": [{ "type": "string", "intensity": number, "color": "string" }],
    "objects": [{ "name": "string", "type": "string", "poly_count": number, "position": "string", "material": "string" }]
  },
  "render_settings": { "samples": number, "denoising": boolean, "motion_blur": boolean },
  "summary": "string"
}`,
  },
};

function callOpenRouter(systemPrompt, userMessage, model) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      model: model || process.env.OPENROUTER_MODEL || 'anthropic/claude-3-5-sonnet-20241022',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      max_tokens: 3000,
      temperature: 0.7,
    });

    const options = {
      hostname: 'openrouter.ai',
      path: '/api/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': process.env.CLIENT_URL || 'http://localhost:3000',
        'X-Title': 'AI 3D Spatial Platform',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          if (parsed.error) {
            reject(new Error(parsed.error.message || 'OpenRouter API error'));
          } else {
            resolve(parsed);
          }
        } catch (e) {
          reject(new Error('Failed to parse OpenRouter response'));
        }
      });
    });

    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

// Persist AI result to ai_results table
async function persistAiResult(pool, { userId, feature, endpoint, prompt, aiContent, parsedJson, model, usage, sourceTable, sourceId }) {
  try {
    await pool.query(
      `INSERT INTO ai_results (user_id, feature, endpoint, prompt, ai_response, parsed_json, model, prompt_tokens, completion_tokens, total_tokens, source_table, source_id)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
      [
        userId || null,
        feature,
        endpoint,
        prompt,
        aiContent,
        parsedJson ? JSON.stringify(parsedJson) : null,
        model || null,
        usage?.prompt_tokens || null,
        usage?.completion_tokens || null,
        usage?.total_tokens || null,
        sourceTable || null,
        sourceId || null,
      ]
    );
  } catch (err) {
    console.warn('Failed to persist ai_result:', err.message);
  }
}

module.exports = (pool) => {
  const router = express.Router();

  // Apply auth + rate limiting to all AI routes
  router.use(authenticate, aiRateLimiter);

  // Generic AI generation endpoint
  router.post('/generate', async (req, res) => {
    try {
      const { prompt, feature, table, itemData } = req.body;

      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        return res.status(400).json({ error: 'prompt is required' });
      }

      const systemPrompt = `You are an expert AI assistant for 3D/Spatial computing. You specialize in ${feature || '3D spatial computing'}. Provide detailed, professional technical responses with structured data. Respond with valid JSON when possible.`;

      const result = await callOpenRouter(systemPrompt, prompt);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const parsedJson = parseAIJson(aiContent);

      if (table && itemData) {
        if (!ALLOWED_TABLES.includes(table)) {
          return res.status(400).json({ error: `Invalid table name. Allowed: ${ALLOWED_TABLES.join(', ')}` });
        }
        const columns = Object.keys(itemData);
        const values = Object.values(itemData);
        columns.push('ai_generated', 'ai_prompt', 'ai_response');
        values.push(true, prompt, aiContent);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const dbResult = await pool.query(
          `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`,
          values
        );
        const saved = dbResult.rows[0];
        await persistAiResult(pool, { userId: req.user?.id, feature: feature || 'generic', endpoint: '/api/ai/generate', prompt, aiContent, parsedJson, model: result.model, usage: result.usage, sourceTable: table, sourceId: saved.id });
        return res.json({ success: true, ai_response: aiContent, parsed: parsedJson, model: result.model, usage: result.usage, saved_item: saved });
      }

      await persistAiResult(pool, { userId: req.user?.id, feature: feature || 'generic', endpoint: '/api/ai/generate', prompt, aiContent, parsedJson, model: result.model, usage: result.usage });
      res.json({ success: true, ai_response: aiContent, parsed: parsedJson, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('AI generation error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Feature-specific endpoints that save to proper tables with structured JSON
  Object.entries(FEATURE_TABLE_MAP).forEach(([path, { feature, table, systemPrompt }]) => {
    router.post(path, async (req, res) => {
      try {
        const { prompt, name, description } = req.body;
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
          return res.status(400).json({ error: 'prompt is required' });
        }

        const result = await callOpenRouter(systemPrompt, prompt);
        const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
        const parsedJson = parseAIJson(aiContent);

        // Merge parsed JSON fields with any explicit name/description
        const itemData = parsedJson || {};
        itemData.name = name || itemData.name || `AI Generated - ${feature}`;
        itemData.description = description || itemData.description || prompt.slice(0, 200);
        itemData.ai_generated = true;
        itemData.ai_prompt = prompt;
        itemData.ai_response = aiContent;

        // Only keep columns that exist in the table schema (safe subset)
        const SAFE_IGNORE = ['technical_specs', 'optimization_notes', 'recommended_uses', 'export_tips',
          'technical_breakdown', 'interaction_design', 'performance_targets', 'design_details', 'asset_list',
          'performance_budget', 'pbr_channels', 'tiling_info', 'generation_technique', 'use_cases',
          'motion_details', 'keyframe_breakdown', 'export_compatibility', 'analysis_results', 'segmentation',
          'processing_pipeline', 'architecture', 'sensor_breakdown', 'integration_points', 'kpi_tracking',
          'optimization_steps', 'quality_metrics', 'platform_recommendations', 'scan_details',
          'features_detected', 'ar_readiness_score', 'detections', 'model_metrics', 'post_processing',
          'reconstruction_pipeline', 'quality_report', 'output_formats', 'shader_parameters', 'texture_maps',
          'engine_compatibility', 'node_graph_description', 'asset_details', 'engine_ready', 'display_specs',
          'content_requirements', 'interaction_methods', 'audio_design', 'sound_sources', 'integration_notes',
          'scene_graph', 'render_settings', 'prompt_tokens', 'completion_tokens', 'total_tokens', 'summary'];

        const insertData = Object.fromEntries(
          Object.entries(itemData).filter(([k]) => !SAFE_IGNORE.includes(k))
        );

        let dbResult = null;
        let savedId = null;
        try {
          const cols = Object.keys(insertData);
          const vals = Object.values(insertData);
          const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
          dbResult = await pool.query(
            `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            vals
          );
          savedId = dbResult.rows[0]?.id;
        } catch (dbErr) {
          console.warn(`DB insert to ${table} failed: ${dbErr.message}`);
          // Fallback: insert with minimal fields
          try {
            dbResult = await pool.query(
              `INSERT INTO ${table} (name, description, ai_generated, ai_prompt, ai_response) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
              [itemData.name, itemData.description, true, prompt, aiContent]
            );
            savedId = dbResult.rows[0]?.id;
          } catch (fbErr) {
            console.warn(`Fallback DB insert failed: ${fbErr.message}`);
          }
        }

        await persistAiResult(pool, { userId: req.user?.id, feature, endpoint: `/api/ai${path}`, prompt, aiContent, parsedJson, model: result.model, usage: result.usage, sourceTable: table, sourceId: savedId });

        res.json({
          success: true,
          ai_response: aiContent,
          parsed: parsedJson,
          model: result.model,
          usage: result.usage,
          feature,
          saved_item: dbResult ? dbResult.rows[0] : null,
        });
      } catch (err) {
        console.error(`AI ${feature} error:`, err);
        res.status(500).json({ error: err.message });
      }
    });
  });

  // Previously "readOnly" endpoints — now persist results
  Object.entries(PERSIST_FEATURE_MAP).forEach(([path, { feature, table, systemPrompt }]) => {
    router.post(path, async (req, res) => {
      try {
        const { prompt, name } = req.body;
        if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
          return res.status(400).json({ error: 'prompt is required' });
        }

        const result = await callOpenRouter(systemPrompt, prompt);
        const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
        const parsedJson = parseAIJson(aiContent);

        const itemData = parsedJson || {};
        itemData.name = name || itemData.name || `AI Generated - ${feature}`;
        itemData.description = itemData.description || prompt.slice(0, 200);
        itemData.ai_generated = true;
        itemData.ai_prompt = prompt;
        itemData.ai_response = aiContent;

        const SAFE_IGNORE = ['optimization_steps', 'quality_metrics', 'platform_recommendations',
          'scan_details', 'features_detected', 'ar_readiness_score', 'detections', 'model_metrics',
          'post_processing', 'reconstruction_pipeline', 'quality_report', 'output_formats',
          'shader_parameters', 'texture_maps', 'engine_compatibility', 'node_graph_description',
          'asset_details', 'engine_ready', 'display_specs', 'content_requirements', 'interaction_methods',
          'audio_design', 'sound_sources', 'integration_notes', 'scene_graph', 'render_settings', 'summary'];

        const insertData = Object.fromEntries(
          Object.entries(itemData).filter(([k]) => !SAFE_IGNORE.includes(k))
        );

        let dbResult = null;
        let savedId = null;
        try {
          const cols = Object.keys(insertData);
          const vals = Object.values(insertData);
          const placeholders = vals.map((_, i) => `$${i + 1}`).join(', ');
          dbResult = await pool.query(
            `INSERT INTO ${table} (${cols.join(', ')}) VALUES (${placeholders}) RETURNING *`,
            vals
          );
          savedId = dbResult.rows[0]?.id;
        } catch (dbErr) {
          console.warn(`DB insert to ${table} failed: ${dbErr.message}`);
          try {
            dbResult = await pool.query(
              `INSERT INTO ${table} (name, description, ai_generated, ai_prompt, ai_response) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
              [itemData.name, itemData.description, true, prompt, aiContent]
            );
            savedId = dbResult.rows[0]?.id;
          } catch (fbErr) {
            console.warn(`Fallback insert failed: ${fbErr.message}`);
          }
        }

        await persistAiResult(pool, { userId: req.user?.id, feature, endpoint: `/api/ai${path}`, prompt, aiContent, parsedJson, model: result.model, usage: result.usage, sourceTable: table, sourceId: savedId });

        res.json({
          success: true,
          ai_response: aiContent,
          parsed: parsedJson,
          model: result.model,
          usage: result.usage,
          feature,
          saved_item: dbResult ? dbResult.rows[0] : null,
        });
      } catch (err) {
        console.error(`AI ${feature} error:`, err);
        res.status(500).json({ error: err.message });
      }
    });
  });

  // POST /api/ai/validate-model — 3D model QA validator
  router.post('/validate-model', async (req, res) => {
    try {
      const { model_description, polygon_count, has_uv_maps, material_count, file_format } = req.body;
      if (!model_description || typeof model_description !== 'string') {
        return res.status(400).json({ error: 'model_description is required' });
      }

      const systemPrompt = `You are an expert 3D model quality assurance AI. Respond ONLY with valid JSON:
{
  "overall_score": number (0-100),
  "is_valid": boolean,
  "issues": [{ "type": "non_manifold|missing_uvs|invalid_normals|topology|material|other", "severity": "low|medium|high|critical", "description": "string", "suggestion": "string" }],
  "warnings": ["string"],
  "recommendations": ["string"],
  "production_readiness": "Not Ready|Needs Work|Good|Production Ready",
  "platform_compatibility": { "mobile": boolean, "vr": boolean, "web": boolean, "console": boolean },
  "summary": "string"
}`;

      const userMessage = `Validate this 3D model:
- Description: ${model_description}
- Polygon Count: ${polygon_count || 'Unknown'}
- Has UV Maps: ${has_uv_maps !== undefined ? has_uv_maps : 'Unknown'}
- Material Count: ${material_count || 'Unknown'}
- File Format: ${file_format || 'Unknown'}`;

      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const validationReport = parseAIJson(aiContent) || { summary: aiContent, is_valid: null, overall_score: null, issues: [] };

      await persistAiResult(pool, { userId: req.user?.id, feature: 'validate-model', endpoint: '/api/ai/validate-model', prompt: userMessage, aiContent, parsedJson: validationReport, model: result.model, usage: result.usage });

      res.json({ success: true, validation_report: validationReport, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Model validation error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/optimize-model — model optimization pipeline
  router.post('/optimize-model', async (req, res) => {
    try {
      const { modelId, targetPlatform } = req.body;
      if (!modelId || !targetPlatform) {
        return res.status(400).json({ error: 'modelId and targetPlatform are required' });
      }
      const validPlatforms = ['mobile', 'vr', 'web'];
      if (!validPlatforms.includes(targetPlatform)) {
        return res.status(400).json({ error: `targetPlatform must be one of: ${validPlatforms.join(', ')}` });
      }

      let modelInfo = null;
      try {
        const dbResult = await pool.query('SELECT * FROM models3d WHERE id = $1', [parseInt(modelId)]);
        if (dbResult.rows.length > 0) modelInfo = dbResult.rows[0];
      } catch (dbErr) { /* table may not exist */ }

      const systemPrompt = `You are an expert 3D model optimization AI. Respond ONLY with valid JSON:
{
  "target_platform": "string",
  "polygon_reduction_percent": number,
  "lod_levels_recommended": number,
  "texture_compression": "string",
  "texture_max_resolution": number,
  "optimization_steps": [{ "step": number, "action": "string", "description": "string", "expected_improvement": "string" }],
  "estimated_size_reduction_percent": number,
  "performance_impact": "string",
  "platform_specs": { "max_polys": number, "max_draw_calls": number, "max_texture_size": number, "target_fps": number },
  "summary": "string"
}`;

      const userMessage = `Optimize 3D model for platform:
- Model ID: ${modelId}
- Model Info: ${modelInfo ? JSON.stringify({ name: modelInfo.name, polygons: modelInfo.polygons, format: modelInfo.format }) : 'Not found'}
- Target Platform: ${targetPlatform}`;

      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const optimizationPlan = parseAIJson(aiContent) || { summary: aiContent, target_platform: targetPlatform };

      await persistAiResult(pool, { userId: req.user?.id, feature: 'optimize-model', endpoint: '/api/ai/optimize-model', prompt: userMessage, aiContent, parsedJson: optimizationPlan, model: result.model, usage: result.usage });

      res.json({ success: true, model_id: modelId, target_platform: targetPlatform, optimization_plan: optimizationPlan, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Model optimization error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/generate-lod — LOD generation suggestions
  router.post('/generate-lod', async (req, res) => {
    try {
      const { modelId, polygonCount, targetFrameRate } = req.body;
      if (!modelId || !polygonCount) {
        return res.status(400).json({ error: 'modelId and polygonCount are required' });
      }
      const polyCount = parseInt(polygonCount);
      if (isNaN(polyCount) || polyCount < 1) {
        return res.status(400).json({ error: 'polygonCount must be a positive integer' });
      }

      const systemPrompt = `You are an expert 3D rendering and LOD system AI. Respond ONLY with valid JSON:
{
  "original_polygon_count": number,
  "target_frame_rate": number,
  "lod_levels": [{ "level": number, "name": "string", "polygon_count": number, "reduction_percent": number, "distance_threshold_meters": number, "recommended_for": "string", "screen_size_percent": number }],
  "total_levels": number,
  "memory_savings_estimate_percent": number,
  "implementation_notes": ["string"],
  "summary": "string"
}`;

      const userMessage = `Generate LOD levels for:
- Model ID: ${modelId}
- Original Polygon Count: ${polyCount}
- Target Frame Rate: ${targetFrameRate || 60} FPS`;

      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const lodSuggestions = parseAIJson(aiContent) || { summary: aiContent, original_polygon_count: polyCount, target_frame_rate: targetFrameRate || 60, lod_levels: [] };

      await persistAiResult(pool, { userId: req.user?.id, feature: 'generate-lod', endpoint: '/api/ai/generate-lod', prompt: userMessage, aiContent, parsedJson: lodSuggestions, model: result.model, usage: result.usage });

      res.json({ success: true, model_id: modelId, lod_suggestions: lodSuggestions, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('LOD generation error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/analyze-complexity — NEW: scene complexity analyzer
  router.post('/analyze-complexity', async (req, res) => {
    try {
      const { scene_description, objects, target_platform } = req.body;
      if (!scene_description) return res.status(400).json({ error: 'scene_description is required' });

      const systemPrompt = `You are an expert GPU performance analyst for 3D/XR applications. Respond ONLY with valid JSON:
{
  "overall_complexity": "Low|Medium|High|Very High",
  "estimated_draw_calls": number,
  "estimated_vram_mb": number,
  "performance_rating": { "mobile": "string", "vr": "string", "web": "string", "desktop": "string" },
  "gpu_tier_required": "Low-End|Mid-Range|High-End|Ultra",
  "bottlenecks": [{ "type": "CPU|GPU|Memory|Bandwidth", "cause": "string", "severity": "Low|Medium|High" }],
  "optimization_priorities": [{ "priority": number, "action": "string", "estimated_improvement": "string" }],
  "lod_strategy": "string",
  "summary": "string"
}`;

      const userMessage = `Analyze scene complexity:
- Description: ${scene_description}
- Objects: ${objects ? JSON.stringify(objects) : 'Not specified'}
- Target Platform: ${target_platform || 'All platforms'}`;

      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const complexityReport = parseAIJson(aiContent) || { summary: aiContent };

      await persistAiResult(pool, { userId: req.user?.id, feature: 'analyze-complexity', endpoint: '/api/ai/analyze-complexity', prompt: userMessage, aiContent, parsedJson: complexityReport, model: result.model, usage: result.usage });

      res.json({ success: true, complexity_report: complexityReport, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Complexity analysis error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/compose-scene — NEW: AI scene composer from model IDs
  router.post('/compose-scene', async (req, res) => {
    try {
      const { model_ids, style, environment, name } = req.body;
      if (!model_ids || !Array.isArray(model_ids) || model_ids.length === 0) {
        return res.status(400).json({ error: 'model_ids array is required' });
      }
      if (!style) return res.status(400).json({ error: 'style is required' });

      // Fetch model info
      const ids = model_ids.map(id => parseInt(id)).filter(id => !isNaN(id) && id > 0);
      let models = [];
      try {
        const dbResult = await pool.query(`SELECT id, name, description, format, polygons FROM models3d WHERE id = ANY($1)`, [ids]);
        models = dbResult.rows;
      } catch (dbErr) { /* proceed without model info */ }

      const systemPrompt = `You are an expert 3D scene composer. Given a list of 3D assets, arrange them into a cohesive scene. Respond ONLY with valid JSON:
{
  "name": "string",
  "description": "string",
  "scene_type": "string",
  "objects_count": number,
  "lighting_type": "string",
  "render_engine": "Path Tracer|Real-Time RTX|Hybrid Ray Trace",
  "output_format": "GLTF|USD|FBX",
  "quality_score": number,
  "status": "completed",
  "scene_graph": {
    "camera": { "type": "string", "fov_deg": number, "position": [number, number, number], "look_at": [number, number, number] },
    "lighting": [{ "type": "string", "intensity": number, "color": "string", "position": [number, number, number] }],
    "object_placements": [{ "model_id": number, "name": "string", "position": [number, number, number], "rotation": [number, number, number], "scale": [number, number, number], "material_override": "string" }]
  },
  "composition_notes": ["string"],
  "summary": "string"
}`;

      const userMessage = `Compose a scene with these assets:
- Models: ${JSON.stringify(models.length > 0 ? models : model_ids)}
- Style: ${style}
- Environment: ${environment || 'Not specified'}
- Scene Name: ${name || 'Composed Scene'}`;

      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const sceneData = parseAIJson(aiContent) || {};
      sceneData.name = name || sceneData.name || 'AI Composed Scene';
      sceneData.ai_generated = true;
      sceneData.ai_prompt = userMessage;
      sceneData.ai_response = aiContent;

      let savedScene = null;
      try {
        const r = await pool.query(
          `INSERT INTO scene_generator (name, description, scene_type, objects_count, lighting_type, render_engine, output_format, quality_score, status, ai_generated, ai_prompt, ai_response)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12) RETURNING *`,
          [sceneData.name, sceneData.description || style, sceneData.scene_type || 'Composed', sceneData.objects_count || ids.length, sceneData.lighting_type || 'Mixed', sceneData.render_engine || 'Path Tracer', sceneData.output_format || 'GLTF', sceneData.quality_score || 85, 'completed', true, userMessage, aiContent]
        );
        savedScene = r.rows[0];
      } catch (dbErr) { console.warn('Failed to save composed scene:', dbErr.message); }

      await persistAiResult(pool, { userId: req.user?.id, feature: 'compose-scene', endpoint: '/api/ai/compose-scene', prompt: userMessage, aiContent, parsedJson: sceneData, model: result.model, usage: result.usage, sourceTable: 'scene_generator', sourceId: savedScene?.id });

      res.json({ success: true, scene: sceneData, saved_scene: savedScene, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Scene compose error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/export-advisor — NEW: engine-specific export checklist
  router.post('/export-advisor', async (req, res) => {
    try {
      const { asset_id, asset_type, target_engine } = req.body;
      if (!target_engine) return res.status(400).json({ error: 'target_engine is required' });
      const validEngines = ['Unity', 'Unreal Engine', 'Three.js', 'Godot', 'Blender', 'Babylon.js'];
      if (!validEngines.includes(target_engine)) {
        return res.status(400).json({ error: `target_engine must be one of: ${validEngines.join(', ')}` });
      }

      let assetInfo = null;
      if (asset_id && asset_type && ALLOWED_TABLES.includes(asset_type)) {
        try {
          const r = await pool.query(`SELECT * FROM ${asset_type} WHERE id = $1`, [parseInt(asset_id)]);
          assetInfo = r.rows[0] || null;
        } catch (e) {}
      }

      const systemPrompt = `You are an expert 3D asset pipeline engineer. Respond ONLY with valid JSON:
{
  "target_engine": "string",
  "asset_type": "string",
  "export_format": "string",
  "checklist": [{ "step": number, "category": "string", "action": "string", "required": boolean, "notes": "string" }],
  "engine_settings": { "coordinate_system": "string", "scale_factor": number, "texture_format": "string", "compression": "string" },
  "common_issues": [{ "issue": "string", "solution": "string", "severity": "Low|Medium|High" }],
  "estimated_compatibility_score": number,
  "summary": "string"
}`;

      const userMessage = `Generate export checklist for:
- Target Engine: ${target_engine}
- Asset ID: ${asset_id || 'N/A'}
- Asset Type: ${asset_type || 'N/A'}
- Asset Info: ${assetInfo ? JSON.stringify({ name: assetInfo.name, format: assetInfo.format, polygons: assetInfo.polygons || assetInfo.poly_count }) : 'Not specified'}`;

      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const exportPlan = parseAIJson(aiContent) || { summary: aiContent, target_engine };

      await persistAiResult(pool, { userId: req.user?.id, feature: 'export-advisor', endpoint: '/api/ai/export-advisor', prompt: userMessage, aiContent, parsedJson: exportPlan, model: result.model, usage: result.usage });

      res.json({ success: true, export_plan: exportPlan, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Export advisor error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/batch-generate — NEW: batch AI variation generator
  router.post('/batch-generate', async (req, res) => {
    try {
      const { base_prompt, count, feature, table } = req.body;
      if (!base_prompt || typeof base_prompt !== 'string') {
        return res.status(400).json({ error: 'base_prompt is required' });
      }
      const batchCount = Math.min(5, Math.max(1, parseInt(count) || 3));

      const systemPrompt = `You are an expert AI for 3D/Spatial computing. Generate ${batchCount} distinct variations. Respond ONLY with valid JSON array:
[
  { "name": "string", "variation_index": number, "description": "string", "key_differences": ["string"], "technical_specs": "string" }
]`;

      const result = await callOpenRouter(systemPrompt, `Generate ${batchCount} variations of: ${base_prompt}`);
      const aiContent = result.choices?.[0]?.message?.content || '[]';
      const variations = parseAIJson(aiContent);

      const savedItems = [];
      if (table && ALLOWED_TABLES.includes(table) && Array.isArray(variations)) {
        for (const variation of variations) {
          try {
            const r = await pool.query(
              `INSERT INTO ${table} (name, description, ai_generated, ai_prompt, ai_response) VALUES ($1,$2,$3,$4,$5) RETURNING *`,
              [variation.name || `Variation ${variation.variation_index}`, variation.description || base_prompt.slice(0, 200), true, base_prompt, JSON.stringify(variation)]
            );
            savedItems.push(r.rows[0]);
          } catch (e) {}
        }
      }

      await persistAiResult(pool, { userId: req.user?.id, feature: feature || 'batch-generate', endpoint: '/api/ai/batch-generate', prompt: base_prompt, aiContent, parsedJson: variations, model: result.model, usage: result.usage, sourceTable: table });

      res.json({ success: true, variations, saved_count: savedItems.length, saved_items: savedItems, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Batch generate error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/performance-budget — NEW: render budget checker
  router.post('/performance-budget', async (req, res) => {
    try {
      const { assets, target_fps, platform } = req.body;
      if (!assets || !Array.isArray(assets)) {
        return res.status(400).json({ error: 'assets array is required' });
      }
      if (!platform) return res.status(400).json({ error: 'platform is required' });

      const systemPrompt = `You are an expert XR performance engineer. Respond ONLY with valid JSON:
{
  "platform": "string",
  "target_fps": number,
  "budget_met": boolean,
  "total_polygons": number,
  "estimated_draw_calls": number,
  "estimated_vram_mb": number,
  "current_fps_estimate": number,
  "asset_analysis": [{ "name": "string", "polygons": number, "contribution_percent": number, "optimization_needed": boolean, "suggested_reduction": number }],
  "recommendations": [{ "priority": number, "action": "string", "fps_gain_estimate": number }],
  "summary": "string"
}`;

      const userMessage = `Check performance budget:
- Platform: ${platform}
- Target FPS: ${target_fps || 60}
- Assets: ${JSON.stringify(assets)}`;

      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const budgetReport = parseAIJson(aiContent) || { summary: aiContent };

      await persistAiResult(pool, { userId: req.user?.id, feature: 'performance-budget', endpoint: '/api/ai/performance-budget', prompt: userMessage, aiContent, parsedJson: budgetReport, model: result.model, usage: result.usage });

      res.json({ success: true, budget_report: budgetReport, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Performance budget error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/suggest-tags — NEW: smart tag suggester
  router.post('/suggest-tags', async (req, res) => {
    try {
      const { name, description, category } = req.body;
      if (!name && !description) return res.status(400).json({ error: 'name or description is required' });

      const systemPrompt = `You are an expert 3D asset cataloguer. Suggest relevant tags. Respond ONLY with valid JSON:
{
  "suggested_tags": ["string"],
  "category_tags": ["string"],
  "style_tags": ["string"],
  "use_case_tags": ["string"],
  "technical_tags": ["string"],
  "combined_tag_string": "string (comma-separated, max 10 tags)"
}`;

      const userMessage = `Suggest tags for this 3D asset:
- Name: ${name || 'N/A'}
- Description: ${description || 'N/A'}
- Category: ${category || 'N/A'}`;

      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || '{}';
      const tagSuggestions = parseAIJson(aiContent) || { suggested_tags: [], combined_tag_string: '' };

      await persistAiResult(pool, { userId: req.user?.id, feature: 'suggest-tags', endpoint: '/api/ai/suggest-tags', prompt: userMessage, aiContent, parsedJson: tagSuggestions, model: result.model, usage: result.usage });

      res.json({ success: true, tags: tagSuggestions, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Tag suggestion error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/compare-models — NEW: model comparison
  router.post('/compare-models', async (req, res) => {
    try {
      const { model_ids } = req.body;
      if (!model_ids || !Array.isArray(model_ids) || model_ids.length < 2) {
        return res.status(400).json({ error: 'model_ids array with at least 2 ids is required' });
      }

      const ids = model_ids.map(id => parseInt(id)).filter(id => !isNaN(id));
      let models = [];
      try {
        const r = await pool.query('SELECT * FROM models3d WHERE id = ANY($1)', [ids]);
        models = r.rows;
      } catch (e) {}

      const systemPrompt = `You are an expert 3D model analyst. Compare models and respond ONLY with valid JSON:
{
  "comparison_summary": "string",
  "winner_overall": "string (model name or 'Tie')",
  "metrics": {
    "polygon_comparison": [{ "model": "string", "polygons": number, "rating": "Low|Medium|High|Very High" }],
    "format_compatibility": [{ "model": "string", "format": "string", "engine_support": ["string"] }],
    "file_size_comparison": [{ "model": "string", "size": "string", "relative": "Smallest|Medium|Largest" }]
  },
  "use_case_recommendations": [{ "use_case": "string", "recommended_model": "string", "reason": "string" }],
  "optimization_comparison": [{ "model": "string", "optimization_needed": boolean, "suggestions": ["string"] }],
  "summary": "string"
}`;

      const userMessage = `Compare these 3D models: ${JSON.stringify(models.length > 0 ? models.map(m => ({ id: m.id, name: m.name, format: m.format, polygons: m.polygons, vertices: m.vertices, file_size: m.file_size })) : ids)}`;

      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const comparisonReport = parseAIJson(aiContent) || { summary: aiContent };

      await persistAiResult(pool, { userId: req.user?.id, feature: 'compare-models', endpoint: '/api/ai/compare-models', prompt: userMessage, aiContent, parsedJson: comparisonReport, model: result.model, usage: result.usage });

      res.json({ success: true, models_compared: models, comparison_report: comparisonReport, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Model comparison error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ai/usage — AI usage analytics
  router.get('/usage', async (req, res) => {
    try {
      const userId = req.query.user_id ? parseInt(req.query.user_id) : req.user?.id;

      const byFeature = await pool.query(
        `SELECT feature, COUNT(*) as calls, SUM(total_tokens) as total_tokens, SUM(prompt_tokens) as prompt_tokens, SUM(completion_tokens) as completion_tokens
         FROM ai_results WHERE ($1::int IS NULL OR user_id = $1) GROUP BY feature ORDER BY calls DESC`,
        [userId || null]
      );

      const byDay = await pool.query(
        `SELECT DATE(created_at) as day, COUNT(*) as calls, SUM(total_tokens) as tokens
         FROM ai_results WHERE ($1::int IS NULL OR user_id = $1) GROUP BY DATE(created_at) ORDER BY day DESC LIMIT 30`,
        [userId || null]
      );

      const totals = await pool.query(
        `SELECT COUNT(*) as total_calls, SUM(total_tokens) as total_tokens, COUNT(DISTINCT user_id) as unique_users
         FROM ai_results WHERE ($1::int IS NULL OR user_id = $1)`,
        [userId || null]
      );

      res.json({
        success: true,
        totals: totals.rows[0],
        by_feature: byFeature.rows,
        by_day: byDay.rows,
      });
    } catch (err) {
      console.error('AI usage error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // GET /api/ai/history — recent AI results for the current user
  router.get('/history', async (req, res) => {
    try {
      const page = Math.max(1, parseInt(req.query.page) || 1);
      const limit = Math.min(50, parseInt(req.query.limit) || 20);
      const offset = (page - 1) * limit;

      const countResult = await pool.query(
        'SELECT COUNT(*) FROM ai_results WHERE user_id = $1',
        [req.user.id]
      );
      const total = parseInt(countResult.rows[0].count);

      const results = await pool.query(
        `SELECT id, feature, endpoint, prompt, model, prompt_tokens, completion_tokens, total_tokens, source_table, source_id, created_at
         FROM ai_results WHERE user_id = $1 ORDER BY created_at DESC LIMIT $2 OFFSET $3`,
        [req.user.id, limit, offset]
      );

      res.json({
        data: results.rows,
        pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
      });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });

  // ----- Apply pass 5 additions -----
  // Helper: gate AI endpoints on OPENROUTER_API_KEY presence
  // ENV VARS: OPENROUTER_API_KEY (required for AI calls)
  function requireKey(res) {
    if (!process.env.OPENROUTER_API_KEY) {
      res.status(503).json({ error: 'AI service not configured', missing: 'OPENROUTER_API_KEY' });
      return false;
    }
    return true;
  }

  // POST /api/ai/performance-profile — performance profiling advisor
  // PRODUCT-DECISION: Profile metrics derived from heuristic prompts; we expose
  // FPS, draw calls, memory, GPU bound, CPU bound categories. No live telemetry.
  router.post('/performance-profile', async (req, res) => {
    try {
      if (!requireKey(res)) return;
      const { scene_description, target_platform, current_fps, draw_calls, polygon_count } = req.body || {};
      if (!scene_description || typeof scene_description !== 'string') {
        return res.status(400).json({ error: 'scene_description is required' });
      }
      const systemPrompt = `You are a 3D performance profiling expert. Respond ONLY with valid JSON:
{
  "overall_grade": "A|B|C|D|F",
  "estimated_fps": number,
  "bottlenecks": [{ "component": "string", "severity": "low|medium|high|critical", "impact": "string", "fix": "string" }],
  "metrics": { "draw_calls": number, "polygon_budget_used_pct": number, "texture_memory_mb": number, "gpu_bound_pct": number, "cpu_bound_pct": number },
  "optimization_priorities": ["string"],
  "platform_specific_advice": ["string"],
  "summary": "string"
}`;
      const userMessage = `Profile a 3D scene:
- Description: ${scene_description}
- Target platform: ${target_platform || 'unspecified'}
- Current FPS (if known): ${current_fps || 'unknown'}
- Draw calls (if known): ${draw_calls || 'unknown'}
- Polygon count (if known): ${polygon_count || 'unknown'}`;

      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const profile = parseAIJson(aiContent) || { summary: aiContent };
      await persistAiResult(pool, { userId: req.user?.id, feature: 'performance-profile', endpoint: '/api/ai/performance-profile', prompt: userMessage, aiContent, parsedJson: profile, model: result.model, usage: result.usage });
      res.json({ success: true, profile, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Performance profile error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/physics-simulation — physics simulation design plan
  // PRODUCT-DECISION: Returns a design plan, NOT a live physics engine. Heavy
  // physics deps (cannon-es / rapier) are out of scope for this batch.
  router.post('/physics-simulation', async (req, res) => {
    try {
      if (!requireKey(res)) return;
      const { scene_description, simulation_type, target_engine } = req.body || {};
      if (!scene_description) return res.status(400).json({ error: 'scene_description is required' });
      const systemPrompt = `You are a physics simulation expert. Respond ONLY with valid JSON:
{
  "simulation_plan": { "type": "string", "engine": "string", "timestep": number, "substeps": number, "gravity": "string" },
  "rigid_bodies": [{ "name": "string", "shape": "string", "mass_kg": number, "friction": number, "restitution": number }],
  "constraints": [{ "type": "string", "between": "string", "params": "string" }],
  "collision_groups": ["string"],
  "performance_notes": ["string"],
  "implementation_steps": ["string"],
  "summary": "string"
}`;
      const userMessage = `Design a physics simulation:
- Scene: ${scene_description}
- Simulation type: ${simulation_type || 'general'}
- Target engine: ${target_engine || 'cannon-es / rapier / havok'}`;
      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const plan = parseAIJson(aiContent) || { summary: aiContent };
      await persistAiResult(pool, { userId: req.user?.id, feature: 'physics-simulation', endpoint: '/api/ai/physics-simulation', prompt: userMessage, aiContent, parsedJson: plan, model: result.model, usage: result.usage });
      res.json({ success: true, simulation_plan: plan, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Physics simulation error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/lighting-simulation — lighting / global illumination design plan
  // PRODUCT-DECISION: Returns a lighting design plan; actual GI bake is engine-specific.
  router.post('/lighting-simulation', async (req, res) => {
    try {
      if (!requireKey(res)) return;
      const { scene_description, time_of_day, mood, target_engine } = req.body || {};
      if (!scene_description) return res.status(400).json({ error: 'scene_description is required' });
      const systemPrompt = `You are a 3D lighting expert. Respond ONLY with valid JSON:
{
  "lighting_setup": { "ambient": "string", "key_light": "string", "fill_light": "string", "rim_light": "string" },
  "global_illumination": { "enabled": boolean, "method": "string", "bounces": number, "samples": number },
  "lights": [{ "type": "string", "intensity": number, "color": "string", "position": "string", "shadows": boolean }],
  "post_processing": ["string"],
  "performance_cost": "low|medium|high",
  "summary": "string"
}`;
      const userMessage = `Design a lighting setup:
- Scene: ${scene_description}
- Time of day: ${time_of_day || 'unspecified'}
- Mood: ${mood || 'natural'}
- Target engine: ${target_engine || 'three.js / unity / unreal'}`;
      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const plan = parseAIJson(aiContent) || { summary: aiContent };
      await persistAiResult(pool, { userId: req.user?.id, feature: 'lighting-simulation', endpoint: '/api/ai/lighting-simulation', prompt: userMessage, aiContent, parsedJson: plan, model: result.model, usage: result.usage });
      res.json({ success: true, lighting_plan: plan, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Lighting simulation error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/neural-compression — neural mesh compression strategy
  // PRODUCT-DECISION: Returns a compression strategy plan only. Actual neural
  // codec runtime (Draco-Plus / NeRF-style) requires GPU + heavy ML deps.
  router.post('/neural-compression', async (req, res) => {
    try {
      if (!requireKey(res)) return;
      const { asset_description, current_size_mb, target_size_mb, asset_type } = req.body || {};
      if (!asset_description) return res.status(400).json({ error: 'asset_description is required' });
      const systemPrompt = `You are an expert in neural / learned compression for 3D assets. Respond ONLY with valid JSON:
{
  "recommended_codec": "string",
  "estimated_compression_ratio": number,
  "estimated_output_size_mb": number,
  "quality_loss": "imperceptible|low|medium|high",
  "encode_time_estimate": "string",
  "decode_time_estimate": "string",
  "trade_offs": ["string"],
  "fallback_codec": "string",
  "summary": "string"
}`;
      const userMessage = `Recommend a compression approach:
- Asset: ${asset_description}
- Asset type: ${asset_type || 'mesh'}
- Current size MB: ${current_size_mb || 'unknown'}
- Target size MB: ${target_size_mb || 'unspecified'}`;
      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const plan = parseAIJson(aiContent) || { summary: aiContent };
      await persistAiResult(pool, { userId: req.user?.id, feature: 'neural-compression', endpoint: '/api/ai/neural-compression', prompt: userMessage, aiContent, parsedJson: plan, model: result.model, usage: result.usage });
      res.json({ success: true, compression_plan: plan, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Neural compression error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // POST /api/ai/collaboration-plan — multiplayer / collab session design
  // PRODUCT-DECISION: Returns a design plan; live WebSocket multiplayer is out of scope.
  router.post('/collaboration-plan', async (req, res) => {
    try {
      if (!requireKey(res)) return;
      const { scene_description, expected_users, sync_priorities } = req.body || {};
      if (!scene_description) return res.status(400).json({ error: 'scene_description is required' });
      const systemPrompt = `You are an expert in real-time multi-user 3D collaboration. Respond ONLY with valid JSON:
{
  "architecture": { "transport": "string", "auth": "string", "topology": "string", "crdt_or_authoritative": "string" },
  "sync_objects": [{ "name": "string", "frequency_hz": number, "priority": "low|medium|high" }],
  "presence_features": ["string"],
  "scaling_strategy": "string",
  "data_model": ["string"],
  "implementation_steps": ["string"],
  "summary": "string"
}`;
      const userMessage = `Plan a real-time multiplayer collab session:
- Scene: ${scene_description}
- Expected concurrent users: ${expected_users || 'unspecified'}
- Sync priorities: ${sync_priorities || 'transform + presence'}`;
      const result = await callOpenRouter(systemPrompt, userMessage);
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';
      const plan = parseAIJson(aiContent) || { summary: aiContent };
      await persistAiResult(pool, { userId: req.user?.id, feature: 'collaboration-plan', endpoint: '/api/ai/collaboration-plan', prompt: userMessage, aiContent, parsedJson: plan, model: result.model, usage: result.usage });
      res.json({ success: true, collaboration_plan: plan, model: result.model, usage: result.usage });
    } catch (err) {
      console.error('Collaboration plan error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  return router;
};
