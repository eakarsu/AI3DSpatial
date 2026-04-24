const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'mesh_optimization', ['name', 'description', 'original_polygons', 'optimized_polygons', 'reduction_percent', 'quality_score', 'algorithm', 'status']);
