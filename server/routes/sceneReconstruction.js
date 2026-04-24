const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'scene_reconstruction', ['name', 'description', 'reconstruction_type', 'source_images', 'mesh_quality', 'texture_quality', 'completeness_percent', 'status']);
