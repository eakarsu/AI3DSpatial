const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'animations', ['name', 'description', 'animation_type', 'duration_seconds', 'frame_rate', 'keyframes', 'loop_enabled', 'status']);
