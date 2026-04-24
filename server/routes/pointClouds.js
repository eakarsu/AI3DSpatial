const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'point_clouds', ['name', 'description', 'point_count', 'density', 'source_type', 'coordinate_system', 'file_size', 'status']);
