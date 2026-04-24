const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'asset_library', ['name', 'description', 'category', 'format', 'poly_count', 'file_size', 'license_type', 'tags', 'status']);
