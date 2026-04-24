require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const fs = require('fs');
const path = require('path');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function seed() {
  console.log('🌱 Starting database seed...');

  // Run schema
  const schema = fs.readFileSync(path.join(__dirname, 'db', 'schema.sql'), 'utf8');
  await pool.query(schema);
  console.log('✅ Schema created');

  // Clear existing data
  const tables = ['users', 'models3d', 'ar_scenes', 'vr_environments', 'textures', 'animations',
    'point_clouds', 'mesh_optimization', 'spatial_mapping', 'object_detection',
    'scene_reconstruction', 'materials', 'asset_library', 'holographic', 'spatial_audio', 'digital_twins', 'scene_generator'];
  for (const t of tables) {
    await pool.query(`DELETE FROM ${t}`);
    await pool.query(`ALTER SEQUENCE ${t}_id_seq RESTART WITH 1`);
  }
  console.log('✅ Tables cleared');

  // Seed users
  const hashedPassword = await bcrypt.hash('password123', 10);
  await pool.query(`INSERT INTO users (email, password, name) VALUES
    ('admin@ai3dspatial.com', $1, 'Admin User'),
    ('demo@ai3dspatial.com', $1, 'Demo User')`, [hashedPassword]);
  console.log('✅ Users seeded');

  // Seed 3D Models (15 items)
  await pool.query(`INSERT INTO models3d (name, description, format, vertices, polygons, file_size, status) VALUES
    ('Urban Skyscraper', 'High-detail modern skyscraper with glass facades', 'FBX', 245000, 180000, '45 MB', 'ready'),
    ('Medieval Castle', 'Detailed medieval castle with interior rooms', 'OBJ', 520000, 380000, '92 MB', 'ready'),
    ('Sci-Fi Spaceship', 'Futuristic spacecraft with animated parts', 'GLTF', 180000, 125000, '38 MB', 'ready'),
    ('Human Character', 'Rigged humanoid character for animation', 'FBX', 32000, 28000, '15 MB', 'ready'),
    ('Sports Car', 'Detailed sports car with interior', 'OBJ', 156000, 120000, '52 MB', 'ready'),
    ('Forest Environment', 'Dense forest with 200+ tree variants', 'GLTF', 890000, 650000, '180 MB', 'ready'),
    ('Robot Companion', 'Animated robot with 50 blend shapes', 'FBX', 45000, 38000, '22 MB', 'ready'),
    ('Ancient Temple', 'Greek temple with detailed columns', 'OBJ', 320000, 245000, '68 MB', 'ready'),
    ('Submarine', 'Military submarine with interior', 'GLTF', 210000, 165000, '55 MB', 'processing'),
    ('Dragon Creature', 'Fantasy dragon with wing animations', 'FBX', 128000, 95000, '42 MB', 'ready'),
    ('City Block', 'Complete city block with buildings and roads', 'OBJ', 1200000, 880000, '250 MB', 'ready'),
    ('Mech Warrior', 'Bipedal mech with articulated joints', 'GLTF', 185000, 140000, '48 MB', 'ready'),
    ('Underwater Reef', 'Coral reef ecosystem with fish', 'FBX', 450000, 320000, '95 MB', 'ready'),
    ('Vintage Train', 'Steam locomotive with detailed mechanics', 'OBJ', 280000, 210000, '72 MB', 'processing'),
    ('Space Station', 'Orbital station with modular sections', 'GLTF', 560000, 420000, '135 MB', 'ready')`);
  console.log('✅ 3D Models seeded');

  // Seed AR Scenes (15 items)
  await pool.query(`INSERT INTO ar_scenes (name, description, scene_type, target_platform, tracking_type, objects_count, status) VALUES
    ('Furniture Preview', 'Place furniture in your room before buying', 'Product Visualization', 'iOS/Android', 'Plane Detection', 25, 'published'),
    ('AR Museum Guide', 'Interactive museum tour with 3D overlays', 'Education', 'iOS/Android', 'Image Tracking', 40, 'published'),
    ('AR Navigation', 'Indoor navigation with AR waypoints', 'Navigation', 'iOS/Android', 'Visual SLAM', 15, 'draft'),
    ('Virtual Pet', 'AR pet that interacts with environment', 'Entertainment', 'iOS', 'Plane Detection', 8, 'published'),
    ('AR Anatomy Lesson', 'Explore human body in 3D AR', 'Education', 'iOS/Android', 'Image Tracking', 35, 'published'),
    ('Product Assembly', 'Step-by-step AR assembly instructions', 'Industrial', 'Android', 'Object Tracking', 20, 'draft'),
    ('AR Art Gallery', 'Display digital art on real walls', 'Art', 'iOS/Android', 'Plane Detection', 50, 'published'),
    ('Car Configurator', 'Customize car in AR at real scale', 'Product Visualization', 'iOS/Android', 'Plane Detection', 12, 'published'),
    ('AR Fitness Coach', 'Real-time pose tracking workout guide', 'Health', 'iOS', 'Body Tracking', 10, 'draft'),
    ('Architectural Preview', 'View buildings before construction', 'Architecture', 'iOS/Android', 'GPS + Plane', 5, 'published'),
    ('AR Cooking Helper', 'Recipe overlay on kitchen surfaces', 'Lifestyle', 'iOS/Android', 'Plane Detection', 18, 'published'),
    ('Interactive Map', 'AR terrain and city 3D map viewer', 'Mapping', 'iOS/Android', 'Image Tracking', 30, 'draft'),
    ('AR Retail Display', 'Virtual product try-on experience', 'Retail', 'iOS/Android', 'Face Tracking', 22, 'published'),
    ('Science Lab AR', 'Virtual chemistry experiments in AR', 'Education', 'iOS/Android', 'Plane Detection', 15, 'published'),
    ('AR Garden Planner', 'Visualize plants and landscaping in AR', 'Lifestyle', 'iOS/Android', 'Plane Detection', 45, 'draft')`);
  console.log('✅ AR Scenes seeded');

  // Seed VR Environments (15 items)
  await pool.query(`INSERT INTO vr_environments (name, description, environment_type, platform, resolution, fps_target, interactive_elements, status) VALUES
    ('Virtual Office', 'Collaborative VR workspace', 'Workspace', 'Meta Quest 3', '4K per eye', 90, 45, 'published'),
    ('Space Explorer', 'Tour the solar system in VR', 'Education', 'SteamVR', '4K per eye', 90, 30, 'published'),
    ('VR Concert Hall', 'Live music venue with spatial audio', 'Entertainment', 'Meta Quest 3', '4K per eye', 72, 20, 'published'),
    ('Underwater Dive', 'Deep sea exploration experience', 'Simulation', 'PSVR2', '4K per eye', 60, 35, 'draft'),
    ('Historical Rome', 'Walk through ancient Roman city', 'Education', 'SteamVR', '4K per eye', 90, 50, 'published'),
    ('VR Training Center', 'Industrial safety training simulation', 'Training', 'Meta Quest 3', '4K per eye', 72, 60, 'published'),
    ('Zen Garden', 'Relaxation and meditation environment', 'Wellness', 'Meta Quest 3', '4K per eye', 90, 15, 'published'),
    ('Mars Colony', 'Explore a future Mars settlement', 'Simulation', 'SteamVR', '8K per eye', 90, 40, 'draft'),
    ('VR Classroom', 'Virtual learning environment for 30 students', 'Education', 'Meta Quest 3', '4K per eye', 72, 25, 'published'),
    ('Racing Simulator', 'High-speed racing with realistic physics', 'Gaming', 'SteamVR', '4K per eye', 120, 18, 'published'),
    ('Art Studio VR', '3D painting and sculpting workspace', 'Creative', 'Meta Quest 3', '4K per eye', 90, 55, 'published'),
    ('Emergency Response', 'Disaster response training simulation', 'Training', 'SteamVR', '4K per eye', 90, 70, 'draft'),
    ('Virtual Zoo', 'Interactive animal encounters in VR', 'Education', 'Meta Quest 3', '4K per eye', 72, 28, 'published'),
    ('Haunted Mansion', 'Horror exploration VR experience', 'Entertainment', 'PSVR2', '4K per eye', 60, 42, 'published'),
    ('Architectural Walkthrough', 'Full-scale building interior preview', 'Architecture', 'SteamVR', '8K per eye', 90, 22, 'published')`);
  console.log('✅ VR Environments seeded');

  // Seed Textures (15 items)
  await pool.query(`INSERT INTO textures (name, description, texture_type, resolution, format, seamless, pbr_enabled, status) VALUES
    ('Brushed Steel', 'Industrial brushed metal surface', 'Metal', '4096x4096', 'PNG', true, true, 'ready'),
    ('Red Brick Wall', 'Weathered brick with mortar detail', 'Brick', '4096x4096', 'PNG', true, true, 'ready'),
    ('Oak Hardwood', 'Natural oak wood flooring texture', 'Wood', '4096x4096', 'PNG', true, true, 'ready'),
    ('Alien Skin', 'Sci-fi organic alien surface', 'Organic', '2048x2048', 'PNG', true, true, 'ready'),
    ('Concrete Cracked', 'Damaged concrete with cracks', 'Concrete', '4096x4096', 'PNG', true, true, 'ready'),
    ('Galaxy Nebula', 'Deep space nebula environment map', 'HDRI', '8192x4096', 'EXR', false, false, 'ready'),
    ('Marble White', 'Polished white Carrara marble', 'Stone', '4096x4096', 'PNG', true, true, 'ready'),
    ('Leather Brown', 'Genuine leather with grain detail', 'Fabric', '2048x2048', 'PNG', true, true, 'ready'),
    ('Lava Flow', 'Glowing lava with emissive properties', 'Special', '4096x4096', 'PNG', true, true, 'ready'),
    ('Sand Desert', 'Fine desert sand with wind patterns', 'Ground', '4096x4096', 'PNG', true, true, 'ready'),
    ('Circuit Board', 'PCB with component detail', 'Technical', '4096x4096', 'PNG', true, true, 'ready'),
    ('Ice Crystal', 'Frozen ice with translucency', 'Special', '2048x2048', 'PNG', true, true, 'ready'),
    ('Grass Lawn', 'Manicured grass with variation', 'Ground', '4096x4096', 'PNG', true, true, 'ready'),
    ('Carbon Fiber', 'Woven carbon fiber composite', 'Technical', '4096x4096', 'PNG', true, true, 'ready'),
    ('Mossy Rock', 'Natural rock covered in moss', 'Ground', '4096x4096', 'PNG', true, true, 'ready')`);
  console.log('✅ Textures seeded');

  // Seed Animations (15 items)
  await pool.query(`INSERT INTO animations (name, description, animation_type, duration_seconds, frame_rate, keyframes, loop_enabled, status) VALUES
    ('Walk Cycle', 'Realistic human walking animation', 'Character', 1.2, 60, 72, true, 'ready'),
    ('Idle Breathing', 'Subtle idle breathing motion', 'Character', 4.0, 30, 120, true, 'ready'),
    ('Door Opening', 'Door swing with handle rotation', 'Mechanical', 2.5, 60, 150, false, 'ready'),
    ('Explosion VFX', 'Particle-based explosion effect', 'VFX', 3.0, 60, 180, false, 'ready'),
    ('Water Flow', 'Procedural water stream animation', 'Environmental', 8.0, 30, 240, true, 'ready'),
    ('Robot Assembly', 'Robot arm assembly line sequence', 'Mechanical', 15.0, 60, 900, true, 'ready'),
    ('Bird Flight', 'Realistic bird flying animation', 'Creature', 2.0, 60, 120, true, 'ready'),
    ('Camera Orbit', 'Smooth orbital camera movement', 'Camera', 10.0, 30, 300, true, 'ready'),
    ('Face Emotions', '12 facial expression transitions', 'Facial', 6.0, 60, 360, false, 'ready'),
    ('Tree Wind Sway', 'Natural tree movement in wind', 'Environmental', 5.0, 30, 150, true, 'ready'),
    ('Sword Combat', 'Sword slash attack combo sequence', 'Character', 3.5, 60, 210, false, 'ready'),
    ('Gear Rotation', 'Interlocking gear mechanism spin', 'Mechanical', 4.0, 60, 240, true, 'ready'),
    ('Flag Waving', 'Cloth simulation flag animation', 'Physics', 6.0, 60, 360, true, 'ready'),
    ('Teleport Effect', 'Sci-fi teleportation visual effect', 'VFX', 2.0, 60, 120, false, 'ready'),
    ('Breathing Fire', 'Dragon fire-breathing animation', 'Creature', 4.5, 60, 270, false, 'ready')`);
  console.log('✅ Animations seeded');

  // Seed Point Clouds (15 items)
  await pool.query(`INSERT INTO point_clouds (name, description, point_count, density, source_type, coordinate_system, file_size, status) VALUES
    ('City Downtown Scan', 'Full city block LiDAR capture', 45000000, 'High', 'Aerial LiDAR', 'WGS84', '2.1 GB', 'processed'),
    ('Factory Floor', 'Industrial facility scan', 12000000, 'Ultra High', 'Terrestrial LiDAR', 'Local', '580 MB', 'processed'),
    ('Mountain Terrain', 'Rocky mountain terrain capture', 28000000, 'Medium', 'Aerial LiDAR', 'WGS84', '1.3 GB', 'processed'),
    ('Bridge Structure', 'Suspension bridge inspection scan', 8500000, 'Ultra High', 'Terrestrial LiDAR', 'Local', '410 MB', 'processed'),
    ('Forest Canopy', 'Dense forest vegetation analysis', 35000000, 'High', 'Aerial LiDAR', 'WGS84', '1.7 GB', 'processing'),
    ('Archaeological Site', 'Ancient ruins documentation', 15000000, 'Ultra High', 'Photogrammetry', 'Local', '720 MB', 'processed'),
    ('Highway Corridor', '50km highway mapping', 62000000, 'Medium', 'Mobile LiDAR', 'WGS84', '3.0 GB', 'processed'),
    ('Stadium Interior', 'Sports stadium interior scan', 9800000, 'High', 'Terrestrial LiDAR', 'Local', '470 MB', 'processed'),
    ('Coastal Cliff', 'Erosion monitoring scan series', 18000000, 'High', 'Aerial LiDAR', 'WGS84', '860 MB', 'processed'),
    ('Power Plant', 'Nuclear facility as-built scan', 22000000, 'Ultra High', 'Terrestrial LiDAR', 'Local', '1.1 GB', 'processed'),
    ('Vineyard Terrain', 'Agricultural terrain analysis', 14000000, 'Medium', 'Drone LiDAR', 'WGS84', '680 MB', 'processed'),
    ('Cave System', 'Underground cave 3D mapping', 7200000, 'High', 'Terrestrial LiDAR', 'Local', '345 MB', 'processed'),
    ('Airport Runway', 'Runway surface condition scan', 31000000, 'Ultra High', 'Mobile LiDAR', 'WGS84', '1.5 GB', 'processing'),
    ('Historic Cathedral', 'Gothic cathedral preservation scan', 19500000, 'Ultra High', 'Photogrammetry', 'Local', '940 MB', 'processed'),
    ('Solar Farm', 'Solar panel installation survey', 11000000, 'Medium', 'Drone LiDAR', 'WGS84', '530 MB', 'processed')`);
  console.log('✅ Point Clouds seeded');

  // Seed Mesh Optimization (15 items)
  await pool.query(`INSERT INTO mesh_optimization (name, description, original_polygons, optimized_polygons, reduction_percent, quality_score, algorithm, status) VALUES
    ('Character LOD0', 'High-poly character optimization', 250000, 45000, 82.0, 94.5, 'Quadric Edge Collapse', 'completed'),
    ('Building Exterior', 'Architectural mesh simplification', 1200000, 180000, 85.0, 91.2, 'Progressive Mesh', 'completed'),
    ('Vehicle Body', 'Car body panel optimization', 380000, 65000, 82.9, 96.1, 'Vertex Clustering', 'completed'),
    ('Terrain Mesh', 'Large terrain LOD generation', 5000000, 250000, 95.0, 88.3, 'Quadric Edge Collapse', 'completed'),
    ('Weapon Model', 'Game weapon mesh optimization', 85000, 12000, 85.9, 93.7, 'Progressive Mesh', 'completed'),
    ('Tree Foliage', 'Vegetation mesh simplification', 450000, 35000, 92.2, 87.5, 'Billboard LOD', 'completed'),
    ('Interior Room', 'Room furniture optimization', 680000, 120000, 82.4, 95.0, 'Quadric Edge Collapse', 'completed'),
    ('Mechanical Part', 'CAD mesh optimization for real-time', 920000, 85000, 90.8, 92.8, 'Feature Preserving', 'completed'),
    ('Facial Mesh', 'High-quality face decimation', 150000, 28000, 81.3, 97.2, 'Progressive Mesh', 'completed'),
    ('City Scene', 'Full city scene LOD pipeline', 8500000, 500000, 94.1, 86.9, 'Hierarchical LOD', 'completed'),
    ('Organic Creature', 'Creature mesh retopology', 320000, 48000, 85.0, 93.4, 'Instant Meshes', 'completed'),
    ('Ship Hull', 'Naval vessel optimization', 560000, 95000, 83.0, 94.8, 'Quadric Edge Collapse', 'completed'),
    ('Rock Formation', 'Natural rock mesh simplify', 220000, 32000, 85.5, 91.6, 'Vertex Clustering', 'completed'),
    ('UI Element 3D', '3D UI component optimization', 45000, 8000, 82.2, 98.1, 'Manual Retopology', 'completed'),
    ('Cloth Simulation', 'Cloth mesh optimization for mobile', 180000, 22000, 87.8, 90.5, 'Progressive Mesh', 'completed')`);
  console.log('✅ Mesh Optimization seeded');

  // Seed Spatial Mapping (15 items)
  await pool.query(`INSERT INTO spatial_mapping (name, description, area_sqm, resolution, mapping_type, sensor_type, accuracy, status) VALUES
    ('Office Floor 3', 'Complete third floor mapping', 850.0, '2cm', 'Indoor', 'LiDAR', '±1cm', 'mapped'),
    ('Warehouse Zone A', 'Storage area spatial map', 2400.0, '5cm', 'Indoor', 'Depth Camera', '±3cm', 'mapped'),
    ('Shopping Mall', 'Multi-level retail space mapping', 15000.0, '10cm', 'Indoor', 'LiDAR', '±5cm', 'mapped'),
    ('Parking Garage', 'Underground parking structure', 3200.0, '5cm', 'Indoor', 'LiDAR', '±2cm', 'mapped'),
    ('Hospital Wing', 'Emergency department layout', 1800.0, '2cm', 'Indoor', 'Depth Camera', '±1cm', 'mapped'),
    ('Construction Site', 'Active construction area scan', 5500.0, '10cm', 'Outdoor', 'Drone LiDAR', '±5cm', 'processing'),
    ('Museum Gallery', 'Exhibition hall for AR overlay', 650.0, '1cm', 'Indoor', 'LiDAR', '±0.5cm', 'mapped'),
    ('Sports Arena', 'Full arena interior mapping', 12000.0, '10cm', 'Indoor', 'LiDAR', '±5cm', 'mapped'),
    ('Apartment Unit', 'Residential space for AR furniture', 95.0, '1cm', 'Indoor', 'Depth Camera', '±1cm', 'mapped'),
    ('Server Room', 'Data center rack layout mapping', 320.0, '2cm', 'Indoor', 'LiDAR', '±0.5cm', 'mapped'),
    ('Rooftop Garden', 'Urban rooftop spatial mapping', 440.0, '5cm', 'Outdoor', 'LiDAR', '±2cm', 'mapped'),
    ('Subway Station', 'Underground transit station scan', 2800.0, '5cm', 'Indoor', 'LiDAR', '±2cm', 'mapped'),
    ('Retail Store', 'Boutique store for AR shopping', 180.0, '1cm', 'Indoor', 'Depth Camera', '±1cm', 'mapped'),
    ('Factory Assembly', 'Assembly line spatial mapping', 4200.0, '2cm', 'Indoor', 'LiDAR', '±1cm', 'processing'),
    ('Airport Terminal', 'Terminal building navigation map', 25000.0, '10cm', 'Indoor', 'LiDAR', '±5cm', 'mapped')`);
  console.log('✅ Spatial Mapping seeded');

  // Seed Object Detection (15 items)
  await pool.query(`INSERT INTO object_detection (name, description, detection_model, objects_detected, confidence_avg, processing_time, input_type, status) VALUES
    ('Street Scene Analysis', 'Urban environment object detection', 'YOLOv8-3D', 145, 92.3, '2.4s', 'Point Cloud', 'completed'),
    ('Indoor Furniture', 'Room furniture identification', 'PointNet++', 28, 95.1, '1.8s', 'RGB-D', 'completed'),
    ('Vehicle Detection', 'Parking lot vehicle scanning', 'VoxelNet', 67, 94.7, '3.2s', 'LiDAR', 'completed'),
    ('Pedestrian Tracking', 'Crowd tracking in 3D space', 'CenterPoint', 89, 88.5, '1.5s', 'Multi-Camera', 'completed'),
    ('Product Recognition', 'Retail shelf product detection', 'PointNet++', 234, 91.8, '4.1s', 'RGB-D', 'completed'),
    ('Defect Inspection', 'Manufacturing defect detection', 'Custom CNN-3D', 12, 97.2, '0.8s', 'Structured Light', 'completed'),
    ('Tree Classification', 'Forest species identification', 'PointNet++', 156, 86.4, '5.6s', 'LiDAR', 'completed'),
    ('Road Obstacle', 'Autonomous driving obstacle detection', 'PointPillars', 43, 96.8, '0.05s', 'LiDAR', 'completed'),
    ('Gesture Recognition', 'Hand gesture detection in 3D', 'MediaPipe 3D', 8, 93.5, '0.03s', 'Depth Camera', 'completed'),
    ('Building Facade', 'Architectural element detection', 'Mask3D', 78, 89.2, '6.3s', 'Photogrammetry', 'completed'),
    ('Pipe Inspection', 'Industrial pipe defect scanning', 'Custom CNN-3D', 19, 95.6, '1.2s', 'LiDAR', 'completed'),
    ('Fruit Grading', 'Agricultural fruit quality detection', 'PointNet++', 450, 90.1, '8.2s', 'Structured Light', 'completed'),
    ('Bone Structure', 'Medical bone anomaly detection', 'Med3D', 15, 94.3, '2.8s', 'CT Scan', 'completed'),
    ('Debris Detection', 'Construction debris classification', 'VoxelNet', 56, 87.9, '3.5s', 'LiDAR', 'completed'),
    ('Warehouse Inventory', 'Package detection and counting', 'CenterPoint', 312, 93.0, '4.7s', 'RGB-D', 'completed')`);
  console.log('✅ Object Detection seeded');

  // Seed Scene Reconstruction (15 items)
  await pool.query(`INSERT INTO scene_reconstruction (name, description, reconstruction_type, source_images, mesh_quality, texture_quality, completeness_percent, status) VALUES
    ('Living Room', 'Full living room 3D reconstruction', 'Indoor', 120, 'High', 'High', 98.5, 'completed'),
    ('Street Corner', 'Urban street intersection capture', 'Outdoor', 250, 'High', 'Ultra', 95.2, 'completed'),
    ('Ancient Ruins', 'Archaeological site digital preservation', 'Heritage', 500, 'Ultra', 'Ultra', 92.8, 'completed'),
    ('Restaurant Interior', 'Restaurant virtual tour creation', 'Indoor', 85, 'Medium', 'High', 97.1, 'completed'),
    ('Garden Landscape', 'Residential garden reconstruction', 'Outdoor', 180, 'High', 'High', 94.6, 'completed'),
    ('Crime Scene', 'Forensic scene documentation', 'Indoor', 200, 'Ultra', 'Ultra', 99.2, 'completed'),
    ('Art Sculpture', 'Museum sculpture digitization', 'Object', 60, 'Ultra', 'Ultra', 99.8, 'completed'),
    ('Vehicle Damage', 'Insurance claim 3D documentation', 'Object', 45, 'High', 'High', 96.3, 'completed'),
    ('Construction Progress', 'Building site weekly capture', 'Outdoor', 350, 'Medium', 'Medium', 88.5, 'processing'),
    ('Cave Interior', 'Geological cave formation capture', 'Indoor', 300, 'High', 'Medium', 91.4, 'completed'),
    ('Storefront', 'Retail storefront 3D capture', 'Outdoor', 75, 'Medium', 'High', 97.8, 'completed'),
    ('Classroom', 'School classroom virtual model', 'Indoor', 90, 'Medium', 'Medium', 96.0, 'completed'),
    ('Bridge Structure', 'Bridge inspection reconstruction', 'Outdoor', 400, 'Ultra', 'High', 93.7, 'completed'),
    ('Dental Impression', 'Oral cavity 3D reconstruction', 'Medical', 30, 'Ultra', 'High', 98.9, 'completed'),
    ('Warehouse Layout', 'Logistics warehouse full capture', 'Indoor', 220, 'Medium', 'Medium', 94.1, 'completed')`);
  console.log('✅ Scene Reconstruction seeded');

  // Seed Materials (15 items)
  await pool.query(`INSERT INTO materials (name, description, material_type, shader_model, render_engine, pbr_workflow, transparency, status) VALUES
    ('Polished Chrome', 'Mirror-like chrome metal finish', 'Metal', 'PBR Metallic', 'Universal', 'Metallic', false, 'ready'),
    ('Frosted Glass', 'Semi-transparent frosted glass', 'Glass', 'PBR Specular', 'Universal', 'Specular', true, 'ready'),
    ('Worn Leather', 'Aged leather with scuff marks', 'Fabric', 'PBR Metallic', 'Universal', 'Metallic', false, 'ready'),
    ('Neon Glow', 'Emissive neon light material', 'Emissive', 'Unlit + Bloom', 'Universal', 'Metallic', false, 'ready'),
    ('Ocean Water', 'Realistic ocean surface shader', 'Liquid', 'Custom Water', 'Unreal Engine', 'Custom', true, 'ready'),
    ('Toon Shader', 'Cel-shaded cartoon material', 'Stylized', 'Custom Toon', 'Universal', 'Custom', false, 'ready'),
    ('Human Skin', 'Subsurface scattering skin shader', 'Organic', 'SSS', 'Universal', 'Metallic', false, 'ready'),
    ('Holographic Film', 'Iridescent holographic wrapping', 'Special', 'Custom Iridescent', 'Universal', 'Custom', true, 'ready'),
    ('Rusty Iron', 'Corroded iron with rust layers', 'Metal', 'PBR Metallic', 'Universal', 'Metallic', false, 'ready'),
    ('Crystal Gem', 'Refractive crystal with caustics', 'Gem', 'PBR Specular + Refraction', 'Unreal Engine', 'Specular', true, 'ready'),
    ('Concrete Wet', 'Rain-soaked concrete surface', 'Concrete', 'PBR Metallic', 'Universal', 'Metallic', false, 'ready'),
    ('Silk Fabric', 'Smooth silk with anisotropic sheen', 'Fabric', 'PBR Anisotropic', 'Universal', 'Metallic', false, 'ready'),
    ('Lava Rock', 'Volcanic rock with emissive cracks', 'Special', 'PBR + Emissive', 'Universal', 'Metallic', false, 'ready'),
    ('Car Paint', 'Multi-layer automotive paint', 'Metal', 'Clear Coat', 'Universal', 'Metallic', false, 'ready'),
    ('Ice Surface', 'Translucent ice with SSS', 'Special', 'SSS + Refraction', 'Universal', 'Specular', true, 'ready')`);
  console.log('✅ Materials seeded');

  // Seed Asset Library (15 items)
  await pool.query(`INSERT INTO asset_library (name, description, category, format, poly_count, file_size, license_type, tags, status) VALUES
    ('Office Chair', 'Ergonomic office swivel chair', 'Furniture', 'GLTF', 8500, '2.1 MB', 'Royalty Free', 'office,chair,furniture,interior', 'available'),
    ('Street Lamp', 'Modern LED street light pole', 'Urban', 'FBX', 3200, '1.4 MB', 'CC-BY', 'street,light,urban,outdoor', 'available'),
    ('Pine Tree', 'Realistic pine tree with LODs', 'Nature', 'FBX', 12000, '4.5 MB', 'Royalty Free', 'tree,pine,nature,forest', 'available'),
    ('Fire Hydrant', 'US-style red fire hydrant', 'Urban', 'OBJ', 4100, '1.8 MB', 'CC0', 'hydrant,urban,street,prop', 'available'),
    ('Laptop Computer', 'Open laptop with screen glow', 'Electronics', 'GLTF', 6800, '3.2 MB', 'Royalty Free', 'laptop,computer,tech,office', 'available'),
    ('Medieval Sword', 'Longsword with detailed hilt', 'Weapons', 'FBX', 5500, '2.4 MB', 'CC-BY', 'sword,medieval,weapon,fantasy', 'available'),
    ('Coffee Cup', 'Ceramic coffee mug with saucer', 'Props', 'GLTF', 2100, '0.8 MB', 'CC0', 'cup,coffee,kitchen,prop', 'available'),
    ('Sports Car Wheel', 'Alloy wheel with brake disc', 'Vehicle Parts', 'FBX', 9200, '3.8 MB', 'Royalty Free', 'wheel,car,vehicle,automotive', 'available'),
    ('Potted Plant', 'Monstera plant in ceramic pot', 'Nature', 'GLTF', 7400, '2.9 MB', 'CC-BY', 'plant,pot,interior,nature', 'available'),
    ('Security Camera', 'Wall-mounted CCTV camera', 'Electronics', 'OBJ', 3800, '1.6 MB', 'CC0', 'camera,security,tech,building', 'available'),
    ('Park Bench', 'Wooden park bench with iron legs', 'Furniture', 'FBX', 4500, '1.9 MB', 'CC-BY', 'bench,park,outdoor,furniture', 'available'),
    ('Traffic Cone', 'Orange traffic safety cone', 'Urban', 'GLTF', 1200, '0.5 MB', 'CC0', 'cone,traffic,safety,urban', 'available'),
    ('Kitchen Knife', 'Chef knife with wooden handle', 'Props', 'FBX', 3100, '1.3 MB', 'Royalty Free', 'knife,kitchen,chef,prop', 'available'),
    ('Drone UAV', 'Quadcopter drone with camera', 'Electronics', 'GLTF', 11000, '4.2 MB', 'CC-BY', 'drone,uav,quadcopter,tech', 'available'),
    ('Treasure Chest', 'Pirate treasure chest with lock', 'Props', 'FBX', 6200, '2.7 MB', 'Royalty Free', 'chest,treasure,pirate,fantasy', 'available')`);
  console.log('✅ Asset Library seeded');

  // Seed Holographic (15 items)
  await pool.query(`INSERT INTO holographic (name, description, hologram_type, display_tech, resolution, depth_layers, interactive, status) VALUES
    ('Product Showcase', '360° rotating product hologram', 'Volumetric', 'Light Field', '4K', 64, true, 'ready'),
    ('Medical Heart', 'Interactive beating heart hologram', 'Volumetric', 'Holographic Display', '4K', 128, true, 'ready'),
    ('City Skyline', 'Miniature city holographic display', 'Pepper Ghost', 'Pepper Ghost', '1080p', 1, false, 'ready'),
    ('AI Assistant Avatar', 'Animated holographic AI character', 'Volumetric', 'Light Field', '4K', 96, true, 'ready'),
    ('Molecular Structure', 'Interactive molecule viewer', 'Volumetric', 'Holographic Display', '4K', 64, true, 'ready'),
    ('Architectural Model', 'Building holographic preview', 'Volumetric', 'Light Field', '8K', 128, true, 'ready'),
    ('Historical Figure', 'Life-size historical person recreation', 'Pepper Ghost', 'Pepper Ghost', '4K', 1, false, 'ready'),
    ('Engine Cutaway', 'Exploded view engine hologram', 'Volumetric', 'Holographic Display', '4K', 96, true, 'ready'),
    ('Solar System', 'Interactive planetary hologram', 'Volumetric', 'Light Field', '4K', 64, true, 'ready'),
    ('Fashion Mannequin', 'Virtual try-on holographic display', 'Volumetric', 'Holographic Display', '8K', 128, true, 'ready'),
    ('Underwater Scene', 'Marine life holographic exhibit', 'Pepper Ghost', 'Pepper Ghost', '4K', 1, false, 'ready'),
    ('Holographic Map', 'Interactive 3D terrain map', 'Volumetric', 'Light Field', '4K', 96, true, 'ready'),
    ('Concert Performer', 'Full-size musician hologram', 'Pepper Ghost', 'Pepper Ghost', '8K', 1, false, 'ready'),
    ('DNA Helix', 'Rotating DNA strand visualization', 'Volumetric', 'Holographic Display', '4K', 64, true, 'ready'),
    ('Automotive Design', 'Car design review hologram', 'Volumetric', 'Light Field', '8K', 128, true, 'ready')`);
  console.log('✅ Holographic seeded');

  // Seed Spatial Audio (15 items)
  await pool.query(`INSERT INTO spatial_audio (name, description, audio_format, channels, sample_rate, spatialization, hrtf_enabled, duration_seconds, status) VALUES
    ('Forest Ambience', 'Immersive forest environment sounds', 'Ambisonics', 4, 48000, 'Ambisonics B-Format', true, 180.0, 'ready'),
    ('City Traffic', '3D urban traffic soundscape', 'Object-Based', 16, 48000, 'Object-Based Audio', true, 120.0, 'ready'),
    ('Concert Hall', 'Orchestral performance spatial mix', 'Ambisonics', 16, 96000, 'Higher Order Ambisonics', true, 300.0, 'ready'),
    ('Rain on Roof', '3D rain pattern on different surfaces', 'Ambisonics', 4, 48000, 'Ambisonics B-Format', true, 240.0, 'ready'),
    ('Space Station', 'Sci-fi space station ambient sounds', 'Object-Based', 8, 48000, 'Object-Based Audio', true, 200.0, 'ready'),
    ('Underwater World', 'Deep sea 3D audio environment', 'Ambisonics', 4, 96000, 'Ambisonics B-Format', true, 150.0, 'ready'),
    ('Haunted House', 'Spooky 3D positioned sound effects', 'Object-Based', 12, 48000, 'Object-Based Audio', true, 180.0, 'ready'),
    ('Battlefield', 'War zone spatial audio scene', 'Ambisonics', 16, 48000, 'Higher Order Ambisonics', true, 90.0, 'ready'),
    ('Jazz Club', 'Intimate jazz club spatial recording', 'Binaural', 2, 96000, 'Binaural HRTF', true, 240.0, 'ready'),
    ('Thunderstorm', '360° approaching thunderstorm', 'Ambisonics', 4, 48000, 'Ambisonics B-Format', true, 300.0, 'ready'),
    ('Factory Floor', 'Industrial machinery 3D audio', 'Object-Based', 8, 48000, 'Object-Based Audio', true, 120.0, 'ready'),
    ('Bird Sanctuary', 'Multi-species bird calls positioned', 'Ambisonics', 4, 96000, 'Ambisonics B-Format', true, 200.0, 'ready'),
    ('VR Game Audio', 'Interactive game sound engine preset', 'Object-Based', 32, 48000, 'HRTF + Room Modeling', true, 0.0, 'ready'),
    ('Meditation Bowl', '3D Tibetan singing bowl resonance', 'Binaural', 2, 96000, 'Binaural HRTF', true, 600.0, 'ready'),
    ('Stadium Crowd', 'Sports crowd 3D ambience', 'Ambisonics', 16, 48000, 'Higher Order Ambisonics', true, 180.0, 'ready')`);
  console.log('✅ Spatial Audio seeded');

  // Seed AI 3D Scene Generator (15 items)
  await pool.query(`INSERT INTO scene_generator (name, description, scene_type, generation_model, prompt_text, objects_count, lighting_type, render_engine, output_format, resolution, poly_budget, generation_time, quality_score, status) VALUES
    ('Cozy Coffee Shop', 'Warm interior coffee shop with rustic wood details', 'Interior', 'SceneDiffusion v3', 'A cozy coffee shop with wooden tables, hanging Edison bulbs, and a barista counter', 42, 'Golden Hour', 'Path Tracer', 'GLTF', '4K', 850000, '4m 32s', 94.5, 'completed'),
    ('Cyberpunk Alley', 'Neon-lit futuristic city alleyway at night', 'Sci-Fi', 'Text2Scene XL', 'A dark cyberpunk alley with neon signs, rain puddles, and holographic ads', 68, 'Neon/Cyberpunk', 'Real-Time RTX', 'USD', '4K', 1200000, '6m 18s', 96.2, 'completed'),
    ('Enchanted Forest', 'Magical forest clearing with bioluminescent plants', 'Fantasy', 'SceneDiffusion v3', 'A mystical forest glade with glowing mushrooms, fairy lights, and ancient trees', 95, 'Volumetric', 'Path Tracer', 'GLTF', '4K', 2500000, '8m 45s', 92.8, 'completed'),
    ('Modern Kitchen', 'Sleek contemporary kitchen with marble countertops', 'Interior', 'Text2Scene XL', 'A modern white kitchen with marble island, stainless steel appliances, and pendant lights', 38, 'Studio Three-Point', 'Hybrid Ray Trace', 'GLTF', '4K', 650000, '3m 52s', 97.1, 'completed'),
    ('Mars Habitat', 'Pressurized Mars colony living quarters', 'Sci-Fi', 'SceneDiffusion v3', 'Interior of a Mars habitat dome with hydroponic gardens, airlock doors, and red planet visible through windows', 55, 'Natural Daylight', 'Path Tracer', 'USD', '4K', 980000, '5m 24s', 93.6, 'completed'),
    ('Japanese Garden', 'Traditional zen garden with koi pond and bridge', 'Landscape', 'Gaussian Splat AI', 'A serene Japanese zen garden with raked sand, stone lanterns, koi pond, and red maple trees', 78, 'Golden Hour', 'Neural Radiance', 'Gaussian Splat', '4K', 1800000, '7m 10s', 95.4, 'completed'),
    ('Product Showcase Room', 'Clean studio for product visualization', 'Product Shot', 'Text2Scene XL', 'A minimal white studio with curved backdrop, soft box lighting, and reflective floor', 12, 'Studio Three-Point', 'Path Tracer', 'GLTF', '8K', 120000, '1m 48s', 98.7, 'completed'),
    ('Medieval Tavern', 'Rustic medieval inn with fireplace and dining tables', 'Fantasy', 'SceneDiffusion v3', 'A bustling medieval tavern with stone walls, roaring fireplace, ale barrels, and wooden chandeliers', 62, 'Dramatic Spotlight', 'Path Tracer', 'FBX', '4K', 1400000, '6m 35s', 91.3, 'completed'),
    ('Underwater Temple', 'Submerged ancient ruins with coral and fish', 'Fantasy', 'NeRF-Studio Pro', 'An ancient Greek temple submerged underwater with coral growth, schools of fish, and light rays filtering through', 88, 'Volumetric', 'Neural Radiance', 'NeRF', '4K', 2200000, '9m 12s', 90.5, 'completed'),
    ('Luxury Penthouse', 'High-rise modern penthouse at sunset', 'Architectural', 'Text2Scene XL', 'A luxury penthouse with floor-to-ceiling windows, city skyline view, designer furniture, and infinity pool on terrace', 45, 'Golden Hour', 'Path Tracer', 'USD', '8K', 920000, '5m 08s', 96.8, 'completed'),
    ('Space Station Bridge', 'Sci-fi command center with holographic displays', 'Sci-Fi', 'SceneDiffusion v3', 'A spaceship bridge with wraparound viewscreen, holographic star map, captain chair, and crew stations', 52, 'Neon/Cyberpunk', 'Real-Time RTX', 'GLTF', '4K', 780000, '4m 55s', 94.1, 'generating'),
    ('Abstract Data Viz', 'Abstract 3D data visualization landscape', 'Abstract', 'Point-E Enhanced', 'An abstract landscape of floating geometric shapes representing data flows, with particle connections and gradient colors', 200, 'HDRI Environment', 'Rasterization', 'GLTF', '2K', 450000, '2m 30s', 88.9, 'completed'),
    ('Tropical Beach Resort', 'Paradise beach with bungalows and palm trees', 'Landscape', 'Gaussian Splat AI', 'A tropical beach with overwater bungalows, crystal clear water, palm trees, and a setting sun', 72, 'Natural Daylight', 'Neural Radiance', 'Gaussian Splat', '4K', 1600000, '7m 42s', 95.0, 'completed'),
    ('Robot Workshop', 'Industrial robot repair bay with spare parts', 'Sci-Fi', 'SceneDiffusion v3', 'A cluttered robot repair workshop with half-assembled androids, tool racks, holographic schematics, and sparking welders', 85, 'Studio Three-Point', 'Hybrid Ray Trace', 'FBX', '4K', 1350000, '6m 20s', 93.2, 'refining'),
    ('Ancient Egyptian Tomb', 'Pharaoh burial chamber with hieroglyphics', 'Fantasy', 'NeRF-Studio Pro', 'An Egyptian pharaoh tomb with golden sarcophagus, wall hieroglyphics, treasure piles, and torch lighting', 58, 'Dramatic Spotlight', 'Path Tracer', 'USD', '4K', 1100000, '5m 50s', 94.7, 'completed')`);
  console.log('✅ AI 3D Scene Generator seeded');

  // Seed Digital Twins (15 items)
  await pool.query(`INSERT INTO digital_twins (name, description, twin_type, source_entity, sync_frequency, sensors_count, data_points, status) VALUES
    ('Smart Building HQ', 'Corporate HQ digital twin with HVAC monitoring', 'Building', 'Headquarters Building A', 'Real-time', 450, 2500000, 'active'),
    ('Wind Turbine Farm', 'Offshore wind farm performance twin', 'Infrastructure', 'North Sea Wind Farm', '5 seconds', 120, 8500000, 'active'),
    ('Manufacturing Line', 'Auto assembly line digital twin', 'Industrial', 'Plant 7 Assembly Line', 'Real-time', 280, 4200000, 'active'),
    ('Smart City Block', 'Urban infrastructure monitoring', 'Urban', 'Downtown Block 14', '30 seconds', 890, 15000000, 'active'),
    ('Aircraft Engine', 'Jet engine predictive maintenance twin', 'Mechanical', 'CFM LEAP-1B Engine', 'Real-time', 200, 6800000, 'active'),
    ('Hospital Ward', 'Patient monitoring and resource optimization', 'Healthcare', 'ICU Ward 3', 'Real-time', 150, 3200000, 'active'),
    ('Supply Chain', 'End-to-end logistics network twin', 'Logistics', 'Global Supply Network', '1 minute', 1200, 25000000, 'active'),
    ('Power Grid', 'Regional power distribution twin', 'Infrastructure', 'Northeast Grid Sector 5', 'Real-time', 560, 9800000, 'active'),
    ('Retail Store', 'Smart retail analytics twin', 'Commercial', 'Flagship Store NYC', '10 seconds', 85, 1500000, 'active'),
    ('Water Treatment', 'Water treatment plant monitoring', 'Industrial', 'Central Water Plant', 'Real-time', 180, 3800000, 'active'),
    ('Smart Farm', 'Precision agriculture digital twin', 'Agriculture', '500-Acre Farm Plot', '5 minutes', 340, 7200000, 'active'),
    ('Data Center', 'Server room thermal and power twin', 'IT Infrastructure', 'DC East Region 2', 'Real-time', 420, 5500000, 'active'),
    ('Bridge Monitor', 'Structural health monitoring twin', 'Infrastructure', 'Bay Bridge Span 3', '1 second', 95, 2100000, 'active'),
    ('EV Fleet', 'Electric vehicle fleet management', 'Transportation', '200 Vehicle Fleet', '30 seconds', 600, 11000000, 'active'),
    ('Stadium Operations', 'Live event venue operations twin', 'Commercial', 'National Arena', '5 seconds', 320, 4800000, 'maintenance')`);
  console.log('✅ Digital Twins seeded');

  console.log('\n🎉 All data seeded successfully!');
  await pool.end();
  process.exit(0);
}

seed().catch(err => {
  console.error('❌ Seed error:', err);
  process.exit(1);
});
