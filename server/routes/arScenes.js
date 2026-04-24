const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'ar_scenes', ['name', 'description', 'scene_type', 'target_platform', 'tracking_type', 'objects_count', 'status']);
