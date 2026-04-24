const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'textures', ['name', 'description', 'texture_type', 'resolution', 'format', 'seamless', 'pbr_enabled', 'status']);
