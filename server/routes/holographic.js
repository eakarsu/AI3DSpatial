const createCrudRouter = require('./crudFactory');
module.exports = (pool) => createCrudRouter(pool, 'holographic', ['name', 'description', 'hologram_type', 'display_tech', 'resolution', 'depth_layers', 'interactive', 'status']);
