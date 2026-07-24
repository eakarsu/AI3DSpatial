require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { legacyPrototypeRoutesEnabled } = require('./config/runtime').validateRuntime();
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

app.use('/api', (req, res, next) => {
  const supported = ['/auth', '/health', '/asset-conversion-workflows', '/runtime-ai'];
  if (legacyPrototypeRoutesEnabled || supported.some((prefix) => req.path === prefix || req.path.startsWith(`${prefix}/`))) return next();
  return res.status(410).json({ error: 'Legacy prototype route is quarantined', code: 'prototype_route_quarantined' });
});

// Make pool available to routes
app.locals.pool = pool;

// Routes
app.use('/api/auth', authLimiter, require('./routes/auth')(pool));
app.use('/api/runtime-ai', require('./routes/runtimeAi')(pool));
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
app.use('/api/asset-conversion-workflows', require('./routes/assetConversionWorkflow')(pool));

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`AI 3D/Spatial Backend running on port ${PORT}`);
});

// Batch-generated stub and gap routes are intentionally not mounted as product APIs.
