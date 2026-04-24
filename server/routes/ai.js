const express = require('express');
const https = require('https');
const http = require('http');

function callOpenRouter(prompt, feature) {
  return new Promise((resolve, reject) => {
    const systemPrompt = `You are an expert AI assistant for 3D/Spatial computing. You specialize in ${feature}. Provide detailed, professional responses with structured data. Always respond with actionable technical details. Format your response clearly with sections.`;

    const data = JSON.stringify({
      model: process.env.OPENROUTER_MODEL || 'anthropic/claude-haiku-4.5',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: prompt }
      ],
      max_tokens: 2000,
      temperature: 0.7
    });

    const url = new URL('https://openrouter.ai/api/v1/chat/completions');
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'AI 3D Spatial Platform'
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
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

module.exports = (pool) => {
  const router = express.Router();

  // Generic AI generation endpoint
  router.post('/generate', async (req, res) => {
    try {
      const { prompt, feature, table, itemData } = req.body;

      if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
      }

      const result = await callOpenRouter(prompt, feature || '3D spatial computing');
      const aiContent = result.choices?.[0]?.message?.content || 'No response generated';

      // If table and itemData provided, save to database
      if (table && itemData) {
        const columns = Object.keys(itemData);
        const values = Object.values(itemData);
        columns.push('ai_generated', 'ai_prompt', 'ai_response');
        values.push(true, prompt, aiContent);

        const placeholders = values.map((_, i) => `$${i + 1}`).join(', ');
        const query = `INSERT INTO ${table} (${columns.join(', ')}) VALUES (${placeholders}) RETURNING *`;
        const dbResult = await pool.query(query, values);

        return res.json({
          success: true,
          ai_response: aiContent,
          model: result.model,
          usage: result.usage,
          saved_item: dbResult.rows[0]
        });
      }

      res.json({
        success: true,
        ai_response: aiContent,
        model: result.model,
        usage: result.usage
      });
    } catch (err) {
      console.error('AI generation error:', err);
      res.status(500).json({ error: err.message });
    }
  });

  // Feature-specific AI endpoints
  const features = [
    { path: '/generate-3d-model', feature: '3D model generation', table: 'models3d' },
    { path: '/generate-ar-scene', feature: 'AR scene creation', table: 'ar_scenes' },
    { path: '/generate-vr-environment', feature: 'VR environment design', table: 'vr_environments' },
    { path: '/generate-texture', feature: 'texture generation and PBR materials', table: 'textures' },
    { path: '/generate-animation', feature: '3D animation and motion', table: 'animations' },
    { path: '/analyze-point-cloud', feature: 'point cloud processing and analysis', table: 'point_clouds' },
    { path: '/optimize-mesh', feature: 'mesh optimization and polygon reduction', table: 'mesh_optimization' },
    { path: '/generate-spatial-map', feature: 'spatial mapping and environment scanning', table: 'spatial_mapping' },
    { path: '/detect-objects', feature: '3D object detection and recognition', table: 'object_detection' },
    { path: '/reconstruct-scene', feature: 'scene reconstruction from images', table: 'scene_reconstruction' },
    { path: '/generate-material', feature: 'material and shader creation', table: 'materials' },
    { path: '/generate-asset', feature: '3D asset creation', table: 'asset_library' },
    { path: '/generate-hologram', feature: 'holographic content creation', table: 'holographic' },
    { path: '/generate-spatial-audio', feature: 'spatial audio design', table: 'spatial_audio' },
    { path: '/generate-digital-twin', feature: 'digital twin creation and IoT integration', table: 'digital_twins' },
    { path: '/generate-scene', feature: 'AI 3D scene generation from text prompts, composing complete environments with objects, lighting, materials, and cameras', table: 'scene_generator' },
  ];

  features.forEach(({ path, feature }) => {
    router.post(path, async (req, res) => {
      try {
        const { prompt } = req.body;
        if (!prompt) return res.status(400).json({ error: 'Prompt is required' });

        const result = await callOpenRouter(prompt, feature);
        const aiContent = result.choices?.[0]?.message?.content || 'No response generated';

        res.json({
          success: true,
          ai_response: aiContent,
          model: result.model,
          usage: result.usage,
          feature
        });
      } catch (err) {
        console.error(`AI ${feature} error:`, err);
        res.status(500).json({ error: err.message });
      }
    });
  });

  return router;
};
