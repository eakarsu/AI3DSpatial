const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'models3d', ['name', 'description', 'format', 'vertices', 'polygons', 'file_size', 'status', 'thumbnail']);
