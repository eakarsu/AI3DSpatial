require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');

const app = express();
const PORT = process.env.BACKEND_PORT || 3001;

// Database pool
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
});

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Make pool available to routes
app.locals.pool = pool;

// Routes
app.use('/api/auth', require('./routes/auth')(pool));
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

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`🚀 AI 3D/Spatial Backend running on port ${PORT}`);
});
