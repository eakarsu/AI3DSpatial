const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'digital_twins', ['name', 'description', 'twin_type', 'source_entity', 'sync_frequency', 'sensors_count', 'data_points', 'status']);
