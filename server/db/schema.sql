-- Users table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3D Models
CREATE TABLE IF NOT EXISTS models3d (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    format VARCHAR(50),
    vertices INTEGER,
    polygons INTEGER,
    file_size VARCHAR(50),
    status VARCHAR(50) DEFAULT 'ready',
    thumbnail VARCHAR(500),
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AR Scenes
CREATE TABLE IF NOT EXISTS ar_scenes (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scene_type VARCHAR(100),
    target_platform VARCHAR(100),
    tracking_type VARCHAR(100),
    objects_count INTEGER,
    status VARCHAR(50) DEFAULT 'draft',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- VR Environments
CREATE TABLE IF NOT EXISTS vr_environments (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    environment_type VARCHAR(100),
    platform VARCHAR(100),
    resolution VARCHAR(50),
    fps_target INTEGER,
    interactive_elements INTEGER,
    status VARCHAR(50) DEFAULT 'draft',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Textures
CREATE TABLE IF NOT EXISTS textures (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    texture_type VARCHAR(100),
    resolution VARCHAR(50),
    format VARCHAR(50),
    seamless BOOLEAN DEFAULT false,
    pbr_enabled BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'ready',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3D Animations
CREATE TABLE IF NOT EXISTS animations (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    animation_type VARCHAR(100),
    duration_seconds FLOAT,
    frame_rate INTEGER,
    keyframes INTEGER,
    loop_enabled BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'ready',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Point Clouds
CREATE TABLE IF NOT EXISTS point_clouds (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    point_count BIGINT,
    density VARCHAR(50),
    source_type VARCHAR(100),
    coordinate_system VARCHAR(100),
    file_size VARCHAR(50),
    status VARCHAR(50) DEFAULT 'processed',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Mesh Optimization
CREATE TABLE IF NOT EXISTS mesh_optimization (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    original_polygons INTEGER,
    optimized_polygons INTEGER,
    reduction_percent FLOAT,
    quality_score FLOAT,
    algorithm VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Mapping
CREATE TABLE IF NOT EXISTS spatial_mapping (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    area_sqm FLOAT,
    resolution VARCHAR(50),
    mapping_type VARCHAR(100),
    sensor_type VARCHAR(100),
    accuracy VARCHAR(50),
    status VARCHAR(50) DEFAULT 'mapped',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Object Detection 3D
CREATE TABLE IF NOT EXISTS object_detection (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    detection_model VARCHAR(100),
    objects_detected INTEGER,
    confidence_avg FLOAT,
    processing_time VARCHAR(50),
    input_type VARCHAR(100),
    status VARCHAR(50) DEFAULT 'completed',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Scene Reconstruction
CREATE TABLE IF NOT EXISTS scene_reconstruction (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    reconstruction_type VARCHAR(100),
    source_images INTEGER,
    mesh_quality VARCHAR(50),
    texture_quality VARCHAR(50),
    completeness_percent FLOAT,
    status VARCHAR(50) DEFAULT 'completed',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Materials / Shaders
CREATE TABLE IF NOT EXISTS materials (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    material_type VARCHAR(100),
    shader_model VARCHAR(100),
    render_engine VARCHAR(100),
    pbr_workflow VARCHAR(50),
    transparency BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'ready',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 3D Asset Library
CREATE TABLE IF NOT EXISTS asset_library (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    category VARCHAR(100),
    format VARCHAR(50),
    poly_count INTEGER,
    file_size VARCHAR(50),
    license_type VARCHAR(100),
    tags TEXT,
    status VARCHAR(50) DEFAULT 'available',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Holographic Content
CREATE TABLE IF NOT EXISTS holographic (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    hologram_type VARCHAR(100),
    display_tech VARCHAR(100),
    resolution VARCHAR(50),
    depth_layers INTEGER,
    interactive BOOLEAN DEFAULT false,
    status VARCHAR(50) DEFAULT 'ready',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Spatial Audio
CREATE TABLE IF NOT EXISTS spatial_audio (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    audio_format VARCHAR(100),
    channels INTEGER,
    sample_rate INTEGER,
    spatialization VARCHAR(100),
    hrtf_enabled BOOLEAN DEFAULT false,
    duration_seconds FLOAT,
    status VARCHAR(50) DEFAULT 'ready',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI 3D Scene Generator
CREATE TABLE IF NOT EXISTS scene_generator (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    scene_type VARCHAR(100),
    generation_model VARCHAR(100),
    prompt_text TEXT,
    objects_count INTEGER,
    lighting_type VARCHAR(100),
    render_engine VARCHAR(100),
    output_format VARCHAR(50),
    resolution VARCHAR(50),
    poly_budget INTEGER,
    generation_time VARCHAR(50),
    quality_score FLOAT,
    status VARCHAR(50) DEFAULT 'generating',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Digital Twins
CREATE TABLE IF NOT EXISTS digital_twins (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    twin_type VARCHAR(100),
    source_entity VARCHAR(255),
    sync_frequency VARCHAR(50),
    sensors_count INTEGER,
    data_points BIGINT,
    status VARCHAR(50) DEFAULT 'active',
    ai_generated BOOLEAN DEFAULT false,
    ai_prompt TEXT,
    ai_response TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- AI Results — central audit log for all AI calls
CREATE TABLE IF NOT EXISTS ai_results (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    feature VARCHAR(100) NOT NULL,
    endpoint VARCHAR(200) NOT NULL,
    prompt TEXT NOT NULL,
    ai_response TEXT,
    parsed_json JSONB,
    model VARCHAR(100),
    prompt_tokens INTEGER,
    completion_tokens INTEGER,
    total_tokens INTEGER,
    source_table VARCHAR(100),
    source_id INTEGER,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Asset Links — cross-feature relational linking
CREATE TABLE IF NOT EXISTS asset_links (
    id SERIAL PRIMARY KEY,
    source_type VARCHAR(100) NOT NULL,
    source_id INTEGER NOT NULL,
    target_type VARCHAR(100) NOT NULL,
    target_id INTEGER NOT NULL,
    relationship VARCHAR(100) DEFAULT 'uses',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(source_type, source_id, target_type, target_id)
);
