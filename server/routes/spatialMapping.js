const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'spatial_mapping', ['name', 'description', 'area_sqm', 'resolution', 'mapping_type', 'sensor_type', 'accuracy', 'status']);
