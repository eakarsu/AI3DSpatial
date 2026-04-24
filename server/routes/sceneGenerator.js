const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'scene_generator', ['name', 'description', 'scene_type', 'generation_model', 'prompt_text', 'objects_count', 'lighting_type', 'render_engine', 'output_format', 'resolution', 'poly_budget', 'generation_time', 'quality_score', 'status']);
