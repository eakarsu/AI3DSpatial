require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const { Pool } = require('pg');
const { generalLimiter, authLimiter } = require('./middleware/rateLimiter');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(express.json({ limit: '50mb' }));

// Apply general rate limiter to all routes
app.use(generalLimiter);

// Make pool available to routes
app.locals.pool = pool;

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth')(pool));
app.use('/api/models3d', require('./routes/models3d')(pool));
app.use('/api/ar-scenes', require('./routes/arScenes')(pool));
app.use('/api/vr-environments', require('./routes/vrEnvironments')(pool));
app.use('/api/textures', require('./routes/textures')(pool));
app.use('/api/animations', require('./routes/animations')(pool));
app.use('/api/point-clouds', require('./routes/pointClouds')(pool));
app.use('/api/mesh-optimization', require('./routes/meshOptimization')(pool));
app.use('/api/spatial-mapping', require('./routes/spatialMapping')(pool));
app.use('/api/object-detection', require('./routes/objectDetection')(pool));
app.use('/api/scene-reconstruction', require('./routes/sceneReconstruction')(pool));
app.use('/api/materials', require('./routes/materials')(pool));
app.use('/api/asset-library', require('./routes/assetLibrary')(pool));
app.use('/api/holographic', require('./routes/holographic')(pool));
app.use('/api/spatial-audio', require('./routes/spatialAudio')(pool));
app.use('/api/digital-twins', require('./routes/digitalTwins')(pool));
app.use('/api/scene-generator', require('./routes/sceneGenerator')(pool));
app.use('/api/ai', require('./routes/ai')(pool));
app.use('/api/links', require('./routes/links')(pool));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI 3D/Spatial Backend running on port ${PORT}`);
});

// BATCH_00_AUDIT_MOUNTS
app.use('/api/text-to-scene', require('./routes/textToScene'));
app.use('/api/photogrammetry', require('./routes/photogrammetry'));
app.use('/api/material-synthesis', require('./routes/materialSynthesis'));
app.use('/api/multiplayer-sync', require('./routes/multiplayerSync'));
app.use('/api/neural-compression', require('./routes/neuralCompression'));

// === Batch 00 Gaps & Frontend Mounts ===
app.use('/api/gap-ai-neural-mesh-compression', require('./routes/gap_ai_neural_mesh_compression'));
app.use('/api/gap-ai-text-scene-generation', require('./routes/gap_ai_text_scene_generation'));
app.use('/api/gap-ai-image-based-object-detection', require('./routes/gap_ai_image_based_object_detection'));
app.use('/api/gap-ai-spatial-mapping-live-camera', require('./routes/gap_ai_spatial_mapping_live_camera'));
app.use('/api/gap-ai-scene-reconstruction-nerf-gaussian', require('./routes/gap_ai_scene_reconstruction_nerf_gaussian'));
app.use('/api/gap-ai-material-recommendation-use-case', require('./routes/gap_ai_material_recommendation_use_case'));
app.use('/api/gap-multi-user-real-time-collaborative', require('./routes/gap_multi_user_real_time_collaborative'));
app.use('/api/gap-physics-simulation-collision-gravity', require('./routes/gap_physics_simulation_collision_gravity'));
app.use('/api/gap-global-illumination-lighting-simulation', require('./routes/gap_global_illumination_lighting_simulation'));
app.use('/api/gap-fps-performance-profiling-tools', require('./routes/gap_fps_performance_profiling_tools'));
app.use('/api/gap-notifications-subsystem', require('./routes/gap_notifications_subsystem'));
app.use('/api/gap-outbound-webhooks', require('./routes/gap_outbound_webhooks'));
